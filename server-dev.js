const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Import the handler we created (CommonJS)
const tempHandler = require('./api/temp-mongo-save');

const app = express();
app.use(bodyParser.json());

// Serve demo page static
app.use('/', express.static(path.join(__dirname)));

// Mount the API route — adapt handler signature for Express
app.all('/api/temp-mongo-save', (req, res) => {
    // Express provides res and req compatible with our handler
    return tempHandler(req, res);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}/temp-demo.html`);
});

module.exports = app;
