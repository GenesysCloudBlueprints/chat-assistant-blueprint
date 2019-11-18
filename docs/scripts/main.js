import view from './view.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

const usersApi = new platformClient.UsersApi();
const notificationsApi = new platformClient.NotificationsApi();
const analyticsApi = new platformClient.AnalyticsApi();
const conversationsApi = new platformClient.ConversationsApi();
const routingApi = new platformClient.RoutingApi();

let userId = '';
let activeChats = [];

client.loginImplicitGrant(
    'e7de8a75-62bb-43eb-9063-38509f8c21af',
    window.location.href)
.then(data => {
    console.log(data);
    
    // Get Details of current User and save to Client App
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;

    return conversationsApi.getConversationsChats();
}).then(data => {
    activeChats = data.entities;

    // Update dropdown list
    
// Error Handling
}).catch(e => console.log(e));

//     // Create a Notifications Channel
//     return notificationsApi.postNotificationsChannels();
// }).then(data => {
//     clientApp.websocketUri = data.connectUri;
//     clientApp.channelID = data.id;
//     clientApp.socket = new WebSocket(clientApp.websocketUri);
//     clientApp.socket.onmessage = clientApp.onSocketMessage;
//     clientApp.topicIdAgent = "v2.users." + clientApp.userId + ".conversations.calls";

//     // Subscribe to Call Conversations of Current user.
//     let topic = [{"id": clientApp.topicIdAgent}];
//     return notificationsApi.postNotificationsChannelSubscriptions(clientApp.channelID, topic);

// // Error Handling
// }).catch(e => console.log(e));