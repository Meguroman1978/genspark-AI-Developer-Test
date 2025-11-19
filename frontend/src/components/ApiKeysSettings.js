import React, { useState, useEffect } from 'react';
import './ApiKeysSettings.css';

function ApiKeysSettings({ onSaved }) {
  const [formData, setFormData] = useState({
    openai_key: '',
    elevenlabs_key: '',
    fal_ai_key: '',  // NEW: FAL AI API key
    creatomate_key: '',
    creatomate_template_id: '',
    creatomate_public_token: '',
    stability_ai_key: '',
    shotstack_key: '',  // NEW: Shotstack API key
    youtube_client_id: '',
    youtube_client_secret: '',
    youtube_access_token: '',
    youtube_refresh_token: '',
    youtube_redirect_uri: 'https://developers.google.com/oauthplayground'  // Default value
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showYouTubeHelp, setShowYouTubeHelp] = useState(false);

  useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    try {
      const response = await fetch('/api/keys?userId=default_user');
      const data = await response.json();
      
      // Display masked values for existing keys (except redirect_uri which should be visible)
      // This allows users to see what's configured without re-entering
      if (data.youtube_redirect_uri) {
        setFormData(prev => ({
          ...prev,
          youtube_redirect_uri: data.youtube_redirect_uri
        }));
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Only send keys that have been entered
      const keysToUpdate = {};
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          keysToUpdate[key] = formData[key];
        }
      });

      if (Object.keys(keysToUpdate).length === 0) {
        setMessage('少なくとも1つのAPIキーを入力してください');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'default_user',
          ...keysToUpdate
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ APIキーが正常に保存されました!');
        // Clear form (keep redirect_uri default)
        setFormData({
          openai_key: '',
          elevenlabs_key: '',
          fal_ai_key: '',
          creatomate_key: '',
          creatomate_template_id: '',
          creatomate_public_token: '',
          stability_ai_key: '',
          shotstack_key: '',
          youtube_client_id: '',
          youtube_client_secret: '',
          youtube_access_token: '',
          youtube_refresh_token: '',
          youtube_redirect_uri: 'https://developers.google.com/oauthplayground'  // Keep default
        });
        
        if (onSaved) {
          setTimeout(() => {
            onSaved();
          }, 1500);
        }
      } else {
        setMessage('❌ エラー: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ 保存中にエラーが発生しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="api-keys-settings">
      <h2>🔑 APIキー設定</h2>
      <p className="description">
        以下のAPIキーを設定してください。キーはブラウザのローカルストレージに安全に保存されます。
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="openai_key">
            <span className="required">* </span>OpenAI API Key
            <span className="help-text">（必須）GPT-4でスクリプト生成と画像生成を行います</span>
          </label>
          <input
            type="password"
            id="openai_key"
            name="openai_key"
            value={formData.openai_key}
            onChange={handleChange}
            placeholder="sk-..."
            className="form-input"
          />
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → OpenAI APIキーを取得
          </a>
        </div>

        <div className="form-group">
          <label htmlFor="elevenlabs_key">
            <span className="required">* </span>ElevenLabs API Key
            <span className="help-text">（必須）高品質な音声ナレーションを生成します</span>
          </label>
          <input
            type="password"
            id="elevenlabs_key"
            name="elevenlabs_key"
            value={formData.elevenlabs_key}
            onChange={handleChange}
            placeholder="..."
            className="form-input"
          />
          <a 
            href="https://elevenlabs.io/api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → ElevenLabs APIキーを取得
          </a>
        </div>

        <div className="form-group">
          <label htmlFor="fal_ai_key">
            FAL AI API Key
            <span className="help-text">（推奨）低コストで高品質な画像生成（DALL-E 3の代替）</span>
          </label>
          <input
            type="password"
            id="fal_ai_key"
            name="fal_ai_key"
            value={formData.fal_ai_key}
            onChange={handleChange}
            placeholder="user_id:password 形式（例: 6932fae0-...:33cdd595...）"
            className="form-input"
          />
          <a 
            href="https://fal.ai/dashboard/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → FAL AI APIキーを取得
          </a>
          <span className="help-text" style={{display: 'block', marginTop: '8px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107'}}>
            <strong>🔑 重要：</strong> FAL AI APIキーは <code>user_id:password</code> 形式です。<br/>
            例: <code>6932fae0-a856-4fa4-9daf-4bcbf9cfeef0:33cdd595d45d69b420a993e4ca5ac1d0</code><br/>
            <strong>コロン(:)を含む全体を1つの塊</strong>としてコピー＆ペーストしてください。<br/>
            ✨ FAL AIの利点: DALL-E 3より安価（$0.025-0.06/枚）、豊富なモデル選択、高速生成
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="creatomate_key">
            Creatomate API Key
            <span className="help-text">（オプション）動画編集を行います。未設定の場合は簡易版で動作します</span>
          </label>
          <input
            type="password"
            id="creatomate_key"
            name="creatomate_key"
            value={formData.creatomate_key}
            onChange={handleChange}
            placeholder="..."
            className="form-input"
          />
          <a 
            href="https://creatomate.com/docs/api/rest-api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → Creatomate APIキーを取得
          </a>
        </div>

        <div className="form-group">
          <label htmlFor="creatomate_template_id">
            Creatomate Template ID
            <span className="help-text">（オプション）使用するテンプレートID。未設定の場合はデフォルトテンプレートを使用</span>
          </label>
          <input
            type="text"
            id="creatomate_template_id"
            name="creatomate_template_id"
            value={formData.creatomate_template_id}
            onChange={handleChange}
            placeholder="8739fb2c-b1a4-4809-830a-3c10e5a622e0"
            className="form-input"
          />
          <span className="help-text">テンプレートはCreatomateダッシュボードで作成・確認できます</span>
        </div>

        <div className="form-group">
          <label htmlFor="creatomate_public_token">
            Creatomate Public Token
            <span className="help-text">（オプション）パブリックトークン。テンプレート内で動的画像生成を使用する場合に必要</span>
          </label>
          <input
            type="password"
            id="creatomate_public_token"
            name="creatomate_public_token"
            value={formData.creatomate_public_token}
            onChange={handleChange}
            placeholder="pk_..."
            className="form-input"
          />
          <span className="help-text">パブリックトークンはCreatomateダッシュボードのAPI設定で確認できます</span>
        </div>

        <div className="form-group">
          <label htmlFor="stability_ai_key">
            Stability AI API Key
            <span className="help-text">（オプション）Creatomateテンプレートで画像生成を使用する場合に必要</span>
          </label>
          <input
            type="password"
            id="stability_ai_key"
            name="stability_ai_key"
            value={formData.stability_ai_key}
            onChange={handleChange}
            placeholder="sk-..."
            className="form-input"
          />
          <a 
            href="https://platform.stability.ai/account/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → Stability AI APIキーを取得
          </a>
        </div>

        <div className="form-group">
          <label htmlFor="shotstack_key">
            Shotstack API Key
            <span className="help-text">（オプション）月20回まで無料で動画生成できる代替サービス</span>
          </label>
          <input
            type="password"
            id="shotstack_key"
            name="shotstack_key"
            value={formData.shotstack_key}
            onChange={handleChange}
            placeholder="..."
            className="form-input"
          />
          <a 
            href="https://dashboard.shotstack.io/register" 
            target="_blank" 
            rel="noopener noreferrer"
            className="get-key-link"
          >
            → Shotstack無料アカウントを作成
          </a>
          <span className="help-text">
            ✨ Shotstackの利点: 月20回まで無料、Creatomateと同等の品質、簡単なAPI
          </span>
        </div>

        <div className="youtube-section">
          <h3>
            🎥 YouTube API 認証情報
            <span className="help-text">（オプション）YouTubeへの自動アップロードに必要です</span>
            <button
              type="button"
              className="help-button"
              onClick={() => setShowYouTubeHelp(!showYouTubeHelp)}
            >
              {showYouTubeHelp ? '▼' : '▶'} 設定方法を表示
            </button>
          </h3>
          
          {showYouTubeHelp && (
            <div className="help-box">
              <h4>🎯 YouTube API 認証情報の取得方法（完全ガイド）</h4>
              
              <div className="warning-banner">
                ⚠️ <strong>最重要ステップ：</strong> Google Cloud ConsoleでPlaygroundのredirect_uriを登録しないと<br/>
                <code>invalid_client</code>エラーが発生します！
              </div>

              <h5>【ステップ1】Google Cloud Consoleの設定</h5>
              <ol>
                <li>
                  <strong>プロジェクト作成</strong><br/>
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                    Google Cloud Console
                  </a> で新しいプロジェクトを作成
                </li>
                <li>
                  <strong>API有効化</strong><br/>
                  「APIとサービス」→「ライブラリ」→「YouTube Data API v3」を有効化
                </li>
                <li>
                  <strong>OAuth同意画面</strong><br/>
                  「APIとサービス」→「OAuth同意画面」→ 設定を完了<br/>
                  ※ テストユーザーに自分のGoogleアカウントを追加
                </li>
                <li>
                  <strong>OAuthクライアントID作成</strong><br/>
                  「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」<br/>
                  アプリケーションの種類: <strong>ウェブアプリケーション</strong>
                </li>
                <li>
                  <strong>🚨 重要：redirect_uriを登録</strong><br/>
                  「承認済みのリダイレクトURI」に以下を追加：<br/>
                  <code className="uri-code">https://developers.google.com/oauthplayground</code><br/>
                  <span className="warning-text">※ これを忘れると invalid_client エラーになります！</span>
                </li>
                <li>
                  <strong>認証情報をコピー</strong><br/>
                  client_id と client_secret を控える
                </li>
              </ol>

              <h5>【ステップ2】OAuth 2.0 Playgroundでトークン取得</h5>
              <ol>
                <li>
                  <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer">
                    OAuth 2.0 Playground
                  </a> を開く
                </li>
                <li>
                  右上の⚙️（歯車アイコン）をクリック
                </li>
                <li>
                  「Use your own OAuth credentials」にチェック
                </li>
                <li>
                  client_id と client_secret を入力
                </li>
                <li>
                  <strong className="highlight">【重要】Step 1: スコープを正しく選択</strong><br/>
                  <div className="scope-selection">
                    <p><strong>方法A：リストから選択（推奨）</strong></p>
                    <ul>
                      <li>左側のリストから「YouTube Data API v3」を探して展開</li>
                      <li>以下のスコープに<strong>必ずチェック</strong>：</li>
                    </ul>
                    <div className="scope-list">
                      <code>☑ https://www.googleapis.com/auth/youtube.upload</code><br/>
                      <code>☑ https://www.googleapis.com/auth/youtube</code><br/>
                      <code>☑ https://www.googleapis.com/auth/youtube.readonly</code>
                    </div>
                    <p><strong>方法B：直接入力</strong></p>
                    <ul>
                      <li>"Input your own scopes" の欄に以下を貼り付け：</li>
                    </ul>
                    <div className="scope-list">
                      <code>https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube</code>
                    </div>
                  </div>
                  <div className="warning-banner" style={{marginTop: '10px'}}>
                    ⚠️ スコープを選択しないと、<code>Insufficient Permission</code>エラーになります！
                  </div>
                </li>
                <li>
                  「Authorize APIs」ボタンをクリック → Googleでログイン
                </li>
                <li>
                  <strong>同意画面で権限を確認</strong>：<br/>
                  「YouTubeアカウントの管理」や「動画のアップロード」などの<br/>
                  権限が表示されることを確認して許可
                </li>
                <li>
                  Step 2: 「Exchange authorization code for tokens」をクリック
                </li>
                <li>
                  <strong>スコープを確認</strong>：<br/>
                  画面下部の「scope」欄に<br/>
                  <code>youtube.upload</code>や<code>youtube</code>が<br/>
                  含まれていることを確認
                </li>
                <li>
                  Access token と Refresh token をコピー
                </li>
              </ol>

              <h5>【ステップ3】アプリに設定</h5>
              <p>以下の各フィールドに個別に入力してください：</p>
              <ul>
                <li><strong>Client ID</strong>: Google Cloud Consoleで取得したclient_id</li>
                <li><strong>Client Secret</strong>: Google Cloud Consoleで取得したclient_secret</li>
                <li><strong>Access Token</strong>: Playgroundで取得したaccess_token</li>
                <li><strong>Refresh Token</strong>: Playgroundで取得したrefresh_token</li>
                <li><strong>Redirect URI</strong>: デフォルト値が自動入力されています</li>
              </ul>

              <div className="checklist">
                <h5>✅ チェックリスト</h5>
                <ul>
                  <li>□ YouTube Data API v3が有効化されている</li>
                  <li>□ OAuth同意画面が設定済み</li>
                  <li>□ テストユーザーに自分を追加済み</li>
                  <li>□ <strong>redirect_uriがCloud Consoleに登録済み</strong></li>
                  <li>□ Playgroundで正しいcredentialsを使用</li>
                  <li>□ youtube.uploadスコープで認証済み</li>
                  <li>□ redirect_uriフィールドを設定に含めた</li>
                </ul>
              </div>

              <div className="help-links">
                <a 
                  href="https://developers.google.com/oauthplayground/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="get-key-link"
                >
                  → OAuth 2.0 Playground
                </a>
                <a 
                  href="https://console.cloud.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="get-key-link"
                >
                  → Google Cloud Console
                </a>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="youtube_client_id">
              Client ID
              <span className="help-text">Google Cloud Consoleで取得したOAuthクライアントID</span>
            </label>
            <input
              type="text"
              id="youtube_client_id"
              name="youtube_client_id"
              value={formData.youtube_client_id}
              onChange={handleChange}
              placeholder="123456789.apps.googleusercontent.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="youtube_client_secret">
              Client Secret
              <span className="help-text">Google Cloud Consoleで取得したOAuthクライアントシークレット</span>
            </label>
            <input
              type="password"
              id="youtube_client_secret"
              name="youtube_client_secret"
              value={formData.youtube_client_secret}
              onChange={handleChange}
              placeholder="GOCSPX-..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="youtube_access_token">
              Access Token
              <span className="help-text">OAuth 2.0 Playgroundで取得したアクセストークン</span>
            </label>
            <input
              type="password"
              id="youtube_access_token"
              name="youtube_access_token"
              value={formData.youtube_access_token}
              onChange={handleChange}
              placeholder="ya29.a0..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="youtube_refresh_token">
              Refresh Token
              <span className="help-text">OAuth 2.0 Playgroundで取得したリフレッシュトークン</span>
            </label>
            <input
              type="password"
              id="youtube_refresh_token"
              name="youtube_refresh_token"
              value={formData.youtube_refresh_token}
              onChange={handleChange}
              placeholder="1//0g..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="youtube_redirect_uri">
              Redirect URI
              <span className="help-text">通常はデフォルト値のまま変更不要です</span>
            </label>
            <input
              type="text"
              id="youtube_redirect_uri"
              name="youtube_redirect_uri"
              value={formData.youtube_redirect_uri}
              onChange={handleChange}
              placeholder="https://developers.google.com/oauthplayground"
              className="form-input"
            />
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? '保存中...' : '💾 APIキーを保存'}
        </button>
      </form>

      <div className="security-note">
        🔒 セキュリティについて: APIキーはサーバーのデータベースに保存され、通信は暗号化されます。
        本番環境では、より強固なセキュリティ対策（環境変数の使用など）を推奨します。
      </div>
    </div>
  );
}

export default ApiKeysSettings;
