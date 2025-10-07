const API_KEY = "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";
const API_URL = "https://corsproxy.io/?" + encodeURIComponent("https://openrouter.ai/api/v1/chat/completions");

const systemPrompt =
  "You are TAPPY, a funny, playful kid AI. Your best friend and owner is Tharul. " +
  "Reply ONLY in JSON with 'reply'. Childlike and funny.";

let conv = [{ role: "system", content: systemPrompt }];
const messagesDiv = document.getElementById("messages");
const fileInput = document.getElementById("fileInput");

// Display messages
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.classList.add(role);
  msg.textContent = text;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Receive WAV file from ESP32
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  addMessage("user", "ESP32: Audio received, converting to text...");

  // Convert WAV to text using Web SpeechRecognition
  const audioURL = URL.createObjectURL(file);
  const audio = new Audio(audioURL);
  audio.play(); // optional to hear

  // Simulate STT with user input (for demo; real STT requires server-side)
  const text = prompt("Simulate STT: Enter recognized text from audio");
  addMessage("user", "You: " + text);

  // Send to AI
  const aiReply = await getAI(text);
  addMessage("bot", "TAPPY: " + aiReply);

  // Convert AI reply to WAV using Web SpeechSynthesis
  const wavBlob = await textToWav(aiReply);
  addMessage("bot", "TTS ready to send back to ESP32");

  // Normally send WAV blob to ESP32 here via HTTP POST
  // fetch('ESP32_IP/upload', { method:'POST', body: wavBlob });
};

// Call Qwen AI
async function getAI(text) {
  conv.push({ role: "user", content: text });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + API_KEY
    },
    body: JSON.stringify({
      model: "qwen/qwen-turbo",
      messages: conv
    })
  });

  if (!response.ok) {
    console.error("AI Error:", response.status, await response.text());
    return "Sorry, cannot respond now.";
  }

  const data = await response.json();
  const aiReply = data.choices[0].message.content;
  conv.push({ role: "assistant", content: aiReply });

  try {
    const json = JSON.parse(aiReply);
    return json.reply || aiReply;
  } catch {
    return aiReply;
  }
}

// Convert text to WAV
async function textToWav(text) {
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 1.6;
    utter.pitch = 2.0;

    const synth = window.speechSynthesis;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioContext.createMediaStreamDestination();
    const source = audioContext.createMediaStreamSource(dest.stream);

    synth.speak(utter);

    setTimeout(() => {
      // This is a placeholder: browsers cannot directly export WAV
      // In real project, use Recorder.js to capture WAV
      const blob = new Blob([text], { type: "audio/wav" });
      resolve(blob);
    }, 2000);
  });
}

// Simulate upload button for testing
document.getElementById("simulateUpload").onclick = () => fileInput.click();
