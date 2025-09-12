const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://api-inference.huggingface.co/models/unitary/toxic-bert';
const API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

async function checkToxicity(input) {
  try {
    const response = await axios.post(
      API_URL,
      { inputs: input },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json"
        },
      }
    );

    // Ensure response is in expected format
    const result = response.data;
    if (!Array.isArray(result) || !Array.isArray(result[0])) {
      throw new Error("Unexpected API response format");
    }

    const toxicLabels = result[0].filter(
      (item) => item.score > 0.7 && item.label !== 'neutral'
    );

    return {
      toxic: toxicLabels.length > 0,
      details: toxicLabels.map(({ label, score }) => ({ label, score })),
    };

  } catch (error) {
    console.error('Error checking toxicity:', error.response?.data || error.message);
    return {
      toxic: false,
      details: [],
      error: true
    };
  }
}

module.exports = checkToxicity;
