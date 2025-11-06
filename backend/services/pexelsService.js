const axios = require('axios');

class PexelsService {
  constructor() {
    this.baseUrl = 'https://api.pexels.com/videos';
    // Pexels provides a free API key for development
    // Users should get their own from https://www.pexels.com/api/
    this.apiKey = 'YOUR_PEXELS_API_KEY'; // This can be optional
  }

  async searchVideos(query, perPage = 3) {
    try {
      // If no API key, return empty (will fallback to images)
      if (!this.apiKey || this.apiKey === 'YOUR_PEXELS_API_KEY') {
        console.log('Pexels API key not configured, skipping video search');
        return [];
      }

      console.log(`Searching Pexels for: ${query}`);

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: query,
          per_page: perPage,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      if (response.data.videos && response.data.videos.length > 0) {
        return response.data.videos.map(video => {
          // Get the HD or SD video file
          const videoFile = video.video_files.find(f => 
            f.quality === 'hd' || f.quality === 'sd'
          ) || video.video_files[0];

          return {
            url: videoFile.link,
            width: videoFile.width,
            height: videoFile.height,
            duration: video.duration,
            thumbnail: video.image
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Pexels search error:', error.message);
      return [];
    }
  }

  async searchPhotos(query, perPage = 3) {
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_PEXELS_API_KEY') {
        return [];
      }

      const response = await axios.get('https://api.pexels.com/v1/search', {
        params: {
          query: query,
          per_page: perPage,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      if (response.data.photos && response.data.photos.length > 0) {
        return response.data.photos.map(photo => ({
          url: photo.src.large2x || photo.src.large,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer
        }));
      }

      return [];
    } catch (error) {
      console.error('Pexels photo search error:', error.message);
      return [];
    }
  }
}

module.exports = new PexelsService();
