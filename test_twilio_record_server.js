require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/incoming_call', (req, res) => {
  const twiml = new VoiceResponse();

  twiml.say('Hi i am the AI Agent. Please leave a message. Your call will be recorded after this tone');
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

app.post('/handle_recording', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Thanks! Goodbye.');
  twiml.hangup();

  const recordingUrl = req.body.RecordingUrl;
  const recordingSid = req.body.RecordingSid;

  console.log('🎙️ Recording SID:', recordingSid);

  res.type('text/xml');
  res.send(twiml.toString());

  setTimeout(async () => {
    try {
      const fullMp3Url = `${recordingUrl}.mp3`;
      const outputDir = path.join(__dirname, 'output');
      const tempMp3Path = path.join(outputDir, `${recordingSid}_temp.mp3`);
      const finalWavPath = path.join(outputDir, `${recordingSid}.wav`);

      // Ensure output dir exists
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

      // Download the .mp3 file to a temporary location
      const response = await axios.get(fullMp3Url, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      fs.writeFileSync(tempMp3Path, response.data);

      // Convert to .wav and then delete .mp3
      ffmpeg(tempMp3Path)
        .audioCodec('pcm_s16le')
        .audioFrequency(48000)
        .format('wav')
        .on('end', () => {
          fs.unlinkSync(tempMp3Path); // delete the temp .mp3
          console.log(`✅ Saved WAV file: ${finalWavPath}`);
        })
        .on('error', err => {
          console.error(`❌ Conversion failed for ${recordingSid}:`, err.message);
        })
        .save(finalWavPath);
    } catch (err) {
      console.error(`❌ Error downloading or converting recording:`, err.message);
    }
  }, 2500); // Delay to allow Twilio time to finish processing
});

app.listen(1337, () => {
  console.log('🎧 Twilio server running on port 1337');
});
