const API_KEY = "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";
const API_URL = "https://corsproxy.io/?" + encodeURIComponent("https://openrouter.ai/api/v1/chat/completions");

const systemPrompt =
  "You are TAPPY, a funny, playful kid AI. Your best friend and owner is Tharul. " +
  "Reply ONLY in JSON with 'reply'. Childlike and funny.";

let conv = [{ role: "system", content: systemPrompt }];

document.getElementById("fileInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Convert WAV to text using Web Speech API
  const audioURL = URL.createObjectURL(file);
  const audio = new Audio(audioURL);
  audio.play();

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    console.log("User said:", text);

    // AI Qwen Turbo
    conv.push({ role: "user", content: text });
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({ model: "qwen/qwen-turbo", messages: conv })
    });

    const data = await res.json();
    const reply = JSON.parse(data.choices[0].message.content).reply;
    console.log("AI reply:", reply);

    // TTS back to ESP32
    const utter = new SpeechSynthesisUtterance(reply);
    utter.lang = "en-US";
    utter.pitch = 10;
    utter.rate = 1.45;
    utter.volume = 1.5;

    const voices = window.speechSynthesis.getVoices();
    const zira = voices.find(v => v.name.includes("Zira"));
    if (zira) utter.voice = zira;

    window.speechSynthesis.speak(utter);
  };
};
