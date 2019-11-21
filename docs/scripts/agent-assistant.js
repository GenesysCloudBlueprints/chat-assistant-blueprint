/**
 * This code handles the Agent Assistant functionality in the client web app
 */
import assistService from './agent-assistant-service/script.js';

const platformClient = require('platformClient');
const conversationsApi = new platformClient.ConversationsApi();

let suggested;

function showRecommendations(suggArr, conversationId, communicationId){
    console.log(suggArr);
    suggested = suggArr;

    // Clears all the recommended mesages from the page
    const suggContents = document.getElementById("agent-assist");
    while (suggContents.firstChild) {
        suggContents.removeChild(suggContents.firstChild);
    }

    // Display recommended replies in HTML
    for (var i = 0; i < suggArr.length; i++) {
        suggested = suggArr[i];
        var suggest = document.createElement("a");
        suggest.innerHTML = suggArr[i];
        suggest.addEventListener('click', function(event) {
            sendMessage(this.innerText, conversationId, communicationId);
        });

        var suggestContainer = document.createElement("div");
        suggestContainer.appendChild(suggest);
        suggestContainer.className = "suggest-container";
        document.getElementById("agent-assist").appendChild(suggestContainer);
    }    
}

function sendMessage(message, conversationId, communicationId){
    console.log("sendMessage message: " + message);
    console.log("sendMessage conversationId: " + conversationId);
    console.log("sendMessage communicationId: " + communicationId);
    conversationsApi.postConversationsChatCommunicationMessages(
        conversationId, communicationId,
        {
            "body": message,
            "bodyType": "standard"
        }
    )
}

export default {
    getRecommendations(text, conversationId, communicationId){
        let recommendations = assistService.analyzeText(text);
        
        showRecommendations(recommendations, conversationId, communicationId);
    }
}