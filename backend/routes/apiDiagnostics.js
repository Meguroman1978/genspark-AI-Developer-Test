const express = require('express');
const router = express.Router();
const axios = require('axios');
const { google } = require('googleapis');

// Diagnose all APIs
router.post('/diagnose', async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.body.userId || 'default_user';

  // Get API keys
  db.get(
    'SELECT openai_key, elevenlabs_key, creatomate_key, stability_ai_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId],
    async (err, keys) => {
      if (err || !keys) {
        return res.status(400).json({ error: 'No API keys found' });
      }

      const results = {};

      // Test OpenAI
      if (keys.openai_key) {
        results.openai = await testOpenAI(keys.openai_key);
      } else {
        results.openai = { status: 'not_configured', message: 'API key not set' };
      }

      // Test ElevenLabs
      if (keys.elevenlabs_key) {
        results.elevenlabs = await testElevenLabs(keys.elevenlabs_key);
      } else {
        results.elevenlabs = { status: 'not_configured', message: 'API key not set' };
      }

      // Test Creatomate
      if (keys.creatomate_key) {
        results.creatomate = await testCreatomate(keys.creatomate_key);
      } else {
        results.creatomate = { status: 'not_configured', message: 'API key not set' };
      }

      // Test Stability AI
      if (keys.stability_ai_key) {
        results.stability_ai = await testStabilityAI(keys.stability_ai_key);
      } else {
        results.stability_ai = { status: 'not_configured', message: 'API key not set' };
      }

      // Test YouTube
      if (keys.youtube_credentials) {
        results.youtube = await testYouTube(keys.youtube_credentials);
      } else {
        results.youtube = { status: 'not_configured', message: 'Credentials not set' };
      }

      res.json(results);
    }
  );
});

async function testOpenAI(apiKey) {
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: '✅ OpenAI APIが正常に動作しています',
      details: `利用可能なモデル数: ${response.data.data.length}`,
      solution: 'GPT-4を使用したスクリプト生成とDALL-E 3による画像生成が可能です。'
    };
  } catch (error) {
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.response?.status === 401) {
      errorMessage = '❌ OpenAI APIキーが無効です';
      errorDetails = '入力されたAPIキーでは認証できませんでした。';
      errorSolution = [
        '対応方法:',
        '1. OpenAI Platform (https://platform.openai.com/api-keys) にアクセス',
        '2. 有効なAPIキーを確認またはを新規作成',
        '3. APIキーは "sk-" で始まる文字列です',
        '4. コピーしたAPIキーを設定画面に貼り付け',
        '',
        '注意: APIキーは一度しか表示されないため、必ず安全に保管してください。'
      ];
    } else if (error.response?.status === 429) {
      errorMessage = '❌ APIリクエスト制限に達しました';
      errorDetails = 'レート制限またはクォータ超過が発生しています。';
      errorSolution = [
        '対応方法:',
        '1. しばらく時間をおいてから再試行',
        '2. OpenAI Platformでアカウントの使用量を確認',
        '3. 必要に応じてプランをアップグレード',
        '4. APIキーの使用制限を確認'
      ];
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = '❌ OpenAI APIへの接続がタイムアウトしました';
      errorDetails = 'ネットワーク接続に問題があるか、APIサーバーが応答していません。';
      errorSolution = [
        '対応方法:',
        '1. インターネット接続を確認',
        '2. ファイアウォール設定を確認',
        '3. しばらく時間をおいてから再試行',
        '4. OpenAI Status Page (https://status.openai.com/) でサービス状況を確認'
      ];
    } else {
      errorMessage = `❌ OpenAI API接続エラー`;
      errorDetails = error.message;
      errorSolution = [
        '対応方法:',
        '1. APIキーが正しく入力されているか確認',
        '2. インターネット接続を確認',
        '3. しばらく時間をおいてから再試行',
        '',
        `詳細エラー: ${error.message}`
      ];
    }

    return {
      status: 'error',
      message: errorMessage,
      details: errorDetails,
      solution: errorSolution.join('\n'),
      error: error.message,
      code: error.response?.status
    };
  }
}

