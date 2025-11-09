const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
  async uploadVideo(config) {
    const { videoUrl, title, description, privacyStatus, youtubeCredentials, language } = config;

    try {
      console.log('🎬 Starting YouTube upload process...');

      // Parse YouTube credentials
      let credentials;
      try {
        credentials = JSON.parse(youtubeCredentials);
      } catch (e) {
        throw new Error('Invalid YouTube credentials format');
      }

      // Validate required credentials
      if (!credentials.client_id || !credentials.client_secret) {
        throw new Error('YouTube OAuth client_id and client_secret are required');
      }

      if (!credentials.access_token || !credentials.refresh_token) {
        throw new Error('YouTube OAuth access_token and refresh_token are required. Please complete OAuth authentication.');
      }

      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
      );

      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        token_type: 'Bearer',
        expiry_date: credentials.expiry_date
      });

      // Set up automatic token refresh
      oauth2Client.on('tokens', (tokens) => {
        console.log('🔄 OAuth tokens refreshed automatically');
        if (tokens.refresh_token) {
          console.log('📝 New refresh token received:', tokens.refresh_token.substring(0, 20) + '...');
        }
        if (tokens.access_token) {
          console.log('📝 New access token received:', tokens.access_token.substring(0, 20) + '...');
        }
      });

      console.log('✅ OAuth2 client configured');
      console.log('📋 Current credentials state:', {
        has_access_token: !!credentials.access_token,
        has_refresh_token: !!credentials.refresh_token,
        access_token_preview: credentials.access_token ? credentials.access_token.substring(0, 20) + '...' : 'none',
        refresh_token_preview: credentials.refresh_token ? credentials.refresh_token.substring(0, 20) + '...' : 'none'
      });
      
      // Try to refresh token if it might be expired
      try {
        console.log('🔄 Checking token validity and refreshing if needed...');
        const tokenInfo = await oauth2Client.getAccessToken();
        if (tokenInfo.token) {
          console.log('✅ Token is valid or has been refreshed');
          console.log('📝 Active token preview:', tokenInfo.token.substring(0, 20) + '...');
          
          // Update credentials with the refreshed token
          const currentCreds = oauth2Client.credentials;
          console.log('📋 OAuth2 client credentials after refresh:', {
            has_access_token: !!currentCreds.access_token,
            has_refresh_token: !!currentCreds.refresh_token,
            token_type: currentCreds.token_type,
            expiry_date: currentCreds.expiry_date ? new Date(currentCreds.expiry_date).toISOString() : 'none'
          });
        }
      } catch (tokenError) {
        console.error('⚠️ Token refresh failed:', tokenError.message);
        console.error('⚠️ Token error details:', {
          code: tokenError.code,
          status: tokenError.status,
          message: tokenError.message
        });
        throw new Error('YouTube OAuth tokens are invalid or expired. Please obtain new tokens from OAuth 2.0 Playground.');
      }

      // Download video file first
      console.log('📥 Downloading video from Creatomate...');
      const videoPath = await this.downloadVideo(videoUrl);
      const videoStats = fs.statSync(videoPath);
      console.log(`✅ Video downloaded: ${videoStats.size} bytes`);

      // Use Resumable Upload via Google API Client
      // The googleapis library handles resumable upload internally
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });

      console.log('📤 Starting resumable upload to YouTube...');
      console.log(`   Title: ${title}`);
      console.log(`   Privacy: ${privacyStatus || 'private'}`);
      console.log(`   Video file size: ${videoStats.size} bytes`);
      console.log(`   Video path: ${videoPath}`);

      // Double-check auth before upload
      console.log('🔐 Verifying authentication before upload...');
      const finalCreds = oauth2Client.credentials;
      console.log('📋 Final credentials check:', {
        has_access_token: !!finalCreds.access_token,
        has_refresh_token: !!finalCreds.refresh_token,
        token_type: finalCreds.token_type
      });

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title,
            description: description,
            categoryId: '22', // People & Blogs
            tags: ['AI Generated', 'Automated Video', 'AI'],
            defaultLanguage: language || 'ja',
            defaultAudioLanguage: language || 'ja'
          },
          status: {
            privacyStatus: privacyStatus || 'private',
            selfDeclaredMadeForKids: false,
            embeddable: true,
            publicStatsViewable: true
          }
        },
        media: {
          body: fs.createReadStream(videoPath),
          mimeType: 'video/mp4'
        }
      });

      // Clean up temporary file
      try {
        fs.unlinkSync(videoPath);
        console.log('🗑️ Temporary file cleaned up');
      } catch (e) {
        console.error('⚠️ Error deleting temp file:', e.message);
      }

      const videoId = response.data.id;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log(`✅ Video uploaded successfully!`);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   URL: ${youtubeUrl}`);
      
      return youtubeUrl;
    } catch (error) {
      console.error('❌ YouTube upload error:', error.message);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Full error object keys:', Object.keys(error));
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        errors: error.errors,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // Check if it's a googleapis error with more details
      if (error.response?.data) {
        console.error('❌ API response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Check error from googleapis
      if (error.errors && Array.isArray(error.errors)) {
        console.error('❌ Detailed errors:', error.errors);
      }
      
      // Enhanced error messages
      if (error.code === 401 || error.message.includes('invalid_grant')) {
        throw new Error('YouTube OAuth tokens are invalid or expired. Please obtain new tokens from OAuth 2.0 Playground.');
      }
      
      if (error.code === 403) {
        throw new Error('YouTube API access denied. Please ensure YouTube Data API v3 is enabled in Google Cloud Console.');
      }

      if (error.message.includes('unauthorized_client')) {
        throw new Error('OAuth client is not authorized. Please check client_id and client_secret, and ensure OAuth consent screen is properly configured.');
      }
      
      if (error.message.includes('authenticate') || error.message.includes('token')) {
        throw new Error('YouTube authentication failed. Please verify your OAuth credentials (client_id, client_secret, access_token, refresh_token).');
      }
      
      throw error;
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
