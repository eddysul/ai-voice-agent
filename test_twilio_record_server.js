// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
// const ffmpeg = require('fluent-ffmpeg');
// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const app = express();
// app.use(express.urlencoded({ extended: false }));

// app.post('/incoming_call', (req, res) => {
//   const twiml = new VoiceResponse();

//   twiml.say('Hi i am the AI Agent. Please leave a message. Your call will be recorded after this tone');
//   twiml.record({
//     maxLength: 10,
//     playBeep: true,
//     timeout: 2,
//     action: '/handle_recording',
//     method: 'POST'
//   });

//   res.type('text/xml');
//   res.send(twiml.toString());
// });

// app.post('/handle_recording', (req, res) => {
//   const twiml = new VoiceResponse();
//   twiml.say('Thanks! Goodbye.');
//   twiml.hangup();

//   const recordingUrl = req.body.RecordingUrl;
//   const recordingSid = req.body.RecordingSid;

//   console.log('🎙️ Recording SID:', recordingSid);

//   res.type('text/xml');
//   res.send(twiml.toString());

//   setTimeout(async () => {
//     try {
//       const fullMp3Url = `${recordingUrl}.mp3`;
//       const outputDir = path.join(__dirname, 'output');
//       const tempMp3Path = path.join(outputDir, `${recordingSid}_temp.mp3`);
//       const finalWavPath = path.join(outputDir, `${recordingSid}.wav`);

//       // Ensure output dir exists
//       if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

//       // Download the .mp3 file to a temporary location
//       const response = await axios.get(fullMp3Url, {
//         responseType: 'arraybuffer',
//         auth: {
//           username: process.env.TWILIO_ACCOUNT_SID,
//           password: process.env.TWILIO_AUTH_TOKEN
//         }
//       });

//       fs.writeFileSync(tempMp3Path, response.data);

//       // Convert to .wav and then delete .mp3
//       ffmpeg(tempMp3Path)
//         .audioCodec('pcm_s16le')
//         .audioFrequency(48000)
//         .format('wav')
//         .on('end', () => {
//           fs.unlinkSync(tempMp3Path); // delete the temp .mp3
//           console.log(`✅ Saved WAV file: ${finalWavPath}`);
//         })
//         .on('error', err => {
//           console.error(`❌ Conversion failed for ${recordingSid}:`, err.message);
//         })
//         .save(finalWavPath);
//     } catch (err) {
//       console.error(`❌ Error downloading or converting recording:`, err.message);
//     }
//   }, 2500); // Delay to allow Twilio time to finish processing
// });

// app.listen(1337, () => {
//   console.log('🎧 Twilio server running on port 1337');
// });





require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
app.use(express.urlencoded({ extended: false }));

app.use('/gemini_output', express.static(path.join(__dirname, 'gemini_output')));

async function downloadWithRetry(url, destPath, auth, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        auth
      });
      fs.writeFileSync(destPath, response.data);
      console.log(`✅ MP3 downloaded on attempt ${attempt}`);
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`⏳ Waiting for MP3 to be ready (retry ${attempt})...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

app.post('/incoming_call', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Hi, I am the AI Agent. You can ask up to three questions. Please leave your first message after the tone.');
  twiml.record({
    maxLength: 10,
    playBeep: true,
    timeout: 2,
    action: '/handle_recording?count=1',
    method: 'POST'
  });
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/handle_recording', async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  const recordingSid = req.body.RecordingSid;
  const count = parseInt(req.query.count || '1');

  console.log(`🎙️ Recording SID: ${recordingSid} | Count: ${count}`);

  const outputDir = path.join(__dirname, 'output');
  const tempMp3Path = path.join(outputDir, `${recordingSid}_temp.mp3`);
  const finalWavPath = path.join(outputDir, `${recordingSid}.wav`);
  const fullMp3Url = `${recordingUrl}.mp3`;

  const geminiOutputMp3Path = path.join(__dirname, 'gemini_output', `${recordingSid}.mp3`);
  const geminiOutputMp3URL = `https://${process.env.NGROK_DOMAIN}/gemini_output/${recordingSid}.mp3`;

  try {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    await downloadWithRetry(fullMp3Url, tempMp3Path, {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN
    });

    await new Promise((resolve, reject) => {
      ffmpeg(tempMp3Path)
        .audioCodec('pcm_s16le')
        .audioFrequency(48000)
        .format('wav')
        .on('end', () => {
          fs.unlinkSync(tempMp3Path);
          console.log(`✅ Saved WAV file: ${finalWavPath}`);
          resolve();
        })
        .on('error', reject)
        .save(finalWavPath);
    });

    const { handleVoiceInput } = require('./auto_pipeline');
    await handleVoiceInput(recordingSid);

    const waitUntil = Date.now() + 8000;
    while (!fs.existsSync(geminiOutputMp3Path) && Date.now() < waitUntil) {
      await new Promise(r => setTimeout(r, 500));
    }

    const twiml = new VoiceResponse();

    if (fs.existsSync(geminiOutputMp3Path)) {
      twiml.play(geminiOutputMp3URL);
      if (count < 3) {
        twiml.say("Do you have any more questions?");
        twiml.record({
          maxLength: 10,
          playBeep: true,
          timeout: 2,
          action: `/handle_recording?count=${count + 1}`,
          method: 'POST'
        });
      } else {
        twiml.say("You've reached your limit of 3 questions. Please call again if you have more queries. Goodbye.");
        twiml.hangup();
      }
    } else {
      twiml.say("Sorry, I am still thinking. Try again later.");
      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (err) {
    console.error('❌ Error handling recording:', err.message);
    const fallback = new VoiceResponse();
    fallback.say("Sorry, I couldn't process your response. Goodbye.");
    fallback.hangup();
    res.type('text/xml');
    res.send(fallback.toString());
  }
});

