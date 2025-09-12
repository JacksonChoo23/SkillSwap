const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://router.huggingface.co/hf-inference/models/lazyghost/bert-large-uncased-Adult-Text-Classifier';
const API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

async function checkAdultContent(input) {
  try {
    const response = await axios.post(
      API_URL,
      { inputs: input },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;

    if (!Array.isArray(result)) {
      throw new Error('Unexpected API response format');
    }

    const adult = result.find((item) => item.label?.toLowerCase() === 'adult');
    const score = adult?.score || 0;

    return {
      adult: score > 0.7,
      label: adult?.label || '',
      score,
      details: result,
      error: false,
    };
  } catch (error) {
    console.error('Error checking adult content:', error.response?.data || error.message);
    return {
      adult: false,
      details: [],
      error: true,
    };
  }
}

module.exports = checkAdultContent;
