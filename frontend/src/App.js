import React, { useState, useEffect } from 'react';
import './App.css';
import ApiKeysSettings from './components/ApiKeysSettings';
import VideoGenerator from './components/VideoGenerator';
import ApiDiagnostics from './components/ApiDiagnostics';

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [apiKeysConfigured, setApiKeysConfigured] = useState(false);

  useEffect(() => {
    // Check if API keys are configured
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      const response = await fetch('/api/keys?userId=default_user');
      const data = await response.json();
      
      // Check if at least OpenAI and ElevenLabs keys are configured
      const isConfigured = data.openai_key && data.elevenlabs_key;
      setApiKeysConfigured(isConfigured);
      
      if (!isConfigured) {
        setActiveTab('settings');
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
    }
  };

  const handleApiKeysSaved = () => {
    setApiKeysConfigured(true);
    setActiveTab('generator');
    alert('APIキーが保存されました！動画生成を開始できます。');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 AI自動動画生成アプリ</h1>
        <p className="subtitle">AIで完全自動！動画の企画・生成・YouTubeアップロードまで</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          🎥 動画生成
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ 設定（APIキー）
        </button>
        <button
          className={`tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          🔍 API診断
        </button>
      </div>

      <div className="content">
        {!apiKeysConfigured && activeTab === 'generator' && (
          <div className="warning-banner">
            ⚠️ APIキーが設定されていません。「設定」タブでAPIキーを入力してください。
          </div>
        )}

        {activeTab === 'generator' && (
          <VideoGenerator apiKeysConfigured={apiKeysConfigured} />
        )}

        {activeTab === 'settings' && (
          <ApiKeysSettings onSaved={handleApiKeysSaved} />
        )}

        {activeTab === 'diagnostics' && (
          <ApiDiagnostics />
        )}
      </div>

      <footer className="App-footer">
        <p>
          このアプリは、Web検索 → スクリプト生成 → 音声合成 → 動画編集 → YouTubeアップロード
          まで、全てを自動で行います。
        </p>
        <p className="tech-stack">
          使用技術: OpenAI GPT-4 | ElevenLabs | Creatomate | YouTube API | Wikipedia
        </p>
      </footer>
    </div>
  );
}

export default App;
