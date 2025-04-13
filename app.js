// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const { SpeechClient } = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const app = express();

// Set up middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Endpoint for handling incoming calls
app.post('/incoming_call', (req, res) => {
    const response = new VoiceResponse();

    // Greeting the user
    response.say('Hello! Please tell me what service you are looking for.');
    response.record({ maxLength: 30, action: '/process_audio', method: 'POST' });

    res.type('text/xml');
    res.send(response.toString());
});

// Endpoint for processing the recorded audio
app.post('/process_audio', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    console.log('Recording URL: ', recordingUrl);

    // Transcribe the audio using Google Cloud Speech-to-Text
    const transcript = await transcribeAudio(recordingUrl);
    console.log('Transcript: ', transcript);

    // Generate a response audio using Google Cloud Text-to-Speech
    const audioFile = await textToSpeechConvert(`You said: ${transcript}`);

    const response = new VoiceResponse();
    response.play(audioFile);  // Play the generated audio response

    res.type('text/xml');
    res.send(response.toString());
});

// Function to transcribe audio using Google Speech-to-Text
async function transcribeAudio(recordingUrl) {
    const client = new SpeechClient();
    const audio = { uri: `${recordingUrl}.wav` };

    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
    };

    const request = {
        audio: audio,
        config: config,
    };

    const [response] = await client.recognize(request);
    return response.results[0].alternatives[0].transcript;
}

// Function to convert text to speech using Google Cloud Text-to-Speech
async function textToSpeechConvert(text) {
    const client = new textToSpeech.TextToSpeechClient();

    const request = {
        input: { text: text },
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);

    // Save the audio to a file
    const filename = 'response.mp3';
    fs.writeFileSync(filename, response.audioContent);
    return filename;
}

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});