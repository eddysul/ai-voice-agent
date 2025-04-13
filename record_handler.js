const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { VoiceResponse } = require('twilio').twiml;

const app = express();
app.use(express.urlencoded({ extended: false }));

const outputFile = path.join(__dirname, 'output.mp3');

app.post('/incoming_call', (req, res) => {
    const twiml = new VoiceResponse();

    twiml.say('Start speaking. I will listen in chunks.');
    twiml.record({
        maxLength: 5,
        timeout: 1,
        playBeep: true,
        action: '/process_audio',
        method: 'POST'
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/process_audio', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;

    try {
        const audioRes = await axios.get(`${recordingUrl}.mp3`, {
            responseType: 'arraybuffer'
        });

        // Append this chunk to the output file
        fs.appendFileSync(outputFile, Buffer.from(audioRes.data));
        console.log('✅ Appended new chunk to output.mp3');

        const twiml = new VoiceResponse();
        twiml.say('Got it. Keep going...');
        twiml.record({
            maxLength: 5,
            timeout: 1,
            playBeep: true,
            action: '/process_audio',
            method: 'POST'
        });

        res.type('text/xml');
        res.send(twiml.toString());

    } catch (err) {
        console.error('❌ Error saving chunk:', err.message);
        const twiml = new VoiceResponse();
        twiml.say('Oops, something went wrong.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

const PORT = 1337;
app.listen(PORT, () => {
    console.log(`🎙️ Recording handler running on port ${PORT}`);
});
