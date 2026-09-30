const https = require('https');
const fs = require('fs');
const express = require('express');

const privateKey = fs.readFileSync('ssl/_localhost.key', 'utf8');
const certificate = fs.readFileSync('ssl/_localhost.crt', 'utf8');

const credentials = { key: privateKey, cert: certificate };
const app = express();

// Allow Genesys Cloud to frame this app (the widget hosts it in an iframe).
// Note: this permits framing of OUR app only. The Genesys Cloud login page is
// never framed - it opens in a pop-out window (see docs/scripts/main.js).
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://apps.mypurecloud.com"
    );
    next();
});

// Static host for the client-side app. Authentication is handled entirely in
// the browser via the Authorization Code grant with PKCE (no client secret,
// no server-side token exchange), so no backend routes are required.
app.use(express.static('docs'));

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(3443);
console.log('HTTPS listening on: 3443');
