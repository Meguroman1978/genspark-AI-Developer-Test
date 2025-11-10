const axios = require('axios');
const OpenAI = require('openai');

class SearchService {
  constructor() {
    // User agents for spoofing
    this.userAgents = [
      // Modern Chrome on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Modern Firefox on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      // Googlebot (many sites allow this)
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      // Safari on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
  }

  async searchInformation(query, openaiKey) {
    try {
      console.log(`Searching information for: ${query}`);
      
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
      console.log(`Searching Wikipedia for: ${query}`);
      
      // Use a random user agent
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      
      // Wikipedia API search
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      const searchResponse = await axios.get(searchUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (searchResponse.data.query.search.length === 0) {
        console.log('Wikipedia: No results found');
        return null;
      }

      // Get the first result's page content
      const pageId = searchResponse.data.query.search[0].pageid;
      const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
      const contentResponse = await axios.get(contentUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json'
        }
      });

      const page = contentResponse.data.query.pages[pageId];
      console.log('Wikipedia: Content retrieved successfully');
      return page.extract || null;
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      return null;
    }
  }

  async searchWeb(query, openaiKey) {
    try {
      console.log(`Searching web information for: ${query}`);
      
      // Use OpenAI to generate contextual information
      // Filter out price-related content
      const openai = new OpenAI({ apiKey: openaiKey });

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable research assistant. Provide accurate, factual information about the given topic. Do NOT include any pricing information, cost details, or product prices. Focus on educational and informational content only.'
          },
          {
            role: 'user',
            content: `Provide key factual information, interesting facts, and important details about: ${query}. Focus on verified information that would be useful for creating educational content. Exclude any pricing, cost, or monetary information.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      console.log('Web search: Information generated successfully');
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Web search error:', error.message);
      return null;
    }
  }

  async crawlPageWithBrowser(url) {
    let browser = null;
    try {
      console.log(`Attempting to crawl page: ${url}`);
      
      // Try to use playwright if available
      const { chromium } = require('playwright-core');
      
      // Launch browser with stealth settings
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });

      // Create context with realistic settings
      const context = await browser.newContext({
        userAgent: this.userAgents[0], // Use Chrome user agent
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: []
      });

      const page = await context.newPage();
      
      // Set additional headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Navigate to page
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract text content
      const content = await page.evaluate(() => {
        // Remove script and style tags
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());
        
        // Get main content
        const body = document.body;
        return body ? body.innerText : '';
      });

      await browser.close();
      console.log('Page crawled successfully with browser');
      
      return content;
    } catch (error) {
      console.error('Browser crawl error:', error.message);
      if (browser) {
        await browser.close().catch(() => {});
      }
      return null;
    }
  }

  async fetchPageWithAxios(url) {
    try {
      console.log(`Fetching page with Axios: ${url}`);
      
      // Use a random user agent to avoid detection
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        maxRedirects: 5
      });

      console.log('Page fetched successfully with Axios');
      return response.data;
    } catch (error) {
      console.error('Axios fetch error:', error.message);
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
