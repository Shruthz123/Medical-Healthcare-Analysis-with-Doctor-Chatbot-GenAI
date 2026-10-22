function setPrompt(text) {
    document.getElementById('userInput').value = text;
}

function sendMessage() {
    const input = document.getElementById('userInput');
    const messages = document.getElementById('messages');
    if (!input.value.trim()) return;

    // Display user message
    const userDiv = document.createElement('div');
    userDiv.textContent = "You: " + input.value;
    messages.appendChild(userDiv);

    // Display demo notice
    const botDiv = document.createElement('div');
    botDiv.className = "bot-reply";
    botDiv.textContent = "Bot: This is a demo interface. No backend is connected, and no data is being processed.";
    messages.appendChild(botDiv);

    input.value = '';
    messages.scrollTop = messages.scrollHeight;
}