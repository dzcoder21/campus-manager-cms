const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const methodOverride = require('method-override');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const { resolveOpenAiApiKey } = require('./utils/openAiKeyResolver');
require('dotenv').config();

function logAssistantConfigStatus() {
  const key = resolveOpenAiApiKey();
  const hasEncrypted = Boolean((process.env.OPENAI_API_KEY_ENC || '').trim() || process.env.OPENAI_KEY_ENC_SECRET);
  const hasSecret = Boolean((process.env.OPENAI_KEY_ENC_SECRET || '').trim());
  const model = (process.env.OPENAI_MODEL || '').trim() || 'gpt-4o-mini';

  if (!key) {
    console.warn('[Assistant] OpenAI key is not configured. Assistant API will return a configuration message.');
    console.warn('[Assistant] Use OPENAI_API_KEY or OPENAI_API_KEY_ENC + OPENAI_KEY_ENC_SECRET.');
    return;
  }

  const masked = key.length > 8 ? `${key.slice(0, 6)}...${key.slice(-4)}` : 'configured';
  if (hasEncrypted && hasSecret) {
    console.log(`[Assistant] Encrypted OpenAI key detected (${masked})`);
  } else {
    console.log(`[Assistant] OPENAI_API_KEY detected (${masked})`);
  }
  console.log(`[Assistant] OPENAI_MODEL: ${model}`);
}

logAssistantConfigStatus();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/main');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Sessions and flash messages (for form feedback)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'university-cms-secret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-cms', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const routes = require('./routes');
app.use('/', routes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
