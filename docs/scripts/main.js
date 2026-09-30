import agentAssistant from './agent-assistant.js';
import controller from './notifications-controller.js';
import config from './config.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();

let userId = '';
let currentConversation = null;
let currentConversationId = '';
let messageIds = [];

/**
 * Callback function for 'message' and 'typing-indicator' events.
 * For this sample, it will merely display the chat message into the page.
 * 
 * @param {Object} data the event data  
 */
let onMessage = (data) => {
    console.log(data);

    let messageId = '';
    let purpose = '';

    var messages = [];
    var participantPurposes = [];
    var publish = false;
    var mostRecentMessageTime = '';

    let agentsArr = currentConversation.participants.filter(p => p.purpose === 'agent');
    let agent = agentsArr[agentsArr.length - 1];
    let communicationId = agent.messages[0].id;

    // Discard unwanted notifications
    if(data.topicName.toLowerCase() === 'channel.metadata') {
        // Heartbeat
        // console.info('Ignoring metadata: ', notification);
        return;
    } else if(data.eventBody.id !== currentConversationId) {
        // Conversation event not related to the current conversationId (in this frame)
        // Ignore
        return;
    } else if(data.eventBody.participants.find(p => p.purpose === 'customer').endTime) {
        console.log('ending conversation');
    } else {
        data.eventBody.participants.forEach(participant => {
            if(!participant.endTime && Array.isArray(participant.messages[0].messages)) {
                messages.push(participant.messages[0].messages[participant.messages[0].messages.length - 1]);
                participantPurposes.push(participant.purpose);
            }
        });

        for(let x = 0; x < messages.length; x++) {
            console.log('messageTime: ' + messages[x].messageTime);
            if(messages[x].messageTime > mostRecentMessageTime) {
                mostRecentMessageTime = messages[x].messageTime;
                messageId = messages[x].messageId;
                purpose = participantPurposes[x];
                publish = true;
            }
        }

        if(publish && !messageIds.includes(messageId)) { // Make sure message is published only once
            conversationsApi.getConversationsMessageMessage(data.eventBody.id, messageId)
            .then((messageDetail => {
                let messageText = messageDetail.normalizedMessage.text
                // Ignore messages without text (e.g. Presence/Disconnect Event)
                if(messageText == null) {
                    return;
                }
                messageIds.push(messageId);

                agentAssistant.clearStackedText();    
                agentAssistant.getRecommendations(messageText, currentConversationId, communicationId);
            }));
        }
    }    
};

/**
 * Set-up the channel for chat conversations
 */
function setupChatChannel(){
    return controller.createChannel()
    .then(data => {
        // Subscribe to incoming chat conversations
        return controller.addSubscription(
            `v2.users.${userId}.conversations`,
            onMessage);
    });
}

/**
 * Continue app setup once we have a valid access token on the client.
 */
function startApp() {
    // Get Details of current User
    return usersApi.getUsersMe()
    .then(userMe => {
        userId = userMe.id;

        // Get current conversation
        return conversationsApi.getConversation(currentConversationId);
    }).then((conv) => {
        currentConversation = conv;
        console.log(currentConversation);

        return setupChatChannel();
    }).then(() => {
        console.log('Finished Setup');
    }).catch(e => console.log(e));
}

/**
 * Begin pop-out authentication using the Authorization Code grant with PKCE.
 *
 * The Genesys Cloud login web application can no longer be embedded in an
 * iframe, so instead of redirecting this (iframed) widget to the login page we
 * open the login in a separate top-level popup window. The popup lands on
 * oauth/callback.html, which posts the authorization code back here. We then
 * complete the PKCE token exchange in this window - no client secret required.
 *
 * See: Deprecation - embedding the Genesys Cloud login web application within
 * an iframe.
 */
