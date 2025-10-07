const API_KEY = "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";
const API_URL = "https://corsproxy.io/?" + encodeURIComponent("https://openrouter.ai/api/v1/chat/completions");

const systemPrompt =
  "You are TAPPY, a funny, playful kid AI. Your best friend and owner is Tharul. " +
  "Reply ONLY in JSON with 'reply'. Childlike and funny.";

let conv = [{ role: "system", content: systemPrompt }];

const startBtn = document.getElementById("startBtn");
const messagesDiv = document.getElementById("messages");
const fileInput = document.getElementById("fileInput");

// Add message helper
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.classList.add(role);
  msg.textContent = text;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// TTS using Zira / childlike voice
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1.45;
  utter.pitch = 2.0; 
  utter.volume = 1.3;

  const voices = window.speechSynthesis.getVoices();
  const zira = voices.find(v => v.name.toLowerCase().includes("zira"));
  const child = voices.find(v => v.name.toLowerCase().includes("child"));
  utter.voice = zira || child || voices[0];

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ESP32 file upload → AI → TTS
async function handleESPUpload(file) {
  const formData = new FormData();
  formData.append("audio", file);

  const resp = await fetch("/upload", { method: "POST", body: formData });
  const wavBlob = await resp.blob();
  return wavBlob;
}

// Button for browser STT
startBtn.onclick = async () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onstart = () => {
    startBtn.textContent = "🎙️ Listening...";
    startBtn.disabled = true;
  };

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    addMessage("user", "You: " + text);
    recognition.stop();
    startBtn.textContent = "🎤 Start Conversation";
    startBtn.disabled = false;

    conv.push({ role: "user", content: text });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + API_KEY 
      },
      body: JSON.stringify({ model: "qwen/qwen-turbo", messages: conv })
    });

    const data = await response.json();
    const aiReply = data.choices[0].message.content;
    conv.push({ role: "assistant", content: aiReply });

    addMessage("bot", "TAPPY: " + aiReply);
    speak(aiReply);
  };

  recognition.onerror = (err) => {
    console.error("Speech Error:", err);
    startBtn.textContent = "🎤 Start Conversation";
    startBtn.disabled = false;
  };
};

// ESP32 can POST file to /upload
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  const wavBlob = await handleESPUpload(file);
  addMessage("bot", "TTS received from AI, ready to play on ESP.");
  console.log("TTS WAV size:", wavBlob.size);
};
