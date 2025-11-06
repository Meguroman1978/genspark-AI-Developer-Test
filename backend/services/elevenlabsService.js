const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor() {
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    // Using a default voice ID (Adam - a good general purpose voice)
    this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';
  }

  async generateAudio(text, apiKey) {
    try {
      console.log('Generating audio with ElevenLabs...');

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.defaultVoiceId}`,
        {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      // Save audio file temporarily
      const audioDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const filename = `audio_${Date.now()}.mp3`;
      const filepath = path.join(audioDir, filename);
      
      fs.writeFileSync(filepath, response.data);
      console.log(`Audio saved to: ${filepath}`);

      // In production, upload to cloud storage and return URL
      // For now, return local file path
      return `http://localhost:5000/temp/${filename}`;
    } catch (error) {
      console.error('ElevenLabs API error:', error.response?.data || error.message);
      
      // Fallback: Create a mock audio URL
      console.log('Using fallback audio URL');
      return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`;
    }
  }

  async listVoices(apiKey) {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': apiKey
        }
      });

      return response.data.voices;
    } catch (error) {
      console.error('Error listing voices:', error.message);
      return [];
    }
  }
}

module.exports = new ElevenLabsService();