app.listen(1337, () => {
  console.log('🎧 Twilio server running on port 1337');
});





// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
// const ffmpeg = require('fluent-ffmpeg');
// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const app = express();
// app.use(express.urlencoded({ extended: false }));

// // Serve gemini_output so Twilio can access .mp3 files
// app.use('/gemini_output', express.static(path.join(__dirname, 'gemini_output')));

// // Utility: Retry download from Twilio if it's not ready
// async function downloadWithRetry(url, destPath, auth, maxRetries = 5) {
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       const response = await axios.get(url, {
//         responseType: 'arraybuffer',
//         auth
//       });
//       fs.writeFileSync(destPath, response.data);
//       console.log(`✅ MP3 downloaded on attempt ${attempt}`);
//       return;
//     } catch (err) {
//       if (attempt === maxRetries) throw err;
//       console.log(`⏳ Waiting for MP3 to be ready (retry ${attempt})...`);
//       await new Promise(r => setTimeout(r, 1500));
//     }
//   }
// }

// app.post('/incoming_call', (req, res) => {
//   const twiml = new VoiceResponse();
//   twiml.say('Hi, I am the AI Agent. Please leave a message. Your call will be recorded after this tone.');
//   twiml.record({
//     maxLength: 10,
//     playBeep: true,
//     timeout: 2,
//     action: '/handle_recording',
//     method: 'POST'
//   });

//   res.type('text/xml');
//   res.send(twiml.toString());
// });

// app.post('/handle_recording', async (req, res) => {
//   const recordingUrl = req.body.RecordingUrl;
//   const recordingSid = req.body.RecordingSid;

//   console.log('🎙️ Recording SID:', recordingSid);

//   const outputDir = path.join(__dirname, 'output');
//   const tempMp3Path = path.join(outputDir, `${recordingSid}_temp.mp3`);
//   const finalWavPath = path.join(outputDir, `${recordingSid}.wav`);
//   const fullMp3Url = `${recordingUrl}.mp3`;

//   const geminiOutputMp3Path = path.join(__dirname, 'gemini_output', `${recordingSid}.mp3`);
//   const geminiOutputMp3URL = `https://${process.env.NGROK_DOMAIN}/gemini_output/${recordingSid}.mp3`;

//   try {
//     if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

//     // Step 1: Download the Twilio recording
//     await downloadWithRetry(fullMp3Url, tempMp3Path, {
//       username: process.env.TWILIO_ACCOUNT_SID,
//       password: process.env.TWILIO_AUTH_TOKEN
//     });

//     // Step 2: Convert MP3 to WAV
//     await new Promise((resolve, reject) => {
//       ffmpeg(tempMp3Path)
//         .audioCodec('pcm_s16le')
//         .audioFrequency(48000)
//         .format('wav')
//         .on('end', () => {
//           fs.unlinkSync(tempMp3Path);
//           console.log(`✅ Saved WAV file: ${finalWavPath}`);
//           resolve();
//         })
//         .on('error', reject)
//         .save(finalWavPath);
//     });

//     // Step 3: Call Gemini AI pipeline
//     const { handleVoiceInput } = require('./auto_pipeline');
//     await handleVoiceInput(recordingSid);

//     // Step 4: Wait until TTS .mp3 is generated
//     const waitUntil = Date.now() + 8000;
//     while (!fs.existsSync(geminiOutputMp3Path) && Date.now() < waitUntil) {
//       await new Promise(r => setTimeout(r, 500));
//     }

//     if (!fs.existsSync(geminiOutputMp3Path)) {
//       throw new Error("Gemini response .mp3 not found.");
//     }

//     // Step 5: Respond to caller with generated voice
//     const twiml = new VoiceResponse();
//     twiml.play(geminiOutputMp3URL);
//     twiml.hangup();

//     res.type('text/xml');
//     res.send(twiml.toString());

//   } catch (err) {
//     console.error('❌ Error handling recording:', err.message);
//     const fallback = new VoiceResponse();
//     fallback.say("Sorry, I couldn't process your response. Goodbye.");
//     fallback.hangup();
//     res.type('text/xml');
//     res.send(fallback.toString());
//   }
// });

// app.listen(1337, () => {
//   console.log('🎧 Twilio server running on port 1337');
// });
