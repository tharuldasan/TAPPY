const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const fetch = require("node-fetch");
const app = express();

app.use(fileUpload());
app.use(express.static("../"));

const API_KEY = "sk-your-openai-key";

app.post("/", async (req, res) => {
  if (!req.files || !req.files.audio) return res.status(400).send("No audio uploaded");

  const audio = req.files.audio;
  const tempPath = "./temp.wav";
  await audio.mv(tempPath);

  // Send WAV → OpenAI STT
  const sttResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + API_KEY },
    body: fs.createReadStream(tempPath)
  });
  const sttData = await sttResp.json();
  const text = sttData.text || "Hello";

  // Send text → Chat AI
  const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_KEY },
    body: JSON.stringify({ model: "qwen/qwen-turbo", messages: [{ role: "user", content: text }] })
  });
  const aiData = await aiResp.json();
  const replyText = aiData.choices[0].message.content || "Hi";

  // Convert to TTS WAV
  const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input: replyText, voice: "alloy", format: "wav" })
  });
  const ttsBuffer = Buffer.from(await ttsResp.arrayBuffer());

  res.setHeader("Content-Type", "audio/wav");
  res.send(ttsBuffer);

  fs.unlinkSync(tempPath);
});

app.listen(3000, () => console.log("Server running on port 3000"));
