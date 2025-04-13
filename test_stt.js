require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');

// Create a client
const client = new SpeechClient();

async function transcribeAudio() {
  const fileName = path.join(__dirname, '/test_files/test_audio.wav'); // Replace with your file

  // The audio file's binary content
  const audio = {
    content: fs.readFileSync(fileName).toString('base64'),
  };

  // The configuration of the recognition request
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };

  // The request object
  const request = {
    audio: audio,
    config: config,
  };

  // Recognize the speech in the audio file
  try {
    const [response] = await client.recognize(request);
    const transcript = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log('Transcription: ', transcript);
  } catch (error) {
    console.error('Error transcribing audio:', error);
  }
}

transcribeAudio();
