// require('dotenv').config();
// const fs = require('fs');
// const path = require('path');
// const { SpeechClient } = require('@google-cloud/speech');
// const { GoogleGenAI } = require('@google/genai');
// const textToSpeech = require('@google-cloud/text-to-speech');
// const util = require('util');

// // Create clients for each service
// const speechClient = new SpeechClient();
// const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// const textToSpeechClient = new textToSpeech.TextToSpeechClient();

// // Function to transcribe audio to text
// async function transcribeAudio() {
//   const fileName = path.join(__dirname, '/test_files/test_audio_aman.wav'); // Replace with your file path

//   // The audio file's binary content
//   const audio = {
//     content: fs.readFileSync(fileName).toString('base64'),
//   };

//   // The configuration of the recognition request
//   const config = {
//     encoding: 'LINEAR16',
//     sampleRateHertz: 48000,
//     languageCode: 'en-US',
//   };

//   // The request object
//   const request = {
//     audio: audio,
//     config: config,
//   };

//   try {
//     const [response] = await speechClient.recognize(request);
//     const transcript = response.results
//       .map(result => result.alternatives[0].transcript)
//       .join('\n');
//     console.log('Transcription: ', transcript);
//     return transcript; // Return transcript to pass to Gemini AI
//   } catch (error) {
//     console.error('Error transcribing audio:', error);
//     return null;
//   }
// }

// // Function to process text with Gemini AI
// async function processWithGemini(inputText) {
//   try {
//     const response = await aiClient.models.generateContent({
//       model: "gemini-2.0-flash",
//       contents: inputText,
//     });
//     const geminiResponse = response.text;
//     console.log('Gemini AI Response:', geminiResponse);
//     return geminiResponse; // Return the response to pass to Text-to-Speech
//   } catch (error) {
//     console.error('Error processing with Gemini AI:', error);
//     return null;
//   }
// }

// // Function to convert text to speech
// async function convertTextToSpeech(text) {
//   const request = {
//     input: { text: text },
//     voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
//     audioConfig: { audioEncoding: 'MP3' },
//   };

//   try {
//     const [response] = await textToSpeechClient.synthesizeSpeech(request);

//     // Write the binary audio content to a local file
//     const writeFile = util.promisify(fs.writeFile);
//     await writeFile('output.mp3', response.audioContent, 'binary');
//     console.log('✅ Audio content written to "output.mp3"');
//   } catch (error) {
//     console.error('Error converting text to speech:', error);
//   }
// }

// // Main function to handle the complete flow
// async function handleVoiceInput() {
//   try {
//     // Step 1: Transcribe audio to text
//     const transcription = await transcribeAudio();
//     if (!transcription) return;

//     // Step 2: Process text with Gemini AI
//     const geminiResponse = await processWithGemini(transcription);
//     if (!geminiResponse) return;

//     // Step 3: Convert Gemini AI response to speech
//     await convertTextToSpeech(geminiResponse);
//   } catch (error) {
//     console.error('Error in the voice processing pipeline:', error);
//   }
// }

// // Run the pipeline
// handleVoiceInput();





require('dotenv').config();
const fs = require('fs');
const path = require('path');
const util = require('util');
const { SpeechClient } = require('@google-cloud/speech');
const { GoogleGenAI } = require('@google/genai');
const textToSpeech = require('@google-cloud/text-to-speech');

const speechClient = new SpeechClient();
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

const outputDir = path.join(__dirname, 'output');
const geminiOutputDir = path.join(__dirname, 'gemini_output');
if (!fs.existsSync(geminiOutputDir)) fs.mkdirSync(geminiOutputDir);

// 🎤 Transcribe audio
async function transcribeAudio(wavFilePath) {
  const audio = {
    content: fs.readFileSync(wavFilePath).toString('base64'),
  };

  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };

  try {
    const [response] = await speechClient.recognize({ audio, config });
    const transcript = response.results.map(r => r.alternatives[0].transcript).join('\n');
    console.log('📝 Transcription:', transcript);
    return transcript;
  } catch (error) {
    console.error('❌ Transcription failed:', error.message);
    return null;
  }
}

// 🧼 Clean Gemini output
function cleanForTTS(text) {
  return text
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 🤖 Gemini AI processing
async function processWithGemini(inputText) {
  try {
    const systemInstruction = "Please respond in no more than 50 words.";
    const fullPrompt = `${systemInstruction}\n\nUser: ${inputText}`;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });

    const geminiResponse = response.text;
    console.log('🤖 Gemini Response:', geminiResponse);
    return geminiResponse;
  } catch (error) {
    console.error('❌ Gemini failed:', error.message);
    return null;
  }
}

// 🔊 Convert Gemini response to MP3
async function convertTextToSpeech(text, outputPath) {
  const cleanedText = cleanForTTS(text);

  const request = {
    input: { text: cleanedText },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    await util.promisify(fs.writeFile)(outputPath, response.audioContent, 'binary');
    console.log(`✅ TTS saved as ${outputPath}`);
  } catch (error) {
    console.error('❌ TTS error:', error.message);
  }
}