async function testElevenLabs(apiKey) {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: '✅ ElevenLabs APIが正常に動作しています',
      details: `利用可能な音声: ${response.data.voices.length}種類`,
      solution: '多言語対応の高品質音声合成が利用可能です。'
    };
  } catch (error) {
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.response?.status === 401) {
      errorMessage = '❌ ElevenLabs APIキーが無効です';
      errorDetails = '入力されたAPIキーでは認証できませんでした。';
      errorSolution = [
        '対応方法:',
        '1. ElevenLabs (https://elevenlabs.io/) にログイン',
        '2. Profile Settings → API Keys に移動',
        '3. 既存のキーを確認または新規作成',
        '4. APIキーをコピーして設定画面に貼り付け',
        '',
        '注意: 無料プランでは月間の文字数制限があります。'
      ];
    } else if (error.response?.status === 429) {
      errorMessage = '❌ APIリクエスト制限に達しました';
      errorDetails = 'レート制限またはクォータ超過が発生しています。';
      errorSolution = [
        '対応方法:',
        '1. ElevenLabsアカウントの使用量を確認',
        '2. 月間の文字数制限を超えていないか確認',
        '3. 必要に応じて有料プランへアップグレード',
        '4. しばらく時間をおいてから再試行'
      ];
    } else {
      errorMessage = `❌ ElevenLabs API接続エラー`;
      errorDetails = error.message;
      errorSolution = [
        '対応方法:',
        '1. APIキーが正しく入力されているか確認',
        '2. インターネット接続を確認',
        '3. しばらく時間をおいてから再試行',
        '',
        `詳細エラー: ${error.message}`
      ];
    }

    return {
      status: 'error',
      message: errorMessage,
      details: errorDetails,
      solution: errorSolution.join('\n'),
      error: error.message,
      code: error.response?.status
    };
  }
}

async function testCreatomate(apiKey) {
  try {
    const response = await axios.get('https://api.creatomate.com/v1/templates', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: '✅ Creatomate APIが正常に動作しています',
      details: `利用可能なテンプレート: ${response.data.length}個`,
      solution: '動画の自動編集とレンダリングが可能です。'
    };
  } catch (error) {
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.response?.status === 401) {
      errorMessage = '❌ Creatomate APIキーが無効です';
      errorDetails = '入力されたAPIキーでは認証できませんでした。';
      errorSolution = [
        '対応方法:',
        '1. Creatomate (https://creatomate.com/) にログイン',
        '2. Account Settings → API Keys に移動',
        '3. 既存のキーを確認または新規作成',
        '4. APIキーをコピーして設定画面に貼り付け',
        '',
        '注意: APIキーとPublic Tokenは異なります。',
        '• API Key: サーバーサイドでレンダリングを実行するために使用',
        '• Public Token: テンプレート内での動的コンテンツ生成に使用'
      ];
    } else if (error.response?.status === 429) {
      errorMessage = '❌ APIリクエスト制限に達しました';
      errorDetails = 'レート制限またはクォータ超過が発生しています。';
      errorSolution = [
        '対応方法:',
        '1. Creatomateアカウントのクォータを確認',
        '2. 月間のレンダリング回数制限を確認',
        '3. 必要に応じてプランをアップグレード',
        '4. しばらく時間をおいてから再試行'
      ];
    } else {
      errorMessage = `❌ Creatomate API接続エラー`;
      errorDetails = error.message;
      errorSolution = [
        '対応方法:',
        '1. APIキーが正しく入力されているか確認',
        '2. インターネット接続を確認',
        '3. しばらく時間をおいてから再試行',
        '',
        `詳細エラー: ${error.message}`
      ];
    }

    return {
      status: 'error',
      message: errorMessage,
      details: errorDetails,
      solution: errorSolution.join('\n'),
      error: error.message,
      code: error.response?.status
    };
  }
}

