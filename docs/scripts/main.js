import view from './view.js';
import controller from './notifications-controller.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();

let userId = '';
let activeChats = [];

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
            let message = data.eventBody.body;
            let convId = data.eventBody.conversation.id;
            let senderId = data.eventBody.sender.id;

            console.log(message);
            break;
    }
};


/**
 * Get current active chat conversations
 * @returns {Promise} array of the active chat conversations
 */
function getActiveChats(){
    return new Promise((resolve, reject) => {
        conversationsApi.getConversationsChats()
        .then((data) => {
            resolve(data.entities);
        }).catch(e => reject(e));
    });
}

/**
 * Returns the chat messages for a conversation
 * @param {String} conversationId 
 * @returns {Promise} Array of chat messages up to 100
 */
function getChatTranscript(conversationId){
    return new Promise((resolve, reject) => {
        conversationsApi.conversationsApi(conversationId)
        .then((data) => {
            resolve(data.entities);
        });
    });
}

/**
 * Set-up the channel for chat conversations
 */
function setupChatChannel(){
    return controller.createChannel()
    .then(data => {

        // Subscribe to incoming chat conversations
        return controller.addSubscription(
            `v2.users.${userId}.conversations.chats`,

            // Called when a chat conversation event fires (connected to agent, etc.)
            (data) => {
                let participants = data.eventBody.participants;
                let agentParticipant = participants.find(
                    p => p.purpose == 'agent');
                
                // Once agent is ocnnected subscribe to the conversation's messages 
                if(agentParticipant.state == 'connected'){
                    return subscribeChatConversation(data.eventBody.id);
                }
            });
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
client.loginImplicitGrant(
    'e7de8a75-62bb-43eb-9063-38509f8c21af',
    window.location.href)
.then(data => {
    console.log(data);
    
    // Get Details of current User
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;

    // Get current chat conversations
    return getActiveChats();
}).then(data => {
    activeChats = data;

    // Create the channel for chat notifications
    return setupChatChannel();
}).then(data => { 
    console.log('Setup channel');

// Error Handling
}).catch(e => console.log(e));

