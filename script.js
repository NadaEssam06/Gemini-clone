const chatHistoryDiv = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const newChatButton = document.getElementById("newChatButton");
const loadingIndicator = document.getElementById("loadingIndicator");
let chatHistory = [];

// Adjust textarea height dynamically
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

// Function to add a message to the chat history
function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  if (sender === "user") {
    messageDiv.classList.add("user-message");
    messageDiv.textContent = text;
  } else {
    messageDiv.classList.add("bot-message");

    const htmlContent = marked.parse(text);
    messageDiv.innerHTML = htmlContent;

    messageDiv.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  chatHistoryDiv.appendChild(messageDiv);
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

// Helper function to escape HTML special characters to prevent XSS
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

// Function to call the Gemini API
async function getGeminiResponse(prompt) {
  loadingIndicator.classList.add("show");
  sendButton.disabled = true; // Disable send button
  newChatButton.disabled = true; // Disable new chat button during API call

  try {
    // let chatHistory = [];
    chatHistory.push({
      role: "user",
      parts: [{ text: prompt }],
    });
    const payload = { contents: chatHistory };
    const apiKey = ""; // I remove api key after test
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const text = result.candidates[0].content.parts[0].text;
      addMessage(text, "bot");
    } else {
      console.error("Unexpected API response structure:", result);
      addMessage("Sorry, I couldn't get a response. Please try again.", "bot");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    addMessage(
      "An error occurred while connecting to the AI. Please check your network.",
      "bot"
    );
  } finally {
    loadingIndicator.classList.remove("show");
    sendButton.disabled = false;
    newChatButton.disabled = false;
  }
}

// Event listener for the send button
sendButton.addEventListener("click", () => {
  const message = userInput.value.trim();
  if (message) {
    addMessage(message, "user");
    userInput.value = ""; // Clear input field
    userInput.style.height = "auto"; // Reset textarea height
    getGeminiResponse(message);
  }
});

// Event listener for Enter key in the input field
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    // Allow Shift+Enter for new line
    e.preventDefault(); // Prevent default Enter behavior (new line)
    sendButton.click(); // Trigger send button click
  }
});

// Function to start a new chat
function startNewChat() {
  chatHistory = []; // Clear conversation memory
  chatHistoryDiv.innerHTML = ""; // Clear all messages
  addMessage("Hello! How can I help you today?", "bot"); // Add initial bot message
  userInput.value = ""; // Clear user input
  userInput.style.height = "auto"; // Reset textarea height
}

// Event listener for the new chat button
newChatButton.addEventListener("click", startNewChat);

// Ensure the initial textarea height is correct
userInput.style.height = userInput.scrollHeight + "px";
