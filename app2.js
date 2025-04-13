const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const { SpeechClient } = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const axios = require('axios');
const genAI = require('google-generativeai');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Gemini API setup
genAI.configure({ apiKey: process.env.GEMINI_API_KEY });
const gemini = new genAI.GenerativeModel({ model: 'gemini-pro' });

// Twilio: Initial greeting + start of loop
app.post('/incoming_call', (req, res) => {
    const response = new VoiceResponse();
    response.say('Hi! How can I help you today?');
    response.record({
        maxLength: 30,
        action: '/process_audio',
        method: 'POST',
        playBeep: true
    });

    res.type('text/xml');
    res.send(response.toString());
});

// Process audio, call Gemini, respond with TTS, loop again
app.post('/process_audio', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    console.log('Recording URL:', recordingUrl);

    const transcript = await transcribeAudio(`${recordingUrl}.wav`);
    console.log('Transcript:', transcript);

    const geminiResponse = await askGemini(transcript);
    console.log('Gemini:', geminiResponse);

    const audioFile = await textToSpeechConvert(geminiResponse);

    const response = new VoiceResponse();
    response.play(audioFile);

    // 🔁 Loop back to prompt again
    response.redirect({ method: 'POST' }, '/incoming_call');

    res.type('text/xml');
    res.send(response.toString());
});

// Google STT
async function transcribeAudio(audioUri) {
    const client = new SpeechClient();
    const audio = { uri: audioUri };

    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
    };

    const request = { audio, config };
    const [response] = await client.recognize(request);
    return response.results[0]?.alternatives[0]?.transcript || "Sorry, I couldn't hear that.";
}

// Google TTS
async function textToSpeechConvert(text) {
    const client = new textToSpeech.TextToSpeechClient();

    const request = {
        input: { text },
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    const filename = 'response.mp3';
    fs.writeFileSync(filename, response.audioContent);
    return filename;
}

// Gemini: Ask for a response
async function askGemini(prompt) {
    const result = await gemini.generateContent(prompt);
    return result.response.text();
}

// Server start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
