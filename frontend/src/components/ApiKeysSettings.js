import React, { useState, useEffect } from 'react';
import './ApiKeysSettings.css';

function ApiKeysSettings({ onSaved }) {
  const [formData, setFormData] = useState({
    openai_key: '',
    elevenlabs_key: '',
    creatomate_key: '',
    creatomate_template_id: '',
    stability_ai_key: '',
    youtube_credentials: ''
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
      
      // Only show masked values, don't populate the form
      // User needs to re-enter to update
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
        // Clear form
        setFormData({
          openai_key: '',
          elevenlabs_key: '',
          creatomate_key: '',
          creatomate_template_id: '',
          stability_ai_key: '',
          youtube_credentials: ''
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
          <label htmlFor="youtube_credentials">
            YouTube API 認証情報
            <span className="help-text">（オプション）YouTubeへの自動アップロードに必要です</span>
            <button
              type="button"
              className="help-button"
              onClick={() => setShowYouTubeHelp(!showYouTubeHelp)}
            >
              {showYouTubeHelp ? '▼' : '▶'} 設定方法を表示
            </button>
          </label>
          
          {showYouTubeHelp && (
            <div className="help-box">
              <h4>YouTube API 認証情報の取得方法:</h4>
              <ol>
                <li>Google Cloud Console で新しいプロジェクトを作成</li>
                <li>YouTube Data API v3 を有効化</li>
                <li>OAuth 2.0 クライアントIDを作成</li>
                <li>認証後、以下のJSON形式で入力:
                  <pre>{`{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "access_token": "your-access-token",
  "refresh_token": "your-refresh-token"
}`}</pre>
                </li>
              </ol>
              <a 
                href="https://console.cloud.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="get-key-link"
              >
                → Google Cloud Console
              </a>
            </div>
          )}
          
          <textarea
            id="youtube_credentials"
            name="youtube_credentials"
            value={formData.youtube_credentials}
            onChange={handleChange}
            placeholder='{"client_id": "...", "client_secret": "...", ...}'
            className="form-textarea"
            rows="4"
          />
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
