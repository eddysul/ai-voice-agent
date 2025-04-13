require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

async function getLatestRecording() {
  try {
    const response = await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings.json`, {
      auth: {
        username: accountSid,     // ✅ Fixed here
        password: authToken       // ✅ Fixed here
      }
    });

    const recordings = response.data.recordings;

    if (!recordings || recordings.length === 0) {
      console.log("❌ No recordings found.");
      return;
    }

    const latest = recordings[0];
    console.log("✅ Latest Recording SID:", latest.sid);
    console.log("🔗 Recording URL:", `https://api.twilio.com${latest.uri.replace('.json', '.mp3')}`);
  } catch (err) {
    console.error("❌ Failed to fetch recordings:", err.message);
  }
}
    

getLatestRecording();