async function testStabilityAI(apiKey) {
  try {
    // Test with account endpoint
    const response = await axios.get('https://api.stability.ai/v1/user/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    
    return {
      status: 'success',
      message: '✅ Stability AI APIが正常に動作しています',
      details: 'アカウント認証が成功しました',
      solution: 'Creatomateテンプレート内で動的画像生成（Stability AI統合）が利用可能です。'
    };
  } catch (error) {
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.response?.status === 401) {
      errorMessage = '❌ Stability AI APIキーが無効です';
      errorDetails = '入力されたAPIキーでは認証できませんでした。';
      errorSolution = [
        '対応方法:',
        '1. Stability AI Platform (https://platform.stability.ai/) にログイン',
        '2. Account → API Keys に移動',
        '3. 既存のキーを確認または新規作成',
        '4. APIキーは "sk-" で始まる文字列です',
        '5. コピーしたAPIキーを設定画面に貼り付け',
        '',
        '注意: Stability AI APIは別途クレジットが必要です。',
        '無料トライアルまたは有料プランに登録してください。'
      ];
    } else if (error.response?.status === 402) {
      errorMessage = '❌ Stability AI クレジット不足です';
      errorDetails = 'アカウントのクレジット残高が不足しています。';
      errorSolution = [
        '対応方法:',
        '1. Stability AI Platformでクレジット残高を確認',
        '2. 必要に応じてクレジットを購入',
        '3. 無料トライアルが利用可能か確認'
      ];
    } else if (error.response?.status === 429) {
      errorMessage = '❌ APIリクエスト制限に達しました';
      errorDetails = 'レート制限が発生しています。';
      errorSolution = [
        '対応方法:',
        '1. しばらく時間をおいてから再試行',
        '2. アカウントのレート制限を確認',
        '3. 必要に応じてプランをアップグレード'
      ];
    } else {
      errorMessage = `❌ Stability AI API接続エラー`;
      errorDetails = error.message;
      errorSolution = [
        '対応方法:',
        '1. APIキーが正しく入力されているか確認',
        '2. Stability AIアカウントが有効か確認',
        '3. インターネット接続を確認',
        '4. しばらく時間をおいてから再試行',
        '',
        `詳細エラー: ${error.message}`
      ];
    }

    return {
      status: 'error',
      message: errorMessage,
      details: errorDetails,
      solution: errorSolution.join('\n'),
      error: error.message,
      code: error.response?.status
    };
  }
}

