// Test script for Gemini multimodal analysis
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// List of models to try
const modelsToTry = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

async function testImageAnalysis() {
  console.log('Testing Gemini Multimodal Image Analysis...\n');

  const imagePath = 'C:\\Users\\oilwa\\OneDrive\\Pictures\\Camera Roll\\2025\\07\\20250716_025053000_iOS.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error('Image file not found:', imagePath);
    process.exit(1);
  }

  console.log('Image path:', imagePath);
  console.log('File size:', Math.round(fs.statSync(imagePath).size / 1024), 'KB\n');

  const imageData = fs.readFileSync(imagePath);
  const base64Data = imageData.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' :
    ext === '.gif' ? 'image/gif' :
      ext === '.webp' ? 'image/webp' : 'image/jpeg';

  console.log('MIME type:', mimeType);

  for (const modelName of modelsToTry) {
    console.log('\nTrying model:', modelName);

    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Please describe in detail what you see in this image. Include colors, objects, people, text, and any other notable details.' },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }]
      });

      const response = await result.response;
      const text = response.text();

      console.log('\n============================================================');
      console.log('SUCCESS with model:', modelName);
      console.log('============================================================');
      console.log(text);
      console.log('============================================================');
      console.log('\nTest completed successfully!');
      return;

    } catch (error) {
      console.log('Failed:', error.message || error.status);
    }
  }

  console.error('\nAll models failed!');
}

testImageAnalysis();
