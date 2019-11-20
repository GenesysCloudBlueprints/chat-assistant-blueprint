/**
 * This code handles the Agent Assistant functionality in the client web app
 */
import assistService from './agent-assistant-service/script.js';

const platformClient = require('platformClient');
const conversationsApi = new platformClient.ConversationsApi();

function showRecommendations(suggArr){
    console.log(suggArr);
}

export default {
    getRecommendations(text){
        let recommendations = assistService.analyzeText(text);
        
        showRecommendations(recommendations);
    },

    sendMessage(message, conversationId, communicationId){
        conversationsApi.postConversationsChatCommunicationMessages(
            conversationId, communicationId,
            {
                "body": message,
                "bodyType": "standard"
            }
        )
    }
}