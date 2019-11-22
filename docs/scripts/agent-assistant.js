/**
 * This code handles the Agent Assistant functionality in the client web app
 */
import assistService from './agent-assistant-service/script.js';

const platformClient = require('platformClient');
const conversationsApi = new platformClient.ConversationsApi();

// Messages of the client that are sent in a straight series.
let stackedText = ''; 

function showRecommendations(suggArr, conversationId, communicationId){    
    // Clears all the recommended mesages from the page
    clearRecommendations();

    // Display recommended replies in HTML
    for (var i = 0; i < suggArr.length; i++) {
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
    conversationsApi.postConversationsChatCommunicationMessages(
        conversationId, communicationId,
        {
            "body": message,
            "bodyType": "standard"
        }
    )
}

function clearRecommendations(){
    const suggContents = document.getElementById("agent-assist");
    while (suggContents.firstChild) {
        suggContents.removeChild(suggContents.firstChild);
    }
}

export default {
    getRecommendations(text, conversationId, communicationId){
        stackedText += text;
        console.log(stackedText);
        // Unoptimized because it's reanalyzing a growing amount of text as long as
        // customer is uninterrupted. But good enough for the sample.
        let recommendations = assistService.analyzeText(stackedText);
        console.log(recommendations);
        showRecommendations(recommendations, conversationId, communicationId);
    },

    clearRecommendations(){
        clearRecommendations();
    },

    clearStackedText(){
        stackedText = '';
    }
}