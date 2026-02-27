# zerodha-connect-test

A CLI tool to test the Zerodha KiteConnect OAuth login flow with different user accounts.

## Prerequisites

- Node.js 18+
- A [Zerodha KiteConnect app](https://developers.kite.trade/) with its redirect URL set to `http://localhost:8054`

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Create a `.env` file** in the project root:

```bash
cp .env.example .env
```

Then edit `.env` and fill in your credentials:

```
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here
```

**3. Set the redirect URL** in your Zerodha app settings (developer console) to:

```
http://localhost:8054
```

> To test with accounts other than the app owner's, add those Zerodha user IDs under the app's authorized users in the developer console.

## Usage

```bash
node src/cli.js login
```

This will:

1. Start a local callback server on `http://localhost:8054`
2. Print the Zerodha login URL and open it in your browser
3. After you complete login and TOTP on Zerodha's page, you'll be redirected back
4. The `request_token` is displayed in the terminal and on the browser success page

**To skip auto-opening the browser:**

```bash
node src/cli.js login --no-open
```

Press `Ctrl+C` to stop the server when done.
