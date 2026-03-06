require('dotenv/config');

const { createApp } = require('./src/app');

const app = createApp();

app.start();
