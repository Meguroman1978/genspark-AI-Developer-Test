/**
 * Background image configuration with text color settings
 * Each background has been analyzed for brightness to determine optimal text color
 * 
 * Brightness analysis:
 * - Dark backgrounds (0-40% brightness): White text with black stroke
 * - Medium backgrounds (40-70% brightness): White text with strong black stroke
 * - Bright backgrounds (70-100% brightness): Black text with white stroke
 */

const backgroundConfig = {
  // 1. Lantern Street - Dark scene with red lanterns
  bg1_lantern_street: {
    id: 'bg1_lantern_street',
    filename: 'bg1_lantern_street.png',
    name: {
      ja: '🏮 提灯の路地',
      en: 'Lantern Street'
    },
    description: 'Traditional Japanese street with red lanterns',
    brightness: 'dark', // ~30%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4
    }
  },

  // 2. Castle with Cherry Blossoms - Bright with pink and white
  bg2_castle_sakura: {
    id: 'bg2_castle_sakura',
    filename: 'bg2_castle_sakura.png',
    name: {
      ja: '🏯 桜と城',
      en: 'Castle & Cherry Blossoms'
    },
    description: 'Japanese castle surrounded by cherry blossoms',
    brightness: 'bright', // ~70%
    textColor: {
      fillColor: '#2c3e50',
      strokeColor: '#ffffff',
      strokeWidth: 4
    }
  },

  // 3. Winter Village - Medium-dark blue tone
  bg3_winter_village: {
    id: 'bg3_winter_village',
    filename: 'bg3_winter_village.png',
    name: {
      ja: '❄️ 雪の集落',
      en: 'Winter Village'
    },
    description: 'Snowy Japanese village at night',
    brightness: 'medium-dark', // ~40%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#1a237e',
      strokeWidth: 5
    }
  },

  // 4. Festival Fireworks - Dark night with colorful fireworks
  bg4_festival_fireworks: {
    id: 'bg4_festival_fireworks',
    filename: 'bg4_festival_fireworks.png',
    name: {
      ja: '🎆 祭りの花火',
      en: 'Festival Fireworks'
    },
    description: 'Night festival with fireworks and cherry blossoms',
    brightness: 'dark', // ~25%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4
    }
  },

  // 5. Rice Field with Mt. Fuji - Bright daytime scene
  bg5_rice_field_fuji: {
    id: 'bg5_rice_field_fuji',
    filename: 'bg5_rice_field_fuji.png',
    name: {
      ja: '🗻 田園と富士山',
      en: 'Rice Fields & Mt. Fuji'
    },
    description: 'Green rice paddies with Mt. Fuji backdrop',
    brightness: 'bright', // ~75%
    textColor: {
      fillColor: '#1a237e',
      strokeColor: '#ffffff',
      strokeWidth: 4
    }
  },

  // 6. Sunset Pagoda - Warm sunset colors
  bg6_sunset_pagoda: {
    id: 'bg6_sunset_pagoda',
    filename: 'bg6_sunset_pagoda.png',
    name: {
      ja: '🌅 夕焼けの塔',
      en: 'Sunset Pagoda'
    },
    description: 'Five-story pagoda at sunset with Mt. Fuji',
    brightness: 'medium', // ~55%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#4a148c',
      strokeWidth: 5
    }
  },

  // 7. Cherry Blossom Temple - Pink and bright
  bg7_cherry_temple: {
    id: 'bg7_cherry_temple',
    filename: 'bg7_cherry_temple.png',
    name: {
      ja: '🌸 桜の寺院',
      en: 'Cherry Temple'
    },
    description: 'Red temple with cherry blossoms and Mt. Fuji',
    brightness: 'bright', // ~65%
    textColor: {
      fillColor: '#880e4f',
      strokeColor: '#ffffff',
      strokeWidth: 4
    }
  },

  // 8. Sakura Path - Pink and bright
  bg8_sakura_path: {
    id: 'bg8_sakura_path',
    filename: 'bg8_sakura_path.png',
    name: {
      ja: '🌸 桜並木',
      en: 'Cherry Blossom Path'
    },
    description: 'Path lined with cherry blossom trees',
    brightness: 'bright', // ~70%
    textColor: {
      fillColor: '#4a148c',
      strokeColor: '#ffffff',
      strokeWidth: 4
    }
  },

  // 9. Bamboo Forest - Green and medium brightness
  bg9_bamboo_forest: {
    id: 'bg9_bamboo_forest',
    filename: 'bg9_bamboo_forest.png',
    name: {
      ja: '🎋 竹林の道',
      en: 'Bamboo Forest'
    },
    description: 'Serene bamboo forest path',
    brightness: 'medium', // ~50%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#1b5e20',
      strokeWidth: 5
    }
  },

  // 10. Shibuya in Rain - Dark urban scene
  bg10_shibuya_rain: {
    id: 'bg10_shibuya_rain',
    filename: 'bg10_shibuya_rain.png',
    name: {
      ja: '🌧️ 雨の渋谷',
      en: 'Rainy Shibuya'
    },
    description: 'Rainy Shibuya crossing at night',
    brightness: 'dark', // ~35%
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4
    }
  },

  // Legacy option (keep for backward compatibility)
  cherry_blossom: {
    id: 'cherry_blossom',
    filename: 'title_bg.jpg',
    name: {
      ja: '🌸 桜の窓辺（旧）',
      en: 'Cherry Window (Legacy)'
    },
    description: 'Cherry blossoms by window (original)',
    brightness: 'medium',
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4
    }
  },

  // None option
  none: {
    id: 'none',
    filename: null,
    name: {
      ja: 'なし（最初の画像を使用）',
      en: 'None (Use first frame)'
    },
    description: 'No title background, use first generated image',
    brightness: null,
    textColor: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4
    }
  }
};

/**
 * Get background configuration by ID
 * @param {string} bgId - Background ID
 * @returns {object} Background configuration object
 */
function getBackgroundConfig(bgId) {
  return backgroundConfig[bgId] || backgroundConfig.none;
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
    emoji: bg.name.ja.match(/[🏮🏯❄️🎆🗻🌅🌸🎋🌧️]/)?.[0] || '🖼️'
  }));
}

module.exports = {
  backgroundConfig,
  getBackgroundConfig,
  getAllBackgrounds,
  getDropdownOptions
};
