const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor() {
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    // Using a default voice ID (Adam - a good general purpose voice)
    this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';
  }

  async generateAudio(text, apiKey, jobId = null) {
    const logPrefix = jobId ? `[Job ${jobId}]` : '[ElevenLabs]';
    
    try {
      console.log(`${logPrefix} 🎙️ Generating audio with ElevenLabs...`);
      console.log(`${logPrefix} Text length: ${text.length} characters`);
      console.log(`${logPrefix} Voice ID: ${this.defaultVoiceId}`);

      // First, verify API key
      try {
        console.log(`${logPrefix} Verifying API key...`);
        const voicesResponse = await axios.get(`${this.baseUrl}/voices`, {
          headers: {
            'xi-api-key': apiKey
          },
          timeout: 10000
        });
        console.log(`${logPrefix} ✅ API key verified. Available voices: ${voicesResponse.data.voices.length}`);
      } catch (verifyError) {
        const errorDetail = this.parseError(verifyError);
        console.error(`${logPrefix} ❌ API key verification failed:`, errorDetail);
        throw new Error(`ElevenLabs API key verification failed: ${errorDetail.message}`);
      }

      // Generate audio
      console.log(`${logPrefix} Sending TTS request...`);
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.defaultVoiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
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

      console.log(`${logPrefix} ✅ Audio generated successfully`);
      console.log(`${logPrefix} Response size: ${response.data.byteLength} bytes`);

      // Save audio file
      const audioDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const filename = `audio_${Date.now()}.mp3`;
      const filepath = path.join(audioDir, filename);
      
      fs.writeFileSync(filepath, response.data);
      console.log(`${logPrefix} 💾 Audio saved to: ${filepath}`);

      // Build public audio URL
      const audioUrl = this.getPublicAudioUrl(filename);
      console.log(`${logPrefix} 🔗 Audio URL: ${audioUrl}`);
      
      return audioUrl;
    } catch (error) {
      const errorDetail = this.parseError(error);
      console.error(`${logPrefix} ❌ ElevenLabs API error:`, errorDetail);
      
      throw new Error(`ElevenLabs API failed: ${errorDetail.message} (Code: ${errorDetail.code})`);
    }
  }

  parseError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      let message = 'Unknown error';
      
      if (Buffer.isBuffer(data)) {
        try {
          const jsonData = JSON.parse(data.toString());
          message = jsonData.detail?.message || jsonData.detail?.status || JSON.stringify(jsonData);
        } catch (e) {
          message = data.toString().substring(0, 200);
        }
      } else if (typeof data === 'object') {
        message = data.detail?.message || data.detail?.status || JSON.stringify(data);
      } else {
        message = String(data);
      }

      switch (status) {
        case 401:
          return { code: 401, message: 'Invalid API key. Please check your ElevenLabs API key.' };
        case 403:
          return { code: 403, message: 'Access forbidden. Model may not be available on your plan.' };
        case 429:
          return { code: 429, message: 'Rate limit exceeded. Please wait and try again.' };
        case 422:
          return { code: 422, message: 'Invalid request. Text may be too long or contain unsupported characters.' };
        case 500:
        case 502:
        case 503:
          return { code: status, message: 'ElevenLabs service temporarily unavailable.' };
        default:
          return { code: status, message: `ElevenLabs API error (${status}): ${message}` };
      }
    } else if (error.request) {
      return { code: 'NETWORK_ERROR', message: 'Network error: Could not connect to ElevenLabs API.' };
    } else {
      return { code: 'UNKNOWN_ERROR', message: error.message || 'Unknown error occurred' };
    }
  }

  getPublicAudioUrl(filename) {
    // CRITICAL: Use sandbox public URL for Creatomate to access audio files
    // Creatomate CANNOT access localhost URLs
    const publicUrl = 'https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai';
    return `${publicUrl}/temp/${filename}`;
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
