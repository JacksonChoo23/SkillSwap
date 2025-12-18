const http = require('http');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8').trim();
const activateUrl = `http://localhost:3000/auth/activate/${token}`;

console.log('Fetching Login Page...');
http.get('http://localhost:3000/auth/login', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const output = `Status: ${res.statusCode}\n\n${data.substring(0, 1000)}`;
        fs.writeFileSync('login_page_head.txt', output);
        console.log('Login page fetched. Status:', res.statusCode);
    });
}).on('error', (e) => console.log('Login fetch error:', e));

console.log('Fetching Activation URL...');
http.get(activateUrl, (res) => {
    const result = `Status: ${res.statusCode}\nLocation: ${res.headers.location || 'None'}\n`;
    fs.writeFileSync('activation_result.txt', result);
    console.log('Activation result:', result.trim());
    res.resume();
}).on('error', (e) => {
    fs.writeFileSync('activation_result.txt', `Error: ${e.message}`);
});
