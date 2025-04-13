require('dotenv').config();
const fs = require('fs');
const path = require('path');
const util = require('util');
const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenAI } = require('@google/genai');
const textToSpeech = require('@google-cloud/text-to-speech');

const speechClient = new SpeechClient();
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

function cleanForTTS(text) {
  return text
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function transcribeAudio(filePath) {
  const audio = {
    content: fs.readFileSync(filePath).toString('base64'),
  };
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };
  const [response] = await speechClient.recognize({ audio, config });
  return response.results.map(r => r.alternatives[0].transcript).join('\n');
}

async function processWithGemini(inputText) {
  const systemInstruction = "Please respond in no more than 50 words.";
  const fullPrompt = `${systemInstruction}\n\nUser: ${inputText}`;
  const response = await aiClient.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });
  return response.text;
}

async function convertTextToSpeech(text, outputPath) {
  const cleanedText = cleanForTTS(text);
  const request = {
    input: { text: cleanedText },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };
  const [response] = await textToSpeechClient.synthesizeSpeech(request);
  await util.promisify(fs.writeFile)(outputPath, response.audioContent, 'binary');
}

module.exports.handleVoiceInput = async function (recordingSid) {
  const outputDir = path.join(__dirname, 'output');
  const geminiOutputDir = path.join(__dirname, 'gemini_output');
  if (!fs.existsSync(geminiOutputDir)) fs.mkdirSync(geminiOutputDir);

  const wavFilePath = path.join(outputDir, `${recordingSid}.wav`);
  const mp3Path = path.join(geminiOutputDir, `${recordingSid}.mp3`);
  const textPath = path.join(geminiOutputDir, `${recordingSid}.txt`);

  const transcript = await transcribeAudio(wavFilePath);
  const geminiResponse = await processWithGemini(transcript);
  fs.writeFileSync(textPath, geminiResponse);
  await convertTextToSpeech(geminiResponse, mp3Path);
};
