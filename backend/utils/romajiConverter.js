/**
 * Simple Japanese to Romaji converter
 * Converts hiragana, katakana, and some common kanji to romaji
 */

// Hiragana to Romaji mapping
const hiraganaToRomaji = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',
  // Small characters
  'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo',
  'っ': '', // Small tsu (handled separately)
  'ー': '-'
};

// Katakana to Romaji mapping
const katakanaToRomaji = {
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
  'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
  // Small characters
  'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo',
  'ッ': '', // Small tsu (handled separately)
  'ー': '-'
};

// Common kanji to reading mapping (basic examples)
const kanjiToReading = {
  '東京': 'tokyo',
  '富士山': 'fujisan',
  '日本': 'nihon',
  '大阪': 'osaka',
  '京都': 'kyoto',
  '北海道': 'hokkaido',
  '沖縄': 'okinawa',
  '横浜': 'yokohama',
  '名古屋': 'nagoya',
  '神戸': 'kobe',
  '福岡': 'fukuoka',
  '札幌': 'sapporo',
  '奈良': 'nara',
  '鎌倉': 'kamakura',
  '広島': 'hiroshima',
  '長崎': 'nagasaki',
  '桜': 'sakura',
  '富士': 'fuji',
  '山': 'yama',
  '川': 'kawa',
  '海': 'umi',
  '空': 'sora',
  '花': 'hana',
  '春': 'haru',
  '夏': 'natsu',
  '秋': 'aki',
  '冬': 'fuyu',
  '朝': 'asa',
  '昼': 'hiru',
  '夜': 'yoru',
  '月': 'tsuki',
  '星': 'hoshi',
  '雪': 'yuki',
  '雨': 'ame',
  '風': 'kaze',
  '水': 'mizu',
  '火': 'hi',
  '木': 'ki',
  '金': 'kin',
  '土': 'tsuchi',
  '人': 'hito',
  '子': 'ko',
  '女': 'onna',
  '男': 'otoko',
  '心': 'kokoro',
  '愛': 'ai',
  '夢': 'yume',
  '光': 'hikari',
  '音': 'oto',
  '色': 'iro',
  '白': 'shiro',
  '黒': 'kuro',
  '赤': 'aka',
  '青': 'ao',
  '緑': 'midori',
  '本': 'hon',
  '道': 'michi',
  '家': 'ie',
  '車': 'kuruma',
  '電車': 'densha',
  '新幹線': 'shinkansen',
  '駅': 'eki',
  '空港': 'kuuko',
  '学校': 'gakkou',
  '会社': 'kaisha',
  '病院': 'byouin',
  '公園': 'kouen',
  '図書館': 'toshokan',
  '美術館': 'bijutsukan',
  '博物館': 'hakubutsukan',
  '寺': 'tera',
  '神社': 'jinja',
  '城': 'shiro',
  '塔': 'tou',
  '橋': 'hashi',
  '港': 'minato',
  '島': 'shima',
  '湖': 'mizuumi',
  '森': 'mori',
  '林': 'hayashi',
  '田': 'ta',
  '畑': 'hatake',
  '村': 'mura',
  '町': 'machi',
  '市': 'shi',
  '区': 'ku',
  '県': 'ken',
  '国': 'kuni',
  '世界': 'sekai',
  '地球': 'chikyuu',
  '宇宙': 'uchuu',
  '時間': 'jikan',
  '場所': 'basho',
  '物': 'mono',
  '事': 'koto',
  '言葉': 'kotoba',
  '話': 'hanashi',
  '声': 'koe',
  '目': 'me',
  '耳': 'mimi',
  '口': 'kuchi',
  '手': 'te',
  '足': 'ashi',
  '頭': 'atama',
  '体': 'karada',
  '命': 'inochi',
  '力': 'chikara',
  '平和': 'heiwa',
  '自由': 'jiyuu',
  '希望': 'kibou',
  '幸せ': 'shiawase',
  '未来': 'mirai',
  '過去': 'kako',
  '現在': 'genzai',
  '今': 'ima',
  '明日': 'ashita',
  '昨日': 'kinou',
  '今日': 'kyou'
};

/**
 * Convert Japanese text to Romaji
 * Supports hiragana, katakana, and some common kanji
 * For unsupported kanji, returns original text
 */
function toRomaji(text) {
  if (!text) return '';
  
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    let matched = false;
    
    // Try to match 3-character kanji compounds first
    if (i + 2 < text.length) {
      const threeChar = text.substring(i, i + 3);
      if (kanjiToReading[threeChar]) {
        result += kanjiToReading[threeChar];
        i += 3;
        matched = true;
        continue;
      }
    }
    
    // Try to match 2-character kanji compounds
    if (i + 1 < text.length) {
      const twoChar = text.substring(i, i + 2);
      if (kanjiToReading[twoChar]) {
        result += kanjiToReading[twoChar];
        i += 2;
        matched = true;
        continue;
      }
    }
    
    // Try single character
    const char = text[i];
    
    // Check for small tsu (っ/ッ) - doubles next consonant
    if (char === 'っ' || char === 'ッ') {
      if (i + 1 < text.length) {
        const nextChar = text[i + 1];
        const nextRomaji = hiraganaToRomaji[nextChar] || katakanaToRomaji[nextChar];
        if (nextRomaji && nextRomaji.length > 0) {
          result += nextRomaji[0]; // Add first consonant
        }
      }
      i++;
      matched = true;
      continue;
    }
    
    // Check hiragana
    if (hiraganaToRomaji[char]) {
      result += hiraganaToRomaji[char];
      matched = true;
    }
    // Check katakana
    else if (katakanaToRomaji[char]) {
      result += katakanaToRomaji[char];
      matched = true;
    }
    // Check single kanji
    else if (kanjiToReading[char]) {
      result += kanjiToReading[char];
      matched = true;
    }
    // Keep original character (numbers, English, punctuation, unsupported kanji)
    else {
      result += char;
      matched = true;
    }
    
    i++;
  }
  
  return result;
}

/**
 * Convert Chinese pinyin approximation (very basic)
 * For proper Chinese TTS, it's better to use the original text
 */
function toPinyin(text) {
  // For Chinese, it's complex to convert to proper pinyin without a library
  // Return original text for now - TTS engines can handle Chinese directly
  return text;
}

module.exports = {
  toRomaji,
  toPinyin
};