function loginWithPopup() {
    // Generate and stash the PKCE code verifier for this login attempt. It never
    // leaves the browser; only the derived code_challenge goes to the login page.
    const codeVerifier = client.generatePKCECodeVerifier(128);
    sessionStorage.setItem('genesys_cloud_sdk_pkce_code_verifier', codeVerifier);

    return client.computePKCECodeChallenge(codeVerifier).then(codeChallenge => {
        const authorizeUrl = `https://login.${config.genesysCloud.region}/oauth/authorize` +
            `?response_type=code` +
            `&client_id=${config.clientID}` +
            `&code_challenge=${encodeURIComponent(codeChallenge)}` +
            `&code_challenge_method=S256` +
            `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
            `&state=${encodeURIComponent(currentConversationId || '')}`;

        // Open the login in a real top-level window (pop-out), not this iframe.
        const popup = window.open(authorizeUrl, 'gcLogin', 'width=500,height=700');
        if (!popup) {
            console.error('Login popup was blocked. Ask the user to allow popups for this site.');
        }
    });
}

/**
 * Handle the authorization code posted back from the pop-out callback page,
 * exchange it for an access token via PKCE, then start the app.
 */
function onAuthMessage(event) {
    // Only trust messages from our own origin (the callback page is same-origin).
    if (event.origin !== window.location.origin) return;

    const data = event.data;
    if (!data || data.source !== 'genesys-oauth-callback') return;

    if (data.error) {
        console.error(`OAuth error: ${data.error} - ${data.errorDescription || ''}`);
        return;
    }
    if (!data.code) return;

    const codeVerifier = sessionStorage.getItem('genesys_cloud_sdk_pkce_code_verifier');

    client.authorizePKCEGrant(config.clientID, codeVerifier, data.code, config.redirectUri)
    .then(() => {
        sessionStorage.removeItem('genesys_cloud_sdk_pkce_code_verifier');
        return startApp();
    })
    .catch(e => console.error('PKCE token exchange failed:', e));
}

/**
 * Wire up the Genesys Cloud Client Apps SDK lifecycle.
 *
 * The Interaction Widget host fires a `bootstrap` event after the app's iframe
 * loads and then waits for the app to acknowledge with `bootstrapped()`. If the
 * app never responds, the host logs "Lenient bootstrapping after
 * bootstrapTimeout" and later reports "App failed to stop" on teardown because
 * the lifecycle handshake was never completed. We complete both handshakes here.
 *
 * The widget must opt into these hooks in its Advanced Configuration
 * (`lifecycle.hooks.bootstrap` and `lifecycle.hooks.stop` set to true) for the
 * listeners below to fire.
 */
function setupClientAppLifecycle() {
    // The Client Apps SDK UMD bundle exposes purecloud.apps.ClientApp globally.
    const ClientApp = window.purecloud && window.purecloud.apps && window.purecloud.apps.ClientApp;
    if (!ClientApp) {
        console.warn('Client Apps SDK not loaded; skipping lifecycle handshake.');
        return;
    }

    // Prefer seeding the environment from the host query params (recommended),
    // falling back to the configured region.
    let clientApp;
    try {
        clientApp = new ClientApp({
            gcHostOriginQueryParam: 'gcHostOrigin',
            gcTargetEnvQueryParam: 'gcTargetEnv',
        });
    } catch (e) {
        clientApp = new ClientApp({ pcEnvironment: config.genesysCloud.region });
    }

    // Acknowledge bootstrap so the host does not time out.
    clientApp.lifecycle.addBootstrapListener(() => {
        clientApp.lifecycle.bootstrapped();
    });

    // On stop, tear down the notifications websocket, then acknowledge.
    clientApp.lifecycle.addStopListener(() => {
        controller.closeChannel();
        clientApp.lifecycle.stopped();
    });
}

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');

client.setEnvironment(config.genesysCloud.region);

// Complete the Client Apps lifecycle handshake with the Interaction Widget host.
setupClientAppLifecycle();

// Listen for the authorization code handed back by the pop-out callback window.
window.addEventListener('message', onAuthMessage);

// Kick off pop-out authentication. Once a token is obtained via postMessage,
// onAuthMessage completes the exchange and starts the app.
loginWithPopup();
