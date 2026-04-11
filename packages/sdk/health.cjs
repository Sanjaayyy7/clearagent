#!/usr/bin/env node
'use strict';

// Minimal HTTP health server for Railway deployment.
// The SDK is a library; this file exists solely to keep the Railway
// service alive and pass healthchecks at /v1/health.
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'sdk', version: '1.0.0' }));
}).listen(PORT, () => {
  console.log(`SDK health server on port ${PORT}`);
});
