const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const videoGeneratorRoutes = require('./routes/videoGenerator');
const apiKeyRoutes = require('./routes/apiKeys');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve temporary files
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Make db available to routes
app.locals.db = db;

// Initialize database tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default_user',
      openai_key TEXT,
      elevenlabs_key TEXT,
      creatomate_key TEXT,
      creatomate_template_id TEXT,
      stability_ai_key TEXT,
      youtube_credentials TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating api_keys table:', err.message);
    } else {
      console.log('api_keys table ready');
      // Add new columns if they don't exist (for existing databases)
      db.run(`ALTER TABLE api_keys ADD COLUMN creatomate_template_id TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding creatomate_template_id column:', err.message);
        }
      });
      db.run(`ALTER TABLE api_keys ADD COLUMN stability_ai_key TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding stability_ai_key column:', err.message);
        }
      });
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS video_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default_user',
      theme TEXT NOT NULL,
      duration INTEGER NOT NULL,
      channel_name TEXT,
      privacy_status TEXT,
      content_type TEXT,
      status TEXT DEFAULT 'pending',
      progress TEXT,
      youtube_url TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating video_jobs table:', err.message);
    } else {
      console.log('video_jobs table ready');
      // Add new column if it doesn't exist
      db.run(`ALTER TABLE video_jobs ADD COLUMN content_type TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding content_type column:', err.message);
        }
      });
    }
  });
}

// Routes
app.use('/api/keys', apiKeyRoutes);
app.use('/api/video', videoGeneratorRoutes);
const diagnosticsRoutes = require('./routes/diagnostics');
app.use('/api/diagnostics', diagnosticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