// 🧠 Full pipeline for a given .wav file
async function handleVoiceInput(wavFilePath) {
  const recordingId = path.basename(wavFilePath, '.wav');

  const transcription = await transcribeAudio(wavFilePath);
  if (!transcription) return;

  const geminiResponse = await processWithGemini(transcription);
  if (!geminiResponse) return;

  // Save Gemini text
  const textPath = path.join(geminiOutputDir, `${recordingId}.txt`);
  fs.writeFileSync(textPath, geminiResponse);
  console.log(`📝 Gemini response saved to ${textPath}`);

  // Save TTS
  const mp3Path = path.join(geminiOutputDir, `${recordingId}.mp3`);
  await convertTextToSpeech(geminiResponse, mp3Path);
}

// 🕵️ Watch for new .wav files
let lastProcessed = null;

fs.watch(outputDir, (eventType, filename) => {
  if (filename && filename.endsWith('.wav') && eventType === 'rename') {
    const fullPath = path.join(outputDir, filename);

    setTimeout(async () => {
      try {
        if (fs.existsSync(fullPath) && filename !== lastProcessed) {
          lastProcessed = filename;
          console.log(`📥 New recording detected: ${filename}`);
          await handleVoiceInput(fullPath);
        }
      } catch (err) {
        console.error('❌ Error handling new file:', err.message);
      }
    }, 1500); // wait for file to fully save
  }
});

console.log('🟢 Watching /output for new recordings...');







// require('dotenv').config();
// const fs = require('fs');
// const path = require('path');
// const util = require('util');
// const { SpeechClient } = require('@google-cloud/speech');
// const { GoogleGenAI } = require('@google/genai');
// const textToSpeech = require('@google-cloud/text-to-speech');

// const speechClient = new SpeechClient();
// const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// const textToSpeechClient = new textToSpeech.TextToSpeechClient();

// // 🔍 Get the most recent .wav file from /output
// function getLatestWavFile() {
//   const outputDir = path.join(__dirname, 'output');
//   const files = fs.readdirSync(outputDir)
//     .filter(f => f.endsWith('.wav'))
//     .map(f => ({
//       file: f,
//       time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
//     }))
//     .sort((a, b) => b.time - a.time);

//   return files.length > 0 ? path.join(outputDir, files[0].file) : null;
// }

// // 🎤 Transcribe audio
// async function transcribeAudio(wavFilePath) {
//   const audio = {
//     content: fs.readFileSync(wavFilePath).toString('base64'),
//   };

//   const config = {
//     encoding: 'LINEAR16',
//     sampleRateHertz: 48000,
//     languageCode: 'en-US',
//   };

//   try {
//     const [response] = await speechClient.recognize({ audio, config });
//     const transcript = response.results.map(r => r.alternatives[0].transcript).join('\n');
//     console.log('📝 Transcription:', transcript);
//     return transcript;
//   } catch (error) {
//     console.error('❌ Transcription failed:', error.message);
//     return null;
//   }
// }

// // ✨ Clean Gemini output for TTS
// function cleanForTTS(text) {
//   return text
//     .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // remove *italic* or **bold**
//     .replace(/\*/g, '')                     // remove stray asterisks
//     .replace(/\s+/g, ' ')                   // collapse multiple spaces
//     .trim();
// }

// // 🤖 Gemini AI processing (with system instruction)
// async function processWithGemini(inputText) {
//   try {
//     const systemInstruction = "Please respond in no more than 50 words.";
//     const fullPrompt = `${systemInstruction}\n\nUser: ${inputText}`;

//     const response = await aiClient.models.generateContent({
//       model: "gemini-2.0-flash",
//       contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
//     });

//     const geminiResponse = response.text;
//     console.log('🤖 Gemini Response:', geminiResponse);
//     return geminiResponse;
//   } catch (error) {
//     console.error('❌ Gemini failed:', error.message);
//     return null;
//   }
// }

// // 🔊 Convert Gemini text to speech (cleaned)
// async function convertTextToSpeech(text, outputPath) {
//   const cleanedText = cleanForTTS(text);

//   const request = {
//     input: { text: cleanedText },
//     voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
//     audioConfig: { audioEncoding: 'MP3' },
//   };

//   try {
//     const [response] = await textToSpeechClient.synthesizeSpeech(request);
//     await util.promisify(fs.writeFile)(outputPath, response.audioContent, 'binary');
//     console.log(`✅ TTS saved as ${outputPath}`);
//   } catch (error) {
//     console.error('❌ TTS error:', error.message);
//   }
// }

// // 🧠 Main pipeline
// async function handleVoiceInput() {
//   const latestWavPath = getLatestWavFile();
//   if (!latestWavPath) return console.error('❌ No .wav files found in /output');

//   const recordingId = path.basename(latestWavPath, '.wav');
//   const geminiOutputDir = path.join(__dirname, 'gemini_output');
//   if (!fs.existsSync(geminiOutputDir)) fs.mkdirSync(geminiOutputDir);

//   const transcription = await transcribeAudio(latestWavPath);
//   if (!transcription) return;

//   const geminiResponse = await processWithGemini(transcription);
//   if (!geminiResponse) return;

//   // Save Gemini response text
//   const textPath = path.join(geminiOutputDir, `${recordingId}.txt`);
//   fs.writeFileSync(textPath, geminiResponse);
//   console.log(`📝 Gemini response saved to ${textPath}`);

//   // Save TTS as MP3
//   const mp3Path = path.join(geminiOutputDir, `${recordingId}.mp3`);
//   await convertTextToSpeech(geminiResponse, mp3Path);
// }

// handleVoiceInput();