async function testYouTube(credentials) {
  try {
    const creds = JSON.parse(credentials);
    
    // Check required fields
    if (!creds.client_id || !creds.client_secret) {
      return {
        status: 'error',
        message: '❌ YouTube OAuth設定が不完全です',
        details: '必要な情報: client_id, client_secret が見つかりません。',
        solution: [
          '1. Google Cloud Consoleでプロジェクトを作成',
          '2. YouTube Data API v3を有効化',
          '3. OAuth 2.0クライアントIDを作成（デスクトップアプリ型を推奨）',
          '4. client_idとclient_secretを取得して設定してください'
        ].join('\n')
      };
    }

    if (!creds.access_token || !creds.refresh_token) {
      return {
        status: 'warning',
        message: '⚠️ OAuth認証トークンが未設定です',
        details: 'client_idとclient_secretは設定されていますが、アクセストークンがありません。',
        solution: [
          'OAuth認証フローを完了する必要があります:',
          '1. OAuth 2.0認証URLを生成',
          '2. ブラウザで認証URLにアクセス',
          '3. Googleアカウントでログインし、YouTubeアクセスを許可',
          '4. 取得したaccess_tokenとrefresh_tokenを設定に追加',
          '',
          '※ 現在のアプリではOAuth認証フローが未実装のため、手動でトークンを取得する必要があります。',
          '※ Google OAuth 2.0 Playgroundなどのツールを使用してトークンを取得できます。'
        ].join('\n')
      };
    }

    // Try to verify with YouTube API
    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      creds.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      access_token: creds.access_token,
      refresh_token: creds.refresh_token
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });

    return {
      status: 'success',
      message: '✅ YouTube API認証が成功しました',
      details: `チャンネルに接続されました: ${response.data.items?.[0]?.snippet?.title || '不明'}`,
      solution: 'YouTube APIは正常に動作しています。動画のアップロードが可能です。'
    };
  } catch (error) {
    console.error('YouTube API test error:', error);
    
    // Detailed error handling
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.code === 401 || error.message.includes('invalid_grant')) {
      errorMessage = '❌ OAuth認証トークンが無効または期限切れです';
      errorDetails = 'access_tokenの有効期限が切れているか、refresh_tokenが無効です。';
      errorSolution = [
        '対応方法:',
        '1. refresh_tokenを使用して新しいaccess_tokenを取得',
        '2. または、OAuth認証フローを再実行してトークンを再取得',
        '',
        '手順:',
        '• Google OAuth 2.0 Playground (https://developers.google.com/oauthplayground/) にアクセス',
        '• Step 1: "YouTube Data API v3" を選択し、必要なスコープをチェック',
        '• "Authorize APIs" をクリック',
        '• Step 2: "Exchange authorization code for tokens" をクリック',
        '• 取得したaccess_tokenとrefresh_tokenを設定に追加'
      ];
    } else if (error.code === 403) {
      errorMessage = '❌ YouTube Data APIへのアクセスが拒否されました';
      errorDetails = 'APIキーまたはOAuthクライアントにYouTube Data APIの権限がありません。';
      errorSolution = [
        '対応方法:',
        '1. Google Cloud ConsoleでYouTube Data API v3が有効化されているか確認',
        '2. OAuth同意画面でYouTubeスコープが設定されているか確認',
        '3. プロジェクトのAPIクォータが残っているか確認',
        '4. OAuth クライアントIDが正しく設定されているか確認'
      ];
    } else if (error.message.includes('unauthorized_client')) {
      errorMessage = '❌ OAuthクライアントが認証されていません (unauthorized_client)';
      errorDetails = 'client_idまたはclient_secretが無効、または認証スコープが不足しています。';
      errorSolution = [
        '考えられる原因:',
        '• client_idまたはclient_secretが間違っている',
        '• OAuthクライアントIDのタイプが適切でない（Web型の場合はredirect_uriが必要）',
        '• OAuth同意画面の設定が未完了',
        '• 必要なスコープ（https://www.googleapis.com/auth/youtube.upload）が不足',
        '',
        '対応方法:',
        '1. Google Cloud Consoleで新しいOAuthクライアントIDを作成',
        '   → 「デスクトップアプリケーション」タイプを選択（推奨）',
        '2. OAuth同意画面を設定:',
        '   → テストユーザーに自分のGoogleアカウントを追加',
        '   → スコープに「../auth/youtube.upload」を追加',
        '3. 正しいclient_idとclient_secretをコピー',
        '4. OAuth 2.0 Playgroundで新しいトークンを取得',
        '5. すべての認証情報を設定に貼り付け'
      ];
    } else if (error.message.includes('JSON')) {
      errorMessage = '❌ YouTube認証情報のJSON形式が不正です';
      errorDetails = '設定されたJSONの構文エラーがあります。';
      errorSolution = [
        '対応方法:',
        '正しいJSON形式で入力してください:',
        '{',
        '  "client_id": "あなたのクライアントID.apps.googleusercontent.com",',
        '  "client_secret": "あなたのクライアントシークレット",',
        '  "access_token": "ya29.a0...",',
        '  "refresh_token": "1//0g..."',
        '}',
        '',
        '※ カンマ、引用符、括弧の位置に注意してください'
      ];
    } else {
      errorMessage = `❌ YouTube API接続エラー: ${error.message}`;
      errorDetails = `エラーコード: ${error.code || '不明'}`;
      errorSolution = [
        '一般的な対応方法:',
        '1. インターネット接続を確認',
        '2. Google Cloud ConsoleでYouTube Data API v3が有効か確認',
        '3. APIキーとOAuth認証情報を再確認',
        '4. しばらく時間をおいてから再試行',
        '',
        `詳細エラー: ${error.message}`
      ];
    }

    return {
      status: 'error',
      message: errorMessage,
      details: errorDetails,
      solution: errorSolution.join('\n'),
      error: error.message,
      code: error.code
    };
  }
}

module.exports = router;
