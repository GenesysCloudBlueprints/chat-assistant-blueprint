/**
 * This script is focused on the HTML / displaying of data to the page
 */

const activeChatSelect = document.getElementById('chat-dropdown');

export default {
    /**
     * Show the active chat conversations to the page
     * @param {Array} chatsArr array of chat conversations
     * @param {Function} onTabClick function when a tab is clicked
     */
    populateActiveChatList(chatsArr, onTabClick){
        // Loop through chat conversations 
        chatsArr.forEach((chat) => {
            let conversationId = chat.id;
            let participant = chat.participants.filter(
                    participant => participant.purpose === "customer")[0];
            let name = participant.name;
    
            // Show the list as options in the tab
            this.addCustomerList(name, conversationId, onTabClick);
        });
    },

    /**
     * Show the entire transcript of a chat conversation
     * @param {Array} messagesArr array of chat PureCloud chat messages 
     */
    displayTranscript(messagesArr){
        this.clearActiveChat();
        
        // Show each message
        messagesArr.forEach((msg) => {
            if(msg.hasOwnProperty("body")) {
                let message = msg.body;

                // TODO:
                this.addChatMessage(null, message);
            }
        });
    },

    /**
     * Clears all the chat mesages from the page
     */
    clearActiveChat(){
        const tabContents = document.getElementById("tabcontents");
        while (tabContents.firstChild) {
            tabContents.removeChild(tabContents.firstChild);
        }
    },

    /**
     * Add a new chat message to the page.
     * @param {String} sender sender name to be displayed
     * @param {String} message chat message to be displayed
     */
    addChatMessage(sender, message){
        var chatMsg = document.createElement("p");
        chatMsg.textContent = message;

        var container = document.createElement("div");
        container.appendChild(chatMsg);
        container.className = "chat-message";

        document.getElementById("tabcontents").appendChild(container);
    },

    /**
     * Add a new entry(tab) to the customers list
     * @param {String} name Name of the chat customer
     * @param {String} conversationId Purecloud converstaionId
     * @param {Function} onClickFunc Function for when the tab is clicked
     */
    addCustomerList(name, conversationId, onClickFunc){
        var elementExists = document.getElementById(conversationId);
    
        if (elementExists === null) {
            var link = document.createElement("a");
            link.innerHTML = name;
    
            var custSpan = document.createElement("span");
            custSpan.appendChild(link);
    
            var list = document.createElement("li");
            list.appendChild(custSpan);
            list.className = "customer-link";
            list.id = conversationId;

            // Call the callback function for clicking the tab
            list.addEventListener('click', function(event){
                onClickFunc(conversationId);
            });

            // Make the tab active
            list.addEventListener('click', function(event){
                var i, tabcontent, tablinks;
                tabcontent = document.getElementsByClassName("tabcontent");

                for (i = 0; i < tabcontent.length; i++) {
                    tabcontent[i].style.display = "none";
                }

                tablinks = document.getElementsByClassName("customer-link");

                for (i = 0; i < tablinks.length; i++) {
                    tablinks[i].className = tablinks[i].className.replace(" active is-active", "");
                }

                document.getElementById(conversationId).style.display = "block";

                event.currentTarget.className += " active is-active";
            })
            document.getElementById("customersList").appendChild(list);
        }    
    }
}