const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: false }));

// Twilio will hit this when a call comes in
app.post('/incoming_call', (req, res) => {
  const twiml = new VoiceResponse();

  twiml.say('Start speaking. I will record this.');
  twiml.record({
    maxLength: 10,              // up to 10 seconds
    playBeep: true,
    timeout: 2,
    action: '/handle_recording',
    method: 'POST'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// Twilio will hit this after the recording
app.post('/handle_recording', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Thanks! Goodbye.');
  twiml.hangup();

  console.log('📼 Recording URL:', req.body.RecordingUrl);
  console.log('🎙️ Recording SID:', req.body.RecordingSid);

  res.type('text/xml');
  res.send(twiml.toString());
});

// Start the server
app.listen(1337, () => {
  console.log('🎧 Twilio test server listening on port 1337');
});
