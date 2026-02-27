#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (dotenv ESM compat)
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on actual environment variables
  }
}

const CALLBACK_PORT = 8054;
const KITE_LOGIN_URL = 'https://kite.zerodha.com/connect/login';

function generateLoginUrl(apiKey) {
  return `${KITE_LOGIN_URL}?v=3&api_key=${apiKey}`;
}

function startCallbackServer(apiKey) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      const requestToken = url.searchParams.get('request_token');
      const status = url.searchParams.get('status');
      const action = url.searchParams.get('action');

      if (requestToken) {
        console.log('\n');
        console.log('='.repeat(60));
        console.log('  LOGIN SUCCESSFUL');
        console.log('='.repeat(60));
        console.log(`  request_token : ${requestToken}`);
        if (status) console.log(`  status        : ${status}`);
        if (action) console.log(`  action        : ${action}`);
        console.log('='.repeat(60));
        console.log('\nYou can now close the browser tab.');
        console.log('Press Ctrl+C to stop the server.\n');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(successPage(requestToken, status, action, apiKey));
        resolve(requestToken);
      } else {
        // Handle any other request (favicon, etc.) silently
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(waitingPage(apiKey));
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\nError: Port ${CALLBACK_PORT} is already in use.`);
        console.error('Please free the port and try again.\n');
      }
      reject(err);
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      console.log(`Callback server listening on http://localhost:${CALLBACK_PORT}`);
    });
  });
}

function waitingPage(apiKey) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zerodha OAuth — Waiting</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #f5f5f5; }
    .box { background: white; padding: 2rem 3rem; border-radius: 8px;
           box-shadow: 0 2px 12px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #387ed1; }
    p  { color: #555; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Waiting for Zerodha callback…</h1>
    <p>Please complete the login on the Zerodha page.</p>
    <p style="font-size:0.85rem;color:#999">Listening on port ${CALLBACK_PORT} &nbsp;|&nbsp; api_key: ${apiKey}</p>
  </div>
</body>
</html>`;
}

function successPage(requestToken, status, action, apiKey) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zerodha OAuth — Success</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #f5f5f5; }
    .box { background: white; padding: 2rem 3rem; border-radius: 8px;
           box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 600px; width: 100%; }
    h1   { color: #2ecc71; margin-top: 0; }
    .token { background: #f0f7ff; border: 1px solid #c0d8f0; border-radius: 4px;
             padding: 0.75rem 1rem; font-family: monospace; font-size: 1rem;
             word-break: break-all; color: #1a1a2e; margin: 0.5rem 0 1.5rem; }
    .meta  { font-size: 0.85rem; color: #777; border-top: 1px solid #eee;
             padding-top: 0.75rem; }
    label  { font-weight: 600; color: #333; display: block; margin-bottom: 0.25rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>&#10003; Login Successful</h1>
    <label>request_token</label>
    <div class="token">${requestToken}</div>
    <div class="meta">
      ${status  ? `<p><strong>status:</strong> ${status}</p>` : ''}
      ${action  ? `<p><strong>action:</strong> ${action}</p>` : ''}
      <p><strong>api_key:</strong> ${apiKey}</p>
    </div>
    <p style="color:#888;font-size:0.8rem">You can close this tab and return to the terminal.</p>
  </div>
</body>
</html>`;
}

// ── CLI setup ─────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('zerodha')
  .description('Test Zerodha KiteConnect OAuth flow')
  .version('1.0.0');

program
  .command('login')
  .description('Start the Zerodha OAuth login flow')
  .option('--no-open', 'Print the login URL without opening the browser')
  .action(async (opts) => {
    loadEnv();

    const apiKey    = process.env.API_KEY;
    const apiSecret = process.env.API_SECRET;

    if (!apiKey) {
      console.error('Error: API_KEY is not set. Add it to your .env file.');
      process.exit(1);
    }
    if (!apiSecret) {
      console.error('Error: API_SECRET is not set. Add it to your .env file.');
      process.exit(1);
    }

    const loginUrl = generateLoginUrl(apiKey);

    console.log('\nZerodha KiteConnect OAuth Test');
    console.log('─'.repeat(40));
    console.log(`API Key    : ${apiKey}`);
    console.log(`Callback   : http://localhost:${CALLBACK_PORT}`);
    console.log('─'.repeat(40));
    console.log('\nLogin URL:');
    console.log(`  ${loginUrl}\n`);
    console.log('IMPORTANT: Make sure your Zerodha app\'s redirect URL is set to:');
    console.log(`  http://localhost:${CALLBACK_PORT}\n`);

    // Start the callback server before opening the browser
    const tokenPromise = startCallbackServer(apiKey);

    if (opts.open !== false) {
      // Dynamically import 'open' so it doesn't fail if not installed
      try {
        const { default: open } = await import('open');
        console.log('Opening browser…');
        await open(loginUrl);
      } catch {
        console.log('Could not open browser automatically. Please open the URL above manually.');
      }
    }

    console.log('Waiting for Zerodha to redirect back…\n');

    try {
      await tokenPromise;
      // Keep server alive so the user can see the success page
      // Ctrl+C will exit
    } catch (err) {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
