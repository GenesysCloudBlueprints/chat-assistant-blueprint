import view from './view.js';
import agentAssistant from './agent-assistant.js';
import controller from './notifications-controller.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();

let userId = '';
let activeConversations = [];

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
            console.log(activeConversations);
            let name = activeConversations.find(c => c.id == convId)
                        .participants.find(p => p.chats[0].id == senderId)
                        .name;

            view.addChatMessage(name, message, convId);

            break;
    }
};

function registerConversation(conversationId){
    return conversationsApi.getConversation(conversationId)
    .then((data) => activeConversations.push(data));
}

/**
 * Get current active chat conversations, subscribe the conversations to the 
 * notifications and display each name on the tab menu
 * @returns {Promise} 
 */
function processActiveChats(){
    return conversationsApi.getConversationsChats()
    .then((data) => {
        let promiseArr = []

        data.entities.forEach((conv) => {
            promiseArr.push(registerConversation(conv.id));
            subscribeChatConversation(conv.id);
        });

        view.populateActiveChatList(data.entities, showChatTranscript);

        return Promise.all(promiseArr);
    })
}

/**
 * Show the chat messages for a conversation
 * @param {String} conversationId 
 * @returns {Promise} 
 */
function showChatTranscript(conversationId){
    let conversation = activeConversations.find(c => c.id == conversationId);

    return conversationsApi.getConversationsChatMessages(conversationId)
    .then((data) => {
        view.displayTranscript(data.entities, conversation);
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
                let conversation = data.eventBody;
                let participants = conversation.participants;
                let conversationId = conversation.id;
                let agentParticipant = participants.find(
                    p => p.purpose == 'agent');
                
                // Value to determine if conversation is already taken into account before
                let isExisting = activeConversations.map((conv) => conv.id)
                                    .indexOf(conversationId) != -1;

                // Once agent is ocnnected subscribe to the conversation's messages 
                if(agentParticipant.state == 'connected' && !isExisting){
                    // Add conversationid to existing conversations array
                    return registerConversation(conversation.id)
                    .then(() => {
                        // Add conversation to tab
                        let participant = data.eventBody.participants.filter(
                            participant => participant.purpose === "customer")[0];
                        view.addCustomerList(participant.name, data.eventBody.id, showChatTranscript);

                        return subscribeChatConversation(conversationId);
                    })
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

    // Create the channel for chat notifications
    return setupChatChannel();
}).then(data => { 
    
    // Get current chat conversations
    return processActiveChats();
}).then(data => {
    console.log('Finished Setup');

// Error Handling
}).catch(e => console.log(e));
