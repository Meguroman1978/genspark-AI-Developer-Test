const express = require('express');
const router = express.Router();
const axios = require('axios');
const { google } = require('googleapis');

// Diagnose all APIs
router.post('/diagnose', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.body.userId || 'default_user';

  // Get API keys
  db.get(
    'SELECT openai_key, elevenlabs_key, creatomate_key, stability_ai_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId],
    async (err, keys) => {
      if (err || !keys) {
        return res.status(400).json({ error: 'No API keys found' });
      }

      const results = {};

      // Test OpenAI
      if (keys.openai_key) {
        results.openai = await testOpenAI(keys.openai_key);
      } else {
        results.openai = { status: 'not_configured', message: 'API key not set' };
      }

      // Test ElevenLabs
      if (keys.elevenlabs_key) {
        results.elevenlabs = await testElevenLabs(keys.elevenlabs_key);
      } else {
        results.elevenlabs = { status: 'not_configured', message: 'API key not set' };
      }

      // Test Creatomate
      if (keys.creatomate_key) {
        results.creatomate = await testCreatomate(keys.creatomate_key);
      } else {
        results.creatomate = { status: 'not_configured', message: 'API key not set' };
      }

      // Test Stability AI
      if (keys.stability_ai_key) {
        results.stability_ai = await testStabilityAI(keys.stability_ai_key);
      } else {
        results.stability_ai = { status: 'not_configured', message: 'API key not set' };
      }

      // Test YouTube
      if (keys.youtube_credentials) {
        results.youtube = await testYouTube(keys.youtube_credentials);
      } else {
        results.youtube = { status: 'not_configured', message: 'Credentials not set' };
      }

      res.json(results);
    }
  );
});

async function testOpenAI(apiKey) {
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: 'API key is valid',
      details: `${response.data.data.length} models available`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid API key' : error.message,
      code: error.response?.status
    };
  }
}

async function testElevenLabs(apiKey) {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: 'API key is valid',
      details: `${response.data.voices.length} voices available`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid API key' : error.message,
      code: error.response?.status
    };
  }
}

async function testCreatomate(apiKey) {
  try {
    const response = await axios.get('https://api.creatomate.com/v1/templates', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: 'API key is valid',
      details: `${response.data.length} templates available`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid API key' : error.message,
      code: error.response?.status
    };
  }
}

async function testStabilityAI(apiKey) {
  try {
    // Test with account endpoint
    const response = await axios.get('https://api.stability.ai/v1/user/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: 'API key is valid',
      details: `Account verified`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid API key' : error.message,
      code: error.response?.status
    };
  }
}

async function testYouTube(credentials) {
  try {
    const creds = JSON.parse(credentials);
    
    if (!creds.client_id || !creds.client_secret) {
      return {
        status: 'error',
        message: 'Missing client_id or client_secret'
      };
    }

    if (!creds.access_token || !creds.refresh_token) {
      return {
        status: 'warning',
        message: 'OAuth tokens not found. Please complete OAuth flow.'
      };
    }

    // Try to verify with YouTube API
    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      creds.redirect_uri
    );

    oauth2Client.setCredentials({
      access_token: creds.access_token,
      refresh_token: creds.refresh_token
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });

    return {
      status: 'success',
      message: 'YouTube authentication is valid',
      details: 'Connected to YouTube account'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message.includes('authenticate') ? 'OAuth tokens expired or invalid' : error.message,
      code: error.code
    };
  }
}

module.exports = router;
