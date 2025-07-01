const chatHistoryDiv = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const newChatButton = document.getElementById("newChatButton");
const loadingIndicator = document.getElementById("loadingIndicator");
/*Image */
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const clearImageButton = document.getElementById("clearImageButton");
/*Files */
const fileUpload = document.getElementById("fileUpload");
const filePreviewContainer = document.getElementById("filePreviewContainer");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const fileSizeDisplay = document.getElementById("fileSizeDisplay");
const clearFileButton = document.getElementById("clearFileButton");

let selectedFileData = null; // To store the base64 file data
let selectedFileMimeType = null; // To store the file mime type
let selectedFileName = null; // To store the file name

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
    let textContent = "";
    let imageUrl = null;
    let fileInfo = null;

    // Determine the type of content
    if (typeof content === "string") {
      textContent = content; // Old way: just a string
    } else {
      // New way: content is an object
      textContent = content.text || "";
      imageUrl = content.imageUrl || null;
      fileInfo = content.fileInfo || null;
    }

    // Append text if available
    if (textContent) {
      const textSpan = document.createElement("span");
      textSpan.textContent = textContent;
      messageDiv.appendChild(textSpan);
    }
    // Append image if available
    if (imageUrl) {
      const imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.classList.add("chat-image"); // Apply CSS for images in chat
      messageDiv.appendChild(imgElement);
    }
    // Append file info if available
    if (fileInfo) {
      const fileDiv = document.createElement("div");
      fileDiv.classList.add("chat-file"); // Apply CSS for files in chat
      fileDiv.innerHTML = `📎 ${escapeHtml(
        fileInfo.name
      )} <span class="file-size-display">(${fileInfo.size})</span>`;
      messageDiv.appendChild(fileDiv);
    }

    // Fallback for unexpected content (though with send button logic, this should be rare)
    if (!textContent && !imageUrl && !fileInfo) {
      messageDiv.textContent = "Error: Unknown user message format.";
    }
  } else {
    // Bot message (remains the same, processing Markdown and code highlighting)
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
  imageMimeType = null,
  fileData = null,
  fileMimeType = null
) {
  loadingIndicator.classList.add("show");
  sendButton.disabled = true; // Disable send button
  newChatButton.disabled = true; // Disable new chat button during API call
  imageUpload.disabled = true; // Disable image upload during API call
  fileUpload.disabled = true; // Disable file upload during API call

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
    if (fileData && fileMimeType) {
      parts.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileData.split(",")[1], // Remove "data:application/pdf;base64," prefix
        },
      });
    }

    // Add the current user's turn (prompt + media) to chat history
    chatHistory.push({
      role: "user",
      parts: parts,
    });

    const payload = { contents: chatHistory };
    const apiKey = ""; // I removed api key
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
      // Add bot's response to chat history for context in future turns
      chatHistory.push({
        role: "model",
        parts: [{ text: text }],
      });
      addMessage(text, "bot"); // Display bot's response
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
    fileUpload.disabled = false;
  }
}

// Event listener for the send button
sendButton.addEventListener("click", () => {
  const message = userInput.value.trim();

  // Only proceed if there's text, an image, or a file selected
  if (message || selectedImageData || selectedFileData) {
    const userMessageContent = {}; // Object to hold content for display

    if (message) {
      userMessageContent.text = message;
    }
    if (selectedImageData) {
      userMessageContent.imageUrl = selectedImageData;
    }
    if (selectedFileData) {
      userMessageContent.fileInfo = {
        name: selectedFileName,
        // Calculate approximate size for display from Base64 string length
        // Base64 string length is approx 4/3 * original bytes
        size: formatBytes(Math.ceil(selectedFileData.length * 0.75)),
      };
    }

    addMessage(userMessageContent, "user"); // Display user's message with all parts

    userInput.value = ""; // Clear input field
    userInput.style.height = "auto"; // Reset textarea height

    // Call Gemini API with all available data
    getGeminiResponse(
      message,
      selectedImageData,
      selectedImageMimeType,
      selectedFileData,
      selectedFileMimeType
    );

    // Clear media selections after sending
    clearSelectedImage();
    clearSelectedFile();
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

// Function to clear the selected file
function clearSelectedFile() {
  selectedFileData = null;
  selectedFileMimeType = null;
  selectedFileName = null;
  fileNameDisplay.textContent = "";
  fileSizeDisplay.textContent = "";
  filePreviewContainer.classList.add("hidden");
  clearFileButton.classList.add("hidden");
  fileUpload.value = ""; // Clear the file input
}

// Event listener for the clear file button
clearFileButton.addEventListener("click", clearSelectedFile);

// Event listener for file upload
fileUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedFileData = e.target.result;
      selectedFileMimeType = file.type;
      selectedFileName = file.name;

      fileNameDisplay.textContent = file.name;
      fileSizeDisplay.textContent = `(${formatBytes(file.size)})`; // You'll need a formatBytes helper
      filePreviewContainer.classList.remove("hidden");
      clearFileButton.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

// Helper function to format file size (add this anywhere in your JS)
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
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
