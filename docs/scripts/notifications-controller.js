/**
 * This file manages the channel that listens to chat events.
 */
const platformClient = require('platformClient');
const notificationsApi = new platformClient.NotificationsApi();

let channel = {};
let ws = null;

// Object that will contain the subscription topic as key and the
// callback function as the value
let subscriptionMap = {
    'channel.metadata': () => {
        console.log('Notification heartbeat.');
    }
};

/**
 * Callback function for notications event-handling.
 * It will reference the subscriptionMap to determine what function to run
 * @param {Object} event 
 */
function onSocketMessage(event){
    let data = JSON.parse(event.data);

    subscriptionMap[data.topicName](data);
}

export default {
    /**
     * Creation of the channel. If called multiple times,
     * the last one will be the active one.
     */
    createChannel(){
        return notificationsApi.postNotificationsChannels()
        .then(data => {
            console.log('---- Created Notifications Channel ----');
            console.log(data);

            channel = data;
            ws = new WebSocket(channel.connectUri);
            ws.onmessage = onSocketMessage;
        });
    },

    /**
     * Add a subscription to the channel
     * @param {String} topic PureCloud notification topic string
     * @param {Function} callback callback function to fire when the event occurs
     */
    addSubscription(topic, callback){
        let body = [{'id': topic}]

        return notificationsApi.postNotificationsChannelSubscriptions(
                channel.id, body)
        .then((data) => {
            subscriptionMap[topic] = callback;
            console.log(`Added subscription to ${topic}`);
        });
    }
}