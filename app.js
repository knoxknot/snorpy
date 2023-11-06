require('dotenv').config();
const cluster = require('cluster');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const os = require('os');

const app = express();
app.use(express.static('pub'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
    logging: process.env.LOGGING === 'true',
    SSL: process.env.SSL === 'true',
    httpPort: process.env.HTTP_PORT || 8080,
    httpsPort: process.env.HTTPS_PORT || 4433,
};

function getSSLCredentials() {
    if (config.SSL) {
        return {
            key: fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8'),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8')
        };
    }
    return null;
}

function createServer(app) {
    if (config.SSL) {
        const credentials = getSSLCredentials();
        return https.createServer(credentials, app);
    } else {
        return http.createServer(app);
    }
}

function startServer(server, port) {
    server.listen(port, () => console.log(`[+] Server is running on port ${port}`));
}

if (cluster.isMaster) {
    const cpuCount = os.cpus().length;
    // Create a worker for each CPU
    for (let i = 0; i < cpuCount-2; i++) {
        cluster.fork();
    }
    // If a worker dies, start another one
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Define routes
    app.get(['/', 'index.html'], (req, res) => {
        if (config.logging) routeLogger(req);
        res.sendFile('pub/html/index.html', { root: __dirname });
    });

    app.get(['/static.js'], (req, res) => {
    if (config.logging) routeLogger(req);
    const thefile = req.query.file ? req.query.file.replace(/\.\./g, '') : 'default.js';
    const filePath = `./pub/${thefile}`;

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send('404 Not Found');
        } else {
            res.sendFile(filePath, { root: __dirname });
        }
    });
});

    // Initialize the server based on the SSL configuration
    const server = createServer(app);
    const port = config.SSL ? config.httpsPort : config.httpPort;
    startServer(server, port);
}

function routeLogger(req) {
    const date = new Date();
    const ipaddr = req.connection.remoteAddress;
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const line = `${date.toISOString()} ${ipaddr} ${fullUrl} ${JSON.stringify(req.body)}`;
    console.log(line);
}
