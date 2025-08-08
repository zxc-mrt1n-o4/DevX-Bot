// Telegram bot for collecting contact requests and sending them to admin users
// Setup: Add admin user IDs in the ADMIN_USER_IDS array
// Usage: Start the bot with `node index.js` after installing dependencies

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const ADMIN_USER_IDS = [
  // Add Telegram user IDs of admins here, e.g. 123456789
];

const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

const bot = new TelegramBot(TOKEN, { polling: true });

// Helper to save contact requests
function saveContactRequest(data) {
  let contacts = [];
  if (fs.existsSync(CONTACTS_FILE)) {
    contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  }
  contacts.push({ ...data, date: new Date().toISOString() });
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

// Endpoint for backend to send contact requests to bot
const express = require('express');
const app = express();
app.use(express.json());

app.post('/notify', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  saveContactRequest({ name, email, message });
  const text = `New Contact Request:\nName: ${name}\nEmail: ${email}\nMessage: ${message}`;
  ADMIN_USER_IDS.forEach(id => {
    bot.sendMessage(id, text);
  });
  res.json({ ok: true });
});

const PORT = process.env.BOT_PORT || 4001;
app.listen(PORT, () => {
  console.log(`Bot server listening on port ${PORT}`);
});

// Simple /start command for admins
bot.onText(/\/start/, (msg) => {
  if (ADMIN_USER_IDS.includes(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'You are registered as an admin. You will receive contact requests.');
  } else {
    bot.sendMessage(msg.chat.id, 'You are not authorized to receive contact requests.');
  }
});
