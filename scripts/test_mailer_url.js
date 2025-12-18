// scripts/test_mailer_url.js
// Mock process.env
process.env.BASE_URL = 'localhost:3000'; // Scenario: missing protocol
// Also test with trailing slash in another run if needed, but this is the primary failure case

const { sendActivationEmail } = require('../utils/mailer');

// Mock transport
const { transport } = require('../utils/mailer');
transport.sendMail = async (options) => {
    console.log('[MOCK] sendMail called');
    const hrefMatch = options.html.match(/href="([^"]+)"/);
    if (hrefMatch) {
        console.log('[VERIFICATION] Generated URL:', hrefMatch[1]);
    } else {
        console.log('[VERIFICATION] URL not found in HTML');
    }
    return Promise.resolve({ messageId: 'mock-id' });
};

// Run test
async function run() {
    console.log('Testing sendActivationEmail with faulty BASE_URL...');
    const result = await sendActivationEmail({
        to: 'test@example.com',
        name: 'Test User',
        token: 'mock-token'
    });
}


run();
