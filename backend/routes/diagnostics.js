const express = require('express');
const router = express.Router();
const elevenlabsService = require('../services/elevenlabsService');
const axios = require('axios');

// Test ElevenLabs API
router.post('/test-elevenlabs', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    console.log('🧪 Testing ElevenLabs API...');

    // Test 1: List voices
    console.log('Test 1: Listing voices...');
    const voices = await elevenlabsService.listVoices(apiKey);
    
    if (voices.length === 0) {
      return res.json({
        success: false,
        test: 'list_voices',
        error: 'No voices returned. API key may be invalid.'
      });
    }

    console.log(`✅ Found ${voices.length} voices`);

    // Test 2: Generate short audio
    console.log('Test 2: Generating test audio...');
    const testText = 'This is a test of the ElevenLabs text-to-speech API.';
    
    try {
      const audioUrl = await elevenlabsService.generateAudio(testText, apiKey, 'TEST');
      
      return res.json({
        success: true,
        message: 'ElevenLabs API is working correctly',
        details: {
          voices_count: voices.length,
          test_audio_url: audioUrl,
          test_text_length: testText.length
        }
      });
    } catch (audioError) {
      return res.json({
        success: false,
        test: 'generate_audio',
        error: audioError.message,
        voices_available: voices.length
      });
    }
  } catch (error) {
    console.error('ElevenLabs test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Test Creatomate API
router.post('/test-creatomate', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    console.log('🧪 Testing Creatomate API...');

    // Test 1: List templates
    console.log('Test 1: Verifying API key...');
    const response = await axios.get('https://api.creatomate.com/v1/templates', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    console.log(`✅ API key valid. Found ${response.data.length} templates`);

    return res.json({
      success: true,
      message: 'Creatomate API is working correctly',
      details: {
        templates_count: response.data.length,
        templates: response.data.slice(0, 5).map(t => ({
          id: t.id,
          name: t.name
        }))
      }
    });
  } catch (error) {
    console.error('Creatomate test failed:', error);
    
    const errorDetail = {
      success: false,
      error: error.message
    };

    if (error.response) {
      errorDetail.status = error.response.status;
      errorDetail.details = error.response.data;
      
      if (error.response.status === 401) {
        errorDetail.user_message = 'Invalid API key. Please check your Creatomate API key.';
      } else if (error.response.status === 403) {
        errorDetail.user_message = 'Access forbidden. Your Creatomate account may not have permission.';
      }
    }

    return res.status(500).json(errorDetail);
  }
});

// Test OpenAI API
router.post('/test-openai', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    console.log('🧪 Testing OpenAI API...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: apiKey });

    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "API test successful" in exactly those words.' }
      ],
      max_tokens: 10
    });

    const result = response.choices[0].message.content;
    console.log('✅ OpenAI API working:', result);

    return res.json({
      success: true,
      message: 'OpenAI API is working correctly',
      details: {
        model: response.model,
        test_response: result
      }
    });
  } catch (error) {
    console.error('OpenAI test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

module.exports = router;
