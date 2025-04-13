require('dotenv').config();
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');

// Create STT client
const client = new SpeechClient();

async function quickSTT() {
  const audioPath = '/Users/amanverma/Desktop/DevFest/output.mp3';

  // Read audio file from disk
  const file = fs.readFileSync(audioPath);
  const audioBytes = file.toString('base64');

  const audio = { content: audioBytes };
  const config = {
    encoding: 'MP3', // Because your file is MP3
    sampleRateHertz: 16000, // Optional, depends on file
    languageCode: 'en-US',
  };

  const request = { audio, config };

  // Transcribe
  const [response] = await client.recognize(request);
  const transcript = response.results[0]?.alternatives[0]?.transcript;

  console.log('✅ Transcript:', transcript || 'No speech recognized.');
}

quickSTT().catch(console.error);
