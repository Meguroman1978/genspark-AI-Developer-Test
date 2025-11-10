const axios = require('axios');
const OpenAI = require('openai');

class SearchService {
  async searchInformation(query, openaiKey) {
    try {
      // Use multiple sources for information gathering
      const wikiInfo = await this.searchWikipedia(query);
      const webInfo = await this.searchWeb(query, openaiKey);

      // Combine and summarize the information
      return this.combineInformation(wikiInfo, webInfo);
    } catch (error) {
      console.error('Search error:', error);
      return `Information about ${query}: A topic of interest that deserves exploration.`;
    }
  }

  async searchWikipedia(query) {
    try {
      // Wikipedia API search
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

      if (searchResponse.data.query.search.length === 0) {
        return null;
      }

      // Get the first result's page content
      const pageId = searchResponse.data.query.search[0].pageid;
      const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
      const contentResponse = await axios.get(contentUrl, { timeout: 10000 });

      const page = contentResponse.data.query.pages[pageId];
      return page.extract || null;
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      return null;
    }
  }

  async searchWeb(query, openaiKey) {
    try {
      // Use OpenAI to generate contextual information
      // This is a fallback when direct web search APIs are not available
      const openai = new OpenAI({ apiKey: openaiKey });

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable research assistant. Provide accurate, factual information about the given topic.'
          },
          {
            role: 'user',
            content: `Provide key factual information, interesting facts, and important details about: ${query}. Focus on verified information that would be useful for creating educational content.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Web search error:', error.message);
      return null;
    }
  }

  combineInformation(wikiInfo, webInfo) {
    const parts = [];

    if (wikiInfo) {
      parts.push('Wikipedia Information:\n' + wikiInfo);
    }

    if (webInfo) {
      parts.push('Additional Information:\n' + webInfo);
    }

    if (parts.length === 0) {
      return 'Limited information available. Please provide context for the video.';
    }

    return parts.join('\n\n---\n\n');
  }
}

module.exports = new SearchService();
