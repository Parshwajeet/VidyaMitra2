async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatBox = document.getElementById('chatBox');
    const loadingDots = document.getElementById('loadingDots');
    
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    // 1. Display User Message in UI
    displayMessage('user', userInput);
    chatInput.value = ''; // Clear input immediately

    // 2. Show Loading State
    if (loadingDots) loadingDots.style.display = 'block';

    try {
        // 3. Fetch from your Node.js Backend (Port 8010)
        const response = await fetch('http://localhost:8010/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userInput, 
                history: [] 
            })
        });

        if (!response.ok) throw new Error('Server issues');

        const data = await response.json();

        // 4. Display AI Response
        if (data.reply) {
            displayMessage('assistant', data.reply);
        } else {
            displayMessage('assistant', "I'm having trouble processing that right now.");
        }

    } catch (error) {
        console.error("Chat Error:", error);
        displayMessage('assistant', "Connection failed. Please ensure your backend is running.");
    } finally {
        // 5. Hide Loading State
        if (loadingDots) loadingDots.style.display = 'none';
        
        // Scroll to bottom
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function displayMessage(role, text) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = role === 'user' ? 'user-message' : 'ai-message';
    msgDiv.style.margin = "10px 0";
    msgDiv.style.padding = "10px";
    msgDiv.style.borderRadius = "8px";
    msgDiv.style.backgroundColor = role === 'user' ? "#2d3748" : "#1a202c";
    msgDiv.style.color = "white";
    
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
}