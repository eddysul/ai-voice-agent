// const express = require('express');
// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const app = express();
// app.use(express.urlencoded({ extended: false }));

// // Twilio will hit this when a call comes in
// app.post('/incoming_call', (req, res) => {
//   const twiml = new VoiceResponse();

//   twiml.say('Start speaking. I will record this.');
//   twiml.record({
//     maxLength: 10,              // up to 10 seconds
//     playBeep: true,
//     timeout: 2,
//     action: '/handle_recording',
//     method: 'POST'
//   });

//   res.type('text/xml');
//   res.send(twiml.toString());
// });

// // Twilio will hit this after the recording
// app.post('/handle_recording', (req, res) => {
//   const twiml = new VoiceResponse();
//   twiml.say('Thanks! Goodbye.');
//   twiml.hangup();

//   console.log('📼 Recording URL:', req.body.RecordingUrl);
//   console.log('🎙️ Recording SID:', req.body.RecordingSid);

//   res.type('text/xml');
//   res.send(twiml.toString());
// });

// // Start the server
// app.listen(1337, () => {
//   console.log('🎧 Twilio test server listening on port 1337');
// });
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: false }));

// When Twilio receives a call
app.post('/incoming_call', (req, res) => {
  const twiml = new VoiceResponse();

  twiml.say('Start speaking. I will record this.');
  twiml.record({
    maxLength: 10,
    playBeep: true,
    timeout: 2,
    action: '/handle_recording',
    method: 'POST'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// When Twilio finishes recording
app.post('/handle_recording', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Thanks! Goodbye.');
  twiml.hangup();

  const recordingUrl = req.body.RecordingUrl;
  const recordingSid = req.body.RecordingSid;

  console.log('🎙️ New recording:', recordingSid);

  // Send TwiML response immediately
  res.type('text/xml');
  res.send(twiml.toString());

  // ✅ Start downloading recording in background after short delay
  setTimeout(async () => {
    try {
      const fullUrl = `${recordingUrl}.mp3`;
      const response = await axios.get(fullUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

      const outputPath = path.join(outputDir, `${recordingSid}.mp3`);
      fs.writeFileSync(outputPath, response.data);
      console.log(`✅ Saved to output/${recordingSid}.mp3`);
    } catch (err) {
      console.error(`❌ Failed to save recording ${recordingSid}:`, err.message);
    }
  }, 2500); // Give Twilio time to process the recording
});

// Start server
app.listen(1337, () => {
  console.log('🎧 Twilio record server running on port 1337');
});

