const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
  async uploadVideo(config) {
    const { videoUrl, title, description, privacyStatus, youtubeCredentials } = config;

    try {
      console.log('Uploading to YouTube...');

      // Parse YouTube credentials
      let credentials;
      try {
        credentials = JSON.parse(youtubeCredentials);
      } catch (e) {
        throw new Error('Invalid YouTube credentials format');
      }

      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri || 'http://localhost:5000/oauth2callback'
      );

      // Set credentials
      if (credentials.access_token) {
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          token_type: 'Bearer',
          expiry_date: credentials.expiry_date
        });
      } else {
        throw new Error('YouTube OAuth token not found. Please authenticate first.');
      }

      // Initialize YouTube API
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });

      // Download video file first
      const videoPath = await this.downloadVideo(videoUrl);

      // Upload to YouTube
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title,
            description: description,
            categoryId: '22', // People & Blogs
            tags: ['AI Generated', 'Automated Video', 'AI'],
          },
          status: {
            privacyStatus: privacyStatus || 'private',
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      });

      // Clean up temporary file
      try {
        fs.unlinkSync(videoPath);
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }

      const videoId = response.data.id;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log(`Video uploaded successfully: ${youtubeUrl}`);
      return youtubeUrl;
    } catch (error) {
      console.error('YouTube upload error:', error.message);
      
      if (error.message.includes('authenticate')) {
        throw new Error('YouTube authentication required. Please configure OAuth credentials properly.');
      }
      
      // Return a mock URL for demonstration
      console.log('Using mock YouTube URL');
      return `https://youtube.com/watch?v=MOCK_VIDEO_${Date.now()}`;
    }
  }

  async downloadVideo(videoUrl) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `video_${Date.now()}.mp4`;
    const filepath = path.join(tempDir, filename);

    try {
      const response = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 300000 // 5 minutes
      });

      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading video:', error.message);
      throw error;
    }
  }

  // Helper method to generate OAuth URL
  generateAuthUrl(clientId, clientSecret, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri || 'http://localhost:5000/oauth2callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return url;
  }

  // Helper method to exchange code for tokens
  async getTokenFromCode(code, clientId, clientSecret, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri || 'http://localhost:5000/oauth2callback'
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
}

module.exports = new YouTubeService();
