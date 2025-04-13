require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    const response = await axios.get(url, {
      params: { key: GEMINI_API_KEY },
    });

    console.log("✅ Models available to your API key:\n");
    response.data.models.forEach(model => {
      console.log(`• ${model.name}`);
    });
  } catch (error) {
    console.error('❌ Error fetching models:', error.response?.data || error.message);
  }
}

listModels();
