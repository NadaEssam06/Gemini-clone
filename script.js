//"AIzaSyBCr92w6GtYKrTzd2_UnzUst5ez9fU_KHU";

const chatHistoryDiv = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const newChatButton = document.getElementById("newChatButton");
const loadingIndicator = document.getElementById("loadingIndicator");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const clearImageButton = document.getElementById("clearImageButton");

let chatHistory = [];
let selectedImageData = null; // To store the base64 image data
let selectedImageMimeType = null; // To store the image mime type

// Adjust textarea height dynamically
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

// Function to add a message to the chat history
function addMessage(content, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  if (sender === "user") {
    messageDiv.classList.add("user-message");
    if (typeof content === "string") {
      messageDiv.textContent = content;
    } else if (content.text && content.imageUrl) {
      // Handle user message with both text and image
      const textSpan = document.createElement("span");
      textSpan.textContent = content.text;
      messageDiv.appendChild(textSpan);

      const imgElement = document.createElement("img");
      imgElement.src = content.imageUrl;
      imgElement.classList.add("chat-image"); // Add a class for styling
      messageDiv.appendChild(imgElement);
    } else if (content.imageUrl) {
      // Handle user message with only image
      const imgElement = document.createElement("img");
      imgElement.src = content.imageUrl;
      imgElement.classList.add("chat-image"); // Add a class for styling
      messageDiv.appendChild(imgElement);
    } else {
      messageDiv.textContent = "Error: Unknown user message format.";
    }
  } else {
    messageDiv.classList.add("bot-message");

    const htmlContent = marked.parse(content);
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
async function getGeminiResponse(
  prompt,
  imageData = null,
  imageMimeType = null
) {
  loadingIndicator.classList.add("show");
  sendButton.disabled = true; // Disable send button
  newChatButton.disabled = true; // Disable new chat button during API call
  imageUpload.disabled = true; // Disable image upload during API call

  try {
    const parts = [];
    if (prompt) {
      parts.push({ text: prompt });
    }
    if (imageData && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageData.split(",")[1], // Remove "data:image/jpeg;base64," prefix
        },
      });
    }

    chatHistory.push({
      role: "user",
      parts: parts,
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
      chatHistory.push({
        role: "model",
        parts: [{ text: text }],
      });
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
    imageUpload.disabled = false;
  }
}

// Event listener for the send button
sendButton.addEventListener("click", () => {
  const message = userInput.value.trim();

  if (message || selectedImageData) {
    if (selectedImageData) {
      // Display image in user chat history
      addMessage({ text: message, imageUrl: selectedImageData }, "user");
    } else {
      addMessage(message, "user");
    }

    userInput.value = ""; // Clear input field
    userInput.style.height = "auto"; // Reset textarea height

    getGeminiResponse(message, selectedImageData, selectedImageMimeType);

    // Clear image after sending
    clearSelectedImage();
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

// Event listener for image upload
imageUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedImageData = e.target.result;
      selectedImageMimeType = file.type;
      imagePreview.src = selectedImageData;
      imagePreviewContainer.classList.add("show");
      clearImageButton.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

// Function to clear the selected image
function clearSelectedImage() {
  selectedImageData = null;
  selectedImageMimeType = null;
  imagePreview.src = "#";
  imagePreviewContainer.classList.remove("show");
  clearImageButton.classList.add("hidden");
  imageUpload.value = ""; // Clear the file input
}

// Event listener for the clear image button
clearImageButton.addEventListener("click", clearSelectedImage);

// Function to start a new chat
function startNewChat() {
  chatHistory = []; // Clear conversation memory
  chatHistoryDiv.innerHTML = ""; // Clear all messages
  addMessage("Hello! How can I help you today?", "bot"); // Add initial bot message
  userInput.value = ""; // Clear user input
  userInput.style.height = "auto"; // Reset textarea height
  clearSelectedImage(); // Clear any selected image
}

// Event listener for the new chat button
newChatButton.addEventListener("click", startNewChat);

// Ensure the initial textarea height is correct
userInput.style.height = userInput.scrollHeight + "px";
