/**
 * Background image configuration with automatic aspect ratio selection
 * 
 * New System:
 * - 2 themes: Mt. Fuji & Pagoda (Day / Sunset)
 * - Each theme has 2 versions: Horizontal (16:9) and Vertical (9:16)
 * - Auto-selects correct version based on videoFormat
 * 
 * Text Color Settings:
 * - All backgrounds use white text with black stroke for maximum readability
 */

const backgroundConfig = {
  // 1. Mt. Fuji & Pagoda - Daytime
  fuji_pagoda_day: {
    id: 'fuji_pagoda_day',
    filenameHorizontal: '横長_富士山と五重の塔_昼.png',
    filenameVertical: '縦長_富士山と五重の塔_昼.png',
    name: {
      ja: '🗻 富士山と五重の塔（昼）',
      en: 'Mt. Fuji & Pagoda (Day)'
    },
    description: 'Mt. Fuji with five-story pagoda and cherry blossoms in daytime',
    brightness: 'bright', // ~70%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 6
    }
  },

  // 2. Mt. Fuji & Pagoda - Sunset
  fuji_pagoda_sunset: {
    id: 'fuji_pagoda_sunset',
    filenameHorizontal: '横長_富士山と五重の塔_夕日.png',
    filenameVertical: '縦長_富士山と五重の塔_夕日.png',
    name: {
      ja: '🌅 富士山と五重の塔（夕日）',
      en: 'Mt. Fuji & Pagoda (Sunset)'
    },
    description: 'Mt. Fuji with five-story pagoda at sunset with warm colors',
    brightness: 'medium', // ~50%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 6
    }
  },

  // None option
  none: {
    id: 'none',
    filenameHorizontal: null,
    filenameVertical: null,
    name: {
      ja: 'なし（最初の画像を使用）',
      en: 'None (Use first frame)'
    },
    description: 'No title background, use first generated image',
    brightness: null,
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 6
    }
  }
};

/**
 * Get background configuration by ID and video format
 * @param {string} bgId - Background ID
 * @param {string} videoFormat - 'normal' (16:9) or 'shorts' (9:16)
 * @returns {object} Background configuration object with correct filename
 */
function getBackgroundConfig(bgId, videoFormat = 'normal') {
  const bg = backgroundConfig[bgId] || backgroundConfig.none;
  
  // Select appropriate filename based on video format
  const filename = videoFormat === 'shorts' 
    ? bg.filenameVertical 
    : bg.filenameHorizontal;
  
  return {
    ...bg,
    filename: filename
  };
}

/**
 * Get all selectable backgrounds (exclude 'none')
 * @returns {array} Array of background configurations
 */
function getAllBackgrounds() {
  return Object.values(backgroundConfig).filter(bg => bg.id !== 'none');
}

/**
 * Get dropdown options for frontend
 * @param {string} language - Language code ('ja' or 'en')
 * @returns {array} Array of {value, label} objects
 */
function getDropdownOptions(language = 'ja') {
  return Object.values(backgroundConfig).map(bg => ({
    value: bg.id,
    label: bg.name[language] || bg.name.ja,
    emoji: bg.name.ja.match(/[🗻🌅]/)?.[0] || '🖼️'
  }));
}

module.exports = {
  backgroundConfig,
  getBackgroundConfig,
  getAllBackgrounds,
  getDropdownOptions
};
