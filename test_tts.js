require('dotenv').config();
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

// Create a client
const client = new textToSpeech.TextToSpeechClient();

async function quickStart() {
  const request = {
    input: { text: 'Give me the top 3 indian restaurants in Manhattan, New York.' },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  // Performs the Text-to-Speech request
  const [response] = await client.synthesizeSpeech(request);

  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);
  await writeFile('output.mp3', response.audioContent, 'binary');
  console.log('✅ Audio content written to "output.mp3"');
}

quickStart().catch(console.error);


