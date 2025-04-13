require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenAI } = require('@google/genai');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');

// Create clients for each service
const speechClient = new SpeechClient();
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

// Function to transcribe audio to text
async function transcribeAudio() {
  const fileName = path.join(__dirname, '/test_files/restaurant_test.wav'); // Replace with your file path

  const audio = {
    content: fs.readFileSync(fileName).toString('base64'),
  };

  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };

  const request = {
    audio: audio,
    config: config,
  };

  try {
    const [response] = await speechClient.recognize(request);
    const transcript = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log('Transcription: ', transcript);
    return transcript;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}

// Function to process text with Gemini AI
async function processWithGemini(inputText) {
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: inputText,
    });
    const geminiResponse = response.text;
    console.log('Gemini AI Response:', geminiResponse);
    return geminiResponse;
  } catch (error) {
    console.error('Error processing with Gemini AI:', error);
    return null;
  }
}

// ⏱️ Helper function to trim text to ~20 seconds max speech
function trimTextToDuration(text, maxSeconds = 20, wordsPerSecond = 2) {
  const maxWords = maxSeconds * wordsPerSecond;
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

// Function to convert text to speech
async function convertTextToSpeech(text) {
  // Limit response to ~20s of speech
  const trimmedText = trimTextToDuration(text, 20, 2);
  console.log(`🔊 Trimmed response to ${trimmedText.split(' ').length} words.`);

  const request = {
    input: { text: trimmedText },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    const writeFile = util.promisify(fs.writeFile);
    await writeFile('output.mp3', response.audioContent, 'binary');
    console.log('✅ Audio content written to "output.mp3"');
  } catch (error) {
    console.error('Error converting text to speech:', error);
  }
}

// Main function to handle the complete flow
async function handleVoiceInput() {
  try {
    const transcription = await transcribeAudio();
    if (!transcription) return;

    const geminiResponse = await processWithGemini(transcription);
    if (!geminiResponse) return;

    await convertTextToSpeech(geminiResponse);
  } catch (error) {
    console.error('Error in the voice processing pipeline:', error);
  }
}

// Run the pipeline
handleVoiceInput();
