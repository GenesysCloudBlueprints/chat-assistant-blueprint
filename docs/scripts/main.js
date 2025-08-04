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
                // Ignore messages without text (e.g. Presence/Disconnect Event)
                if(messageDetail.textBody == null) {
                    return;
                }
                messageIds.push(messageId);

                agentAssistant.clearStackedText();    
                agentAssistant.getRecommendations(messageDetail.textBody, currentConversationId, communicationId);
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

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');

const redirectUri = (new URL (window.location.href)).hostname == 'localhost' ?
                config.testUri : config.prodUri;

client.setEnvironment(config.genesysCloud.region);
client.loginImplicitGrant(
    config.clientID,
    redirectUri,
    { state: currentConversationId })
.then(data => {
    console.log(data);

    // Assign conversation id
    currentConversationId = data.state;
    
    // Get Details of current User
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;

    // Get current conversation
    return conversationsApi.getConversation(currentConversationId);
}).then((conv) => { 
    currentConversation = conv;

    return setupChatChannel();
}).then(data => {
    console.log('Finished Setup');

// Error Handling
}).catch(e => console.log(e));
