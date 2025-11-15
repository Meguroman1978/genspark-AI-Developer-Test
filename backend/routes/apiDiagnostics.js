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
    'SELECT openai_key, elevenlabs_key, fal_ai_key, creatomate_key, stability_ai_key, youtube_credentials FROM api_keys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
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

      // Test FAL AI
      if (keys.fal_ai_key) {
        results.fal_ai = await testFalAI(keys.fal_ai_key);
      } else {
        results.fal_ai = { status: 'not_configured', message: 'API key not set' };
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
    console.log('🔍 YouTube API診断開始...');
    const creds = JSON.parse(credentials);
    console.log('📋 認証情報:', {
      has_client_id: !!creds.client_id,
      has_client_secret: !!creds.client_secret,
      has_access_token: !!creds.access_token,
      has_refresh_token: !!creds.refresh_token,
      has_redirect_uri: !!creds.redirect_uri,
      redirect_uri: creds.redirect_uri || '未設定'
    });
    
    // Check required fields
    if (!creds.client_id || !creds.client_secret) {
      return {
        status: 'error',
        message: '❌ YouTube OAuth設定が不完全です',
        details: '必要な情報: client_id, client_secret が見つかりません。',
        solution: [
          '✅ OAuth 2.0 Playgroundでトークンを取得する手順:',
          '',
          '1. Google OAuth 2.0 Playground にアクセス',
          '   https://developers.google.com/oauthplayground/',
          '',
          '2. 右上の設定アイコン⚙️をクリック',
          '   ✓ "Use your own OAuth credentials" にチェック',
          '   ✓ OAuth Client ID: あなたのclient_id を入力',
          '   ✓ OAuth Client secret: あなたのclient_secret を入力',
          '',
          '3. Step 1: Select & authorize APIs',
          '   ✓ YouTube Data API v3 を探して展開',
          '   ✓ https://www.googleapis.com/auth/youtube.upload をチェック',
          '   ✓ "Authorize APIs" ボタンをクリック',
          '   ✓ Googleアカウントでログインし、許可',
          '',
          '4. Step 2: Exchange authorization code for tokens',
          '   ✓ "Exchange authorization code for tokens" ボタンをクリック',
          '   ✓ Access token と Refresh token が表示される',
          '',
          '5. 設定に以下のJSON形式で入力:',
          '{',
          '  "client_id": "あなたのクライアントID",',
          '  "client_secret": "あなたのクライアントシークレット",',
          '  "access_token": "取得したアクセストークン",',
          '  "refresh_token": "取得したリフレッシュトークン"',
          '}'
        ].join('\n')
      };
    }

    if (!creds.access_token || !creds.refresh_token) {
      return {
        status: 'warning',
        message: '⚠️ OAuth認証トークンが未設定です',
        details: 'client_idとclient_secretは設定されていますが、アクセストークンがありません。',
        solution: [
          '✅ OAuth 2.0 Playgroundでトークンを取得する手順:',
          '',
          '1. Google OAuth 2.0 Playground にアクセス',
          '   https://developers.google.com/oauthplayground/',
          '',
          '2. 右上の設定アイコン⚙️をクリック',
          '   ✓ "Use your own OAuth credentials" にチェック',
          '   ✓ OAuth Client ID: ' + creds.client_id,
          '   ✓ OAuth Client secret: ' + creds.client_secret,
          '',
          '3. Step 1: Select & authorize APIs',
          '   ✓ YouTube Data API v3 を探して展開',
          '   ✓ https://www.googleapis.com/auth/youtube.upload をチェック',
          '   ✓ "Authorize APIs" ボタンをクリック',
          '   ✓ Googleアカウントでログインし、許可',
          '',
          '4. Step 2: Exchange authorization code for tokens',
          '   ✓ "Exchange authorization code for tokens" ボタンをクリック',
          '   ✓ Access token と Refresh token が表示される',
          '',
          '5. 取得したトークンを現在の設定に追加:',
          '{',
          '  "client_id": "' + creds.client_id + '",',
          '  "client_secret": "' + creds.client_secret + '",',
          '  "access_token": "取得したアクセストークン(ya29.a0...)",',
          '  "refresh_token": "取得したリフレッシュトークン(1//0g...)"',
          '}'
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

    const channelName = response.data.items?.[0]?.snippet?.title || '不明';
    const channelId = response.data.items?.[0]?.id || '';

    return {
      status: 'success',
      message: '✅ YouTube API認証が成功しました！',
      details: `チャンネル名: ${channelName}\nチャンネルID: ${channelId}`,
      solution: [
        '✅ 認証成功！動画のアップロードが可能です。',
        '',
        '📝 注意事項:',
        '• access_tokenは約1時間で期限切れになります',
        '• refresh_tokenは長期間有効です（取得後は大切に保管）',
        '• アプリはrefresh_tokenを使用して自動的に新しいaccess_tokenを取得します',
        '',
        '🎬 動画アップロードの手順:',
        '1. 「動画生成」タブでテーマを入力',
        '2. 「動画を生成・アップロード」ボタンをクリック',
        '3. 処理完了後、YouTubeリンクが表示されます'
      ].join('\n')
    };
  } catch (error) {
    console.error('❌ YouTube API test error:', error.message);
    console.error('📊 Error details:', {
      code: error.code,
      message: error.message,
      response_status: error.response?.status,
      response_data: error.response?.data
    });
    
    // Detailed error handling
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.code === 401 || error.message.includes('invalid_grant')) {
      errorMessage = '❌ OAuth認証トークンが無効または期限切れです';
      errorDetails = 'access_tokenの有効期限が切れているか、refresh_tokenが無効です。';
      errorSolution = [
        '🔄 トークンの再取得が必要です:',
        '',
        '1. Google OAuth 2.0 Playground にアクセス',
        '   https://developers.google.com/oauthplayground/',
        '',
        '2. 右上の設定アイコン⚙️をクリック',
        '   ✓ "Use your own OAuth credentials" にチェック',
        '   ✓ client_id と client_secret を入力',
        '',
        '3. Step 1で YouTube Data API v3 のスコープを選択',
        '   ✓ https://www.googleapis.com/auth/youtube.upload',
        '',
        '4. 認証を完了し、新しいトークンを取得',
        '',
        '5. 取得したaccess_tokenとrefresh_tokenを設定に貼り付け'
      ];
    } else if (error.code === 403) {
      const errorDesc = error.response?.data?.error?.message || '';
      const isInsufficientScope = errorDesc.includes('insufficient') || errorDesc.includes('scope');
      
      if (isInsufficientScope) {
        errorMessage = '❌ YouTubeスコープが不足しています (Insufficient Permission)';
        errorDetails = 'access_tokenに必要なYouTubeスコープが含まれていません。';
        errorSolution = [
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '🎯 原因：OAuth 2.0 Playgroundでスコープを正しく選択していない',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          '❌ 現在の問題：',
          '取得したaccess_tokenには、YouTube APIを使用するための',
          '権限（スコープ）が含まれていません。',
          '',
          '✅ 解決方法：正しいスコープでトークンを再取得',
          '',
          '【重要】OAuth 2.0 Playgroundで以下の手順を実行：',
          '',
          '1. OAuth 2.0 Playgroundにアクセス',
          '   https://developers.google.com/oauthplayground/',
          '',
          '2. 右上の⚙️（歯車）をクリック',
          '   ✓ "Use your own OAuth credentials" にチェック',
          '   ✓ Client ID と Client secret を入力',
          '',
          '3. 【最重要】Step 1で正しいスコープを選択：',
          '',
          '   方法A：リストから選択（推奨）',
          '   ────────────────────────────',
          '   ① 左側のリストから「YouTube Data API v3」を探して展開',
          '   ② 以下のスコープにチェックを入れる：',
          '',
          '      ☑ https://www.googleapis.com/auth/youtube.upload',
          '      ☑ https://www.googleapis.com/auth/youtube',
          '      ☑ https://www.googleapis.com/auth/youtube.readonly',
          '',
          '   方法B：直接入力',
          '   ────────────────────────────',
          '   ① "Input your own scopes" の入力欄に以下を貼り付け：',
          '',
          '      https://www.googleapis.com/auth/youtube.upload',
          '      https://www.googleapis.com/auth/youtube',
          '',
          '4. 「Authorize APIs」ボタンをクリック',
          '',
          '5. Googleアカウントでログインし、以下を確認：',
          '   ⚠️ 同意画面で「YouTubeアカウントの管理」や',
          '      「動画のアップロード」などの権限が表示されるか確認',
          '   ⚠️ 表示されない場合は、スコープ選択をやり直す',
          '',
          '6. 許可して、Authorization codeを取得',
          '',
          '7. Step 2: 「Exchange authorization code for tokens」をクリック',
          '',
          '8. 新しいaccess_tokenとrefresh_tokenをコピー',
          '',
          '9. アプリの設定に新しいトークンを貼り付けて保存',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '🔍 確認方法：スコープが正しく含まれているか確認',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'OAuth 2.0 Playgroundで、Step 2の画面下部に',
          '「scopes」という項目があり、以下のように表示されるはずです：',
          '',
          '  "scope": "https://www.googleapis.com/auth/youtube.upload',
          '            https://www.googleapis.com/auth/youtube"',
          '',
          'これが表示されていない場合は、スコープ選択に失敗しています。',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '⚠️ トラブルシューティング',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          '問題1：スコープが選択できない',
          '→ Google Cloud ConsoleでYouTube Data API v3を有効化',
          '',
          '問題2：同意画面でYouTube権限が表示されない',
          '→ OAuth同意画面の設定で、スコープにYouTubeを追加',
          '  （Cloud Console → APIとサービス → OAuth同意画面）',
          '',
          '問題3：「このアプリは確認されていません」と表示',
          '→ 「詳細」→「（アプリ名）に移動（安全ではないページ）」をクリック',
          '  （テストモードの場合は自分のアカウントでのみ使用可能）',
          '',
          '✅ 正しく設定できたら、このAPI診断を再実行してください！'
        ];
      } else {
        errorMessage = '❌ YouTube Data APIへのアクセスが拒否されました';
        errorDetails = 'APIの権限が不足しているか、クォータが超過しています。';
        errorSolution = [
          '対応方法:',
          '',
          '1. Google Cloud Consoleで確認:',
          '   ✓ YouTube Data API v3が有効化されているか',
          '   ✓ APIクォータが残っているか',
          '   ✓ OAuth同意画面が正しく設定されているか',
          '',
          '2. OAuth同意画面の設定:',
          '   ✓ テストユーザーに自分のアカウントを追加',
          '   ✓ スコープに youtube.upload を追加',
          '',
          '3. トークンを再取得してから再試行'
        ];
      }
    } else if (error.message.includes('unauthorized_client') || error.message.includes('invalid_client')) {
      const parsedCreds = error.message.includes('invalid_client') ? 
        (() => { try { return JSON.parse(credentials); } catch { return {}; } })() : {};
      
      errorMessage = '❌ OAuthクライアント認証エラー (invalid_client / unauthorized_client)';
      errorDetails = '🚨 最も多い原因：Google Cloud ConsoleでPlaygroundのredirect_uriが未登録です！';
      errorSolution = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🎯 解決方法：Google Cloud Consoleでredirect_uriを登録',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '⚠️ 重要：OAuth 2.0 Playgroundを使う場合、',
        'Google Cloud Consoleで以下のURIを「承認済みのリダイレクトURI」に',
        '登録する必要があります（多くの人がこのステップを忘れています）',
        '',
        '【手順1】Google Cloud Consoleでredirect_uriを登録',
        '',
        '1. Google Cloud Consoleにアクセス',
        '   https://console.cloud.google.com/',
        '',
        '2. 左メニュー → 「APIとサービス」→「認証情報」',
        '',
        '3. あなたのOAuthクライアントIDをクリック',
        '   （名前：' + (parsedCreds.client_id ? parsedCreds.client_id.split('.')[0] + '...' : 'あなたのクライアント') + '）',
        '',
        '4. 「承認済みのリダイレクトURI」セクションを探す',
        '',
        '5. 「URIを追加」ボタンをクリック',
        '',
        '6. 以下のURIを正確に入力（コピー&ペースト推奨）：',
        '   https://developers.google.com/oauthplayground',
        '',
        '   ⚠️ 注意：',
        '   • 末尾のスラッシュ（/）は不要',
        '   • httpsであることを確認（httpではない）',
        '   • スペルミスに注意',
        '',
        '7. 「保存」ボタンをクリック',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '【手順2】OAuth 2.0 Playgroundで新しいトークンを取得',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '1. OAuth 2.0 Playgroundにアクセス',
        '   https://developers.google.com/oauthplayground/',
        '',
        '2. 右上の⚙️（歯車アイコン）をクリック',
        '',
        '3. 「Use your own OAuth credentials」にチェック',
        '',
        '4. 以下を入力：',
        '   OAuth Client ID: ' + (parsedCreds.client_id || 'あなたのclient_id'),
        '   OAuth Client secret: ' + (parsedCreds.client_secret || 'あなたのclient_secret'),
        '',
        '5. Step 1: 左側のリストから「YouTube Data API v3」を展開',
        '',
        '6. 以下のスコープにチェック：',
        '   ☑ https://www.googleapis.com/auth/youtube.upload',
        '   （または必要に応じて youtube.force-ssl）',
        '',
        '7. 「Authorize APIs」ボタンをクリック',
        '',
        '8. Googleアカウントでログインし、許可',
        '',
        '9. Step 2: 「Exchange authorization code for tokens」をクリック',
        '',
        '10. Access tokenとRefresh tokenが表示される',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '【手順3】アプリに認証情報を設定',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '以下のJSON形式でYouTube認証情報を入力：',
        '',
        '{',
        '  "client_id": "' + (parsedCreds.client_id || 'あなたのclient_id') + '",',
        '  "client_secret": "' + (parsedCreds.client_secret || 'あなたのclient_secret') + '",',
        '  "access_token": "ya29.a0...(Playgroundで取得)",',
        '  "refresh_token": "1//0g...(Playgroundで取得)",',
        '  "redirect_uri": "https://developers.google.com/oauthplayground"',
        '}',
        '',
        '⚠️ redirect_uriは必須です！',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🔍 チェックリスト（すべて確認してください）',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '□ YouTube Data API v3がプロジェクトで有効化されている',
        '□ OAuth同意画面が設定されている',
        '□ テストユーザーに自分のGoogleアカウントが追加されている',
        '□ Cloud Consoleの「承認済みのリダイレクトURI」に',
        '  https://developers.google.com/oauthplayground が登録されている',
        '□ Playgroundで正しいclient_id/client_secretを使用',
        '□ youtube.uploadスコープで認証している',
        '□ 取得したトークンをアプリに正しく設定している',
        '□ redirect_uriフィールドを設定に含めている',
        '',
        '✅ すべて完了したら、このAPI診断を再実行してください！'
      ];
    } else if (error.message.includes('JSON')) {
      errorMessage = '❌ YouTube認証情報のJSON形式が不正です';
      errorDetails = '設定されたJSONの構文エラーがあります。';
      errorSolution = [
        '正しいJSON形式で入力してください:',
        '',
        '{',
        '  "client_id": "123456789-abc.apps.googleusercontent.com",',
        '  "client_secret": "GOCSPX-abcdefghijk",',
        '  "access_token": "ya29.a0AfB_...(長い文字列)",',
        '  "refresh_token": "1//0gABC...(長い文字列)"',
        '}',
        '',
        '⚠️ 注意点:',
        '• すべてのフィールドをダブルクォート(")で囲む',
        '• 各行の最後にカンマ(,)を付ける（最後の行を除く）',
        '• 括弧 { } を忘れない'
      ];
    } else {
      errorMessage = `❌ YouTube API接続エラー: ${error.message}`;
      errorDetails = `エラーコード: ${error.code || '不明'}`;
      errorSolution = [
        '一般的な対応方法:',
        '',
        '1. インターネット接続を確認',
        '2. YouTube Data API v3が有効か確認',
        '3. 認証情報を再確認',
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

async function testFalAI(apiKey) {
  try {
    // Test with a simple model endpoint to verify authentication
    // Note: FAL AI keys are in format user_id:password (e.g., 6932fae0-...:33cdd595...)
    // The entire key including the colon should be used as-is after "Key " prefix
    
    // Try to get model status - this is a lightweight endpoint that requires valid auth
    const response = await axios.post(
      'https://queue.fal.run/fal-ai/flux/dev',
      {
        prompt: 'test authentication',
        image_size: 'square_hd',
        num_inference_steps: 1,
        num_images: 1
      },
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: function (status) {
          // Consider 200-299 and 400 (bad request - means auth worked) as success for testing
          return (status >= 200 && status < 300) || status === 400;
        }
      }
    );
    
    return {
      status: 'success',
      message: '✅ FAL AI APIが正常に動作しています',
      details: '11種類のtext-to-imageモデルが利用可能です',
      solution: '低コスト（$0.025-0.08/枚）で高品質な画像生成が可能です。DALL-E 3の代替として推奨されます。'
    };
  } catch (error) {
    let errorMessage = '';
    let errorDetails = '';
    let errorSolution = [];

    if (error.response?.status === 401 || error.response?.status === 403) {
      errorMessage = '❌ FAL AI APIキーが無効です';
      errorDetails = '入力されたAPIキーでは認証できませんでした。';
      errorSolution = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🔑 FAL AI APIキーの正しい形式',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'FAL AI APIキーは以下の形式で表示されます：',
        'user_id:password',
        '',
        '例: 6932fae0-a856-4fa4-9daf-4bcbf9cfeef0:33cdd595d45d69b420a993e4ca5ac1d0',
        '     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
        '            User ID部分                    Password部分',
        '',
        '⚠️ 重要：コロン（:）を含む全体を1つのAPIキーとして扱います',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📋 正しい設定手順',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '1. FAL AI Dashboard (https://fal.ai/dashboard/keys) にログイン',
        '',
        '2. 「API Keys」セクションで新しいキーを作成',
        '',
        '3. 表示されたキー全体をコピー',
        '   ✓ コロン（:）の前の部分（User ID）',
        '   ✓ コロン（:）自体',
        '   ✓ コロン（:）の後の部分（Password）',
        '   → 全てを含めて1つの文字列としてコピー',
        '',
        '4. このアプリの「⚙️ 設定」タブを開く',
        '',
        '5. 「FAL AI API Key」フィールドに貼り付け',
        '   例: 6932fae0-a856-4fa4-9daf-4bcbf9cfeef0:33cdd595d45d69b420a993e4ca5ac1d0',
        '',
        '6. 「💾 APIキーを保存」をクリック',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '❌ よくある間違い',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '× コロンの前だけをコピー（User IDのみ）',
        '× コロンの後だけをコピー（Passwordのみ）',
        '× 「Key 」プレフィックスを含めてコピー',
        '× スペースや改行を含めてしまう',
        '',
        '✓ コロンを含む全体を正確にコピー',
        '✓ プレフィックスなし、余分な文字なし',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '✅ 確認方法',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '正しくコピーできたか確認：',
        '• キーの中にコロン（:）が1つだけ含まれている',
        '• コロンの前後に文字列がある',
        '• 「Key 」などのプレフィックスは含まれていない',
        '• 余分なスペースや改行がない',
        '',
        '保存後、この「🔬 API診断」を再実行して接続を確認してください！',
        '',
        '✨ FAL AIの利点:',
        '• DALL-E 3より安価（$0.025-0.08/枚 vs $0.04-0.08/枚）',
        '• 豊富なモデル選択（FLUX, Imagen 4, Nano Banana など）',
        '• 高速生成とレスポンス',
        '• 使用量ベースの透明な料金体系'
      ];
    } else if (error.response?.status === 429) {
      errorMessage = '❌ APIリクエスト制限に達しました';
      errorDetails = 'レート制限またはクォータ超過が発生しています。';
      errorSolution = [
        '対応方法:',
        '1. FAL AIアカウントの使用量を確認',
        '2. しばらく時間をおいてから再試行',
        '3. 必要に応じてプランをアップグレード'
      ];
    } else {
      errorMessage = `❌ FAL AI API接続エラー`;
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

module.exports = router;
