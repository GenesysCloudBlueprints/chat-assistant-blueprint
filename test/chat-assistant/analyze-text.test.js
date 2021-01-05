const chatAssistant = require('../../docs/scripts/agent-assistant-service/script.js').default;

test('sending no argument will return an empty array', () => {
    expect(chatAssistant.analyzeText()).toHaveLength(0);
})

test('sending an invalid value will return an empty array', () => {
    expect(chatAssistant.analyzeText(12345)).toHaveLength(0);
})

test('sending an empty string will return an empty array', () => {
    expect(chatAssistant.analyzeText('')).toHaveLength(0);
})

test('sending a keyword will return an array with response', () => {
    expect(chatAssistant.analyzeText('thanks')).not.toHaveLength(0);
})