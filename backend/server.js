const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const videoGeneratorRoutes = require('./routes/videoGenerator');
const apiKeyRoutes = require('./routes/apiKeys');
const apiDiagnosticsRoutes = require('./routes/apiDiagnostics');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-detect public URL for sandbox environment
// Priority: PUBLIC_URL > AUTO_DETECTED > localhost
if (!process.env.PUBLIC_URL) {
  // Try to detect if we're in a sandbox environment
  // This pattern matches common sandbox URL formats
  const hostname = require('os').hostname();
  
  // Check if we have sandbox-specific environment variables
  if (process.env.SANDBOX_ID || hostname.includes('sandbox')) {
    console.log('🔍 Sandbox environment detected, attempting to auto-detect public URL...');
    // We'll set this dynamically when we know the actual host
    // For now, we'll use a placeholder and handle it in the service
  } else {
    console.log('💻 Local development environment detected');
    process.env.PUBLIC_URL = `http://localhost:${PORT}`;
  }
}

if (process.env.PUBLIC_URL) {
  console.log(`🌐 Public URL set to: ${process.env.PUBLIC_URL}`);
} else {
  console.log(`⚠️  No PUBLIC_URL configured. Audio files may not be accessible to Creatomate.`);
  console.log(`   Set PUBLIC_URL environment variable to your server's public URL.`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve temporary files with proper CORS headers
// Note: temp directory is at project root, not in backend folder
app.use('/temp', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, '..', 'temp')));

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
      creatomate_public_token TEXT,
      stability_ai_key TEXT,
      shotstack_key TEXT,
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
      db.run(`ALTER TABLE api_keys ADD COLUMN creatomate_public_token TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding creatomate_public_token column:', err.message);
        }
      });
      db.run(`ALTER TABLE api_keys ADD COLUMN shotstack_key TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding shotstack_key column:', err.message);
        }
      });
      db.run(`ALTER TABLE api_keys ADD COLUMN youtube_redirect_uri TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding youtube_redirect_uri column:', err.message);
        }
      });
      db.run(`ALTER TABLE api_keys ADD COLUMN fal_ai_key TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding fal_ai_key column:', err.message);
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
      language TEXT DEFAULT 'ja',
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
      // Add new columns if they don't exist
      db.run(`ALTER TABLE video_jobs ADD COLUMN content_type TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding content_type column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN language TEXT DEFAULT 'ja'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding language column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN video_url TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding video_url column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN script_text TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding script_text column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN audio_url TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding audio_url column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN image_urls TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding image_urls column:', err.message);
        }
      });
      db.run(`ALTER TABLE video_jobs ADD COLUMN pexels_urls TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding pexels_urls column:', err.message);
        }
      });
    }
  });
}

// Routes
app.use('/api/keys', apiKeyRoutes);
app.use('/api/video', videoGeneratorRoutes);
app.use('/api/diagnostics', apiDiagnosticsRoutes);

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
