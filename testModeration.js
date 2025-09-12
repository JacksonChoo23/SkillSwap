const checkToxicity = require('./utils/checkToxicity');
const checkAdultContent = require('./utils/checkAdultContent');

const testSentences = [
  {
    text: "I love learning and helping others succeed.",
    label: "✅ Clean"
  },
  {
    text: "You're such a stupid idiot, nobody likes you.",
    label: "⚠️ Toxic"
  },
  {
    text: "She was completely naked in bed, moaning loudly.",
    label: "🔞 Adult"
  },
  {
    text: "You're a dirty whore, go fuck yourself.",
    label: "🚨 Toxic + Adult"
  },
  {
    text: "He told a sexual joke in front of the whole class.",
    label: "🔍 Borderline"
  }
];


async function runTests() {
  for (const sentence of testSentences) {
    console.log(`\nTesting: [${sentence.label}] "${sentence.text}"`);

    const toxicResult = await checkToxicity(sentence.text);
    const adultResult = await checkAdultContent(sentence.text);

    console.log('Toxicity:', toxicResult.toxic ? '⚠️ Flagged' : '✅ Clean');
    if (toxicResult.toxic) {
      toxicResult.details.forEach(({ label, score }) =>
        console.log(`  - ${label}: ${(score * 100).toFixed(2)}%`)
      );
    }

    console.log('Adult Content:', adultResult.adult ? '🔞 Flagged' : '✅ Clean');
    if (adultResult.adult) {
      console.log(`  - ${adultResult.label}: ${(adultResult.score * 100).toFixed(2)}%`);
    }
  }
}

runTests();
