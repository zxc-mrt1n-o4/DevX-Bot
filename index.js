// Telegram bot for collecting contact requests and sending them to admin users
// Setup: Add admin user IDs in the ADMIN_USER_IDS array
// Usage: Start the bot with `node index.js` after installing dependencies


require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');


const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);
if (ADMIN_USER_IDS.length === 0) {
  console.warn('Warning: No ADMIN_USER_IDS set. No one will receive notifications.');
}

const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

let bot;
try {
  bot = new TelegramBot(TOKEN, { polling: true });
} catch (err) {
  console.error('Failed to initialize Telegram bot:', err);
  process.exit(1);
}

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


// POST /notify - receive new contact form submission
app.post('/notify', (req, res) => {
  const {
    name,
    email,
    message,
    company,
    phone,
    subject,
    projectType,
    budget,
    timeline
  } = req.body;
  if (!name || !email || !message || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const contactData = {
    name,
    email,
    message,
    company,
    phone,
    subject,
    projectType,
    budget,
    timeline
  };
  saveContactRequest(contactData);
  const text =
    `New Contact Request:\n` +
    `Name: ${name}\n` +
    (company ? `Company: ${company}\n` : '') +
    (phone ? `Phone: ${phone}\n` : '') +
    `Email: ${email}\n` +
    `Subject: ${subject}\n` +
    (projectType ? `Project Type: ${projectType}\n` : '') +
    (budget ? `Budget: ${budget}\n` : '') +
    (timeline ? `Timeline: ${timeline}\n` : '') +
    `Message: ${message}`;
  ADMIN_USER_IDS.forEach(id => {
    bot.sendMessage(id, text).catch(e => {
      console.error(`Failed to send message to admin ${id}:`, e.message);
    });
  });
  res.json({ ok: true });
});

// GET /submissions - get all contact form submissions (simple, no auth)
app.get('/submissions', (req, res) => {
  let contacts = [];
  if (fs.existsSync(CONTACTS_FILE)) {
    contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  }
  res.json({ submissions: contacts });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Bot server listening on port ${PORT}`);
  if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set. Bot will not work.');
  }
  if (ADMIN_USER_IDS.length === 0) {
    console.warn('No ADMIN_USER_IDS set. No one will receive notifications.');
  }
});

// Simple /start command for admins
bot.onText(/\/start/, (msg) => {
  if (ADMIN_USER_IDS.includes(String(msg.from.id))) {
    bot.sendMessage(msg.chat.id, 'You are registered as an admin. You will receive contact requests.');
  } else {
    bot.sendMessage(msg.chat.id, 'You are not authorized to receive contact requests.');
  }
});
