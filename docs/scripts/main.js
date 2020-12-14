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
let agentID;
let currentConversation = null;
let currentConversationId = '';

/**
 * Callback function for 'message' and 'typing-indicator' events.
 * For this sample, it will merely display the chat message into the page.
 * 
 * @param {Object} data the event data  
 */
let onMessage = (data) => {
    switch(data.metadata.type){
        case 'typing-indicator':
            break;
        case 'message':
            // Values from the event
            let eventBody = data.eventBody;
            let message = eventBody.body;
            let convId = eventBody.conversation.id;
            let senderId = eventBody.sender.id;

            // Conversation values for cross reference
            let conversation = currentConversation;
            let participant = conversation.participants.find(p => p.chats[0].id == senderId);
            let purpose = participant.purpose;

            // Get agent communication ID
            if(purpose == 'agent') {
                agentID = senderId;
                agentAssistant.clearStackedText();
            } else {
                let agent = conversation.participants.find(p => p.purpose == 'agent');
                agentID = agent.chats[0].id;
            }

            // Get some recommended replies
            if(purpose == 'customer') agentAssistant.getRecommendations(message, convId, agentID);

            break;
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
            `v2.users.${userId}.conversations.chats`,
            subscribeChatConversation(currentConversationId));
    });
}

/**
 * Subscribes the conversation to the notifications channel
 * @param {String} conversationId 
 * @returns {Promise}
 */
function subscribeChatConversation(conversationId){
    return controller.addSubscription(
            `v2.conversations.chats.${conversationId}.messages`,
            onMessage);
}

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');

const redirectUri = (new URL (window.location.href)).hostname == 'localhost' ?
                config.testUri : config.prodUri;

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
