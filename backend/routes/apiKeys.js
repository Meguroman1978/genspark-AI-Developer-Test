const express = require('express');
const router = express.Router();

// Get API keys for user
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.query.userId || 'default_user';

  db.get(
    'SELECT openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error fetching API keys:', err);
        return res.status(500).json({ error: 'Failed to fetch API keys' });
      }

      if (!row) {
        return res.json({
          openai_key: '',
          elevenlabs_key: '',
          creatomate_key: '',
          creatomate_template_id: '',
          creatomate_public_token: '',
          stability_ai_key: '',
          youtube_credentials: ''
        });
      }

      // Mask keys for security (show only last 4 characters)
      const maskKey = (key) => {
        if (!key) return '';
        if (key.length <= 4) return key;
        return '•'.repeat(key.length - 4) + key.slice(-4);
      };

      res.json({
        openai_key: maskKey(row.openai_key),
        elevenlabs_key: maskKey(row.elevenlabs_key),
        creatomate_key: maskKey(row.creatomate_key),
        creatomate_template_id: row.creatomate_template_id || '',
        creatomate_public_token: maskKey(row.creatomate_public_token),
        stability_ai_key: maskKey(row.stability_ai_key),
        youtube_credentials: row.youtube_credentials ? 'Configured' : ''
      });
    }
  );
});

// Save or update API keys
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.body.userId || 'default_user';
  const { openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials } = req.body;

  // Check if user already has keys
  db.get(
    'SELECT id FROM api_keys WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error checking API keys:', err);
        return res.status(500).json({ error: 'Failed to save API keys' });
      }

      const now = new Date().toISOString();

      if (row) {
        // Update existing keys
        db.run(
          `UPDATE api_keys SET 
            openai_key = COALESCE(?, openai_key),
            elevenlabs_key = COALESCE(?, elevenlabs_key),
            creatomate_key = COALESCE(?, creatomate_key),
            creatomate_template_id = COALESCE(?, creatomate_template_id),
            creatomate_public_token = COALESCE(?, creatomate_public_token),
            stability_ai_key = COALESCE(?, stability_ai_key),
            youtube_credentials = COALESCE(?, youtube_credentials),
            updated_at = ?
          WHERE user_id = ?`,
          [openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials, now, userId],
          (err) => {
            if (err) {
              console.error('Error updating API keys:', err);
              return res.status(500).json({ error: 'Failed to update API keys' });
            }
            res.json({ message: 'API keys updated successfully' });
          }
        );
      } else {
        // Insert new keys
        db.run(
          `INSERT INTO api_keys (user_id, openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials, now, now],
          (err) => {
            if (err) {
              console.error('Error inserting API keys:', err);
              return res.status(500).json({ error: 'Failed to save API keys' });
            }
            res.json({ message: 'API keys saved successfully' });
          }
        );
      }
    }
  );
});

// Get actual API keys (for internal use by video generator)
router.get('/actual', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.query.userId || 'default_user';

  db.get(
    'SELECT openai_key, elevenlabs_key, creatomate_key, creatomate_template_id, creatomate_public_token, stability_ai_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error fetching actual API keys:', err);
        return res.status(500).json({ error: 'Failed to fetch API keys' });
      }

      if (!row) {
        return res.status(404).json({ error: 'No API keys found. Please configure them first.' });
      }

      res.json({
        openai_key: row.openai_key,
        elevenlabs_key: row.elevenlabs_key,
        creatomate_key: row.creatomate_key,
        creatomate_template_id: row.creatomate_template_id,
        creatomate_public_token: row.creatomate_public_token,
        stability_ai_key: row.stability_ai_key,
        youtube_credentials: row.youtube_credentials
      });
    }
  );
});

module.exports = router;
