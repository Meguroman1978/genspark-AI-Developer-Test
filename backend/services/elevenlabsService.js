const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor() {
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    // Voice configurations organized by language and gender (including elderly voices)
    this.voices = {
      en: {
        female: {
          id: 'cgSgspJ2msm6clMCkdW9',
          name: 'English Female',
          description: 'Natural English female voice'
        },
        male: {
          id: 'pqHfZKP75CvOlQylNhV4',
          name: 'English Male',
          description: 'Natural English male voice'
        },
        female_old: {
          id: '0rEo3eAjssGDUCXHYENf',
          name: 'English Female (Elderly)',
          description: 'Natural English elderly female voice'
        },
        male_old: {
          id: 'Tw2LVqLUUWkxqrCfFOpw',
          name: 'English Male (Elderly)',
          description: 'Natural English elderly male voice'
        }
      },
      ja: {
        female: {
          id: 'KgETZ36CCLD1Cob4xpkv',
          name: 'Japanese Female',
          description: 'Natural Japanese female voice'
        },
        male: {
          id: 'cGbEKHsmg38m62yxIWFk',
          name: 'Japanese Male',
          description: 'Natural Japanese male voice'
        },
        female_old: {
          id: 'D9MdulIxfrCUUJcGNQon',
          name: 'Japanese Female (Elderly)',
          description: 'Natural Japanese elderly female voice'
        },
        male_old: {
          id: 'hKUnzqLzU3P9IVhYHREu',
          name: 'Japanese Male (Elderly)',
          description: 'Natural Japanese elderly male voice'
        }
      },
      zh: {
        female: {
          id: 'bhJUNIXWQQ94l8eI2VUf',
          name: 'Chinese Female',
          description: 'Natural Chinese female voice'
        },
        male: {
          id: 'WuLq5z7nEcrhppO0ZQJw',
          name: 'Chinese Male',
          description: 'Natural Chinese male voice'
        },
        female_old: {
          id: 'r3SDVYUIvcC4EweQtSj0',
          name: 'Chinese Female (Elderly)',
          description: 'Natural Chinese elderly female voice'
        },
        male_old: {
          id: 'auoHciLZJwKTwYUoRTYz',
          name: 'Chinese Male (Elderly)',
          description: 'Natural Chinese elderly male voice'
        }
      }
    };
    
    // Speed configurations
    this.speeds = {
      slow: { stability: 0.7, similarity_boost: 0.75, speaking_rate: 0.85 },
      normal: { stability: 0.5, similarity_boost: 0.8, speaking_rate: 1.0 },
      fast: { stability: 0.4, similarity_boost: 0.85, speaking_rate: 1.15 }
    };
    this.defaultSpeed = 'normal';
  }

  async generateAudio(text, apiKey, jobId = null, voiceType = null, speed = null, language = 'ja') {
    const logPrefix = jobId ? `[Job ${jobId}]` : '[ElevenLabs]';
    
    // Get language-specific voices
    const languageVoices = this.voices[language] || this.voices['ja'];
    
    // Use provided voice type or default to female
    const selectedVoiceType = voiceType || 'female';
    const voice = languageVoices[selectedVoiceType] || languageVoices['female'];
    
    // Use provided speed or default
    const selectedSpeed = speed || this.defaultSpeed;
    const speedSettings = this.speeds[selectedSpeed] || this.speeds[this.defaultSpeed];
    
    try {
      console.log(`${logPrefix} 🎙️ Generating audio with ElevenLabs...`);
      console.log(`${logPrefix} Text length: ${text.length} characters`);
      console.log(`${logPrefix} Language: ${language}`);
      console.log(`${logPrefix} Voice: ${voice.name} (${voice.description})`);
      console.log(`${logPrefix} Voice ID: ${voice.id}`);
      console.log(`${logPrefix} Speed: ${selectedSpeed} (rate: ${speedSettings.speaking_rate})`);

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
        `${this.baseUrl}/text-to-speech/${voice.id}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: speedSettings.stability,
            similarity_boost: speedSettings.similarity_boost,
            style: 0.0,
            use_speaker_boost: true,
            speaking_rate: speedSettings.speaking_rate
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
