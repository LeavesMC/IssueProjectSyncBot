const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const privateKey = fs.readFileSync('private-key.pem');
const appId = '1618124';
const installationId = '76209516';

const jwtToken = jwt.sign(
        {
            iat: Math.floor(Date.now() / 1000) - 60,
            exp: Math.floor(Date.now() / 1000) + (10 * 60),
            iss: appId,
        },
        privateKey,
        {algorithm: 'RS256'}
);

axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: 'application/vnd.github+json',
            },
        }
).then(res => {
    console.log('Access Token:', res.data.token);
}).catch(err => {
    console.error(err.response?.data || err);
});