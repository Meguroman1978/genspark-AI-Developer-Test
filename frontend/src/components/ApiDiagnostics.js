import React, { useState } from 'react';
import './ApiDiagnostics.css';

function ApiDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setTesting(true);
    setError('');
    setResults({});

    try {
      // Get API keys
      const keysResponse = await fetch('/api/keys/actual?userId=default_user');
      if (!keysResponse.ok) {
        throw new Error('APIキーが設定されていません');
      }

      const keys = await keysResponse.json();
      const newResults = {};

      // Test OpenAI
      if (keys.openai_key) {
        console.log('Testing OpenAI...');
        try {
          const response = await fetch('/api/diagnostics/test-openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: keys.openai_key })
          });
          const data = await response.json();
          newResults.openai = {
            status: data.success ? 'success' : 'error',
            message: data.message || data.error,
            details: data.details
          };
        } catch (err) {
          newResults.openai = {
            status: 'error',
            message: err.message
          };
        }
      } else {
        newResults.openai = { status: 'not_configured', message: 'APIキーが設定されていません' };
      }

      // Test ElevenLabs
      if (keys.elevenlabs_key) {
        console.log('Testing ElevenLabs...');
        try {
          const response = await fetch('/api/diagnostics/test-elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: keys.elevenlabs_key })
          });
          const data = await response.json();
          newResults.elevenlabs = {
            status: data.success ? 'success' : 'error',
            message: data.message || data.error,
            details: data.details,
            test: data.test
          };
        } catch (err) {
          newResults.elevenlabs = {
            status: 'error',
            message: err.message
          };
        }
      } else {
        newResults.elevenlabs = { status: 'not_configured', message: 'APIキーが設定されていません' };
      }

      // Test Creatomate
      if (keys.creatomate_key) {
        console.log('Testing Creatomate...');
        try {
          const response = await fetch('/api/diagnostics/test-creatomate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: keys.creatomate_key })
          });
          const data = await response.json();
          newResults.creatomate = {
            status: data.success ? 'success' : 'error',
            message: data.message || data.error || data.user_message,
            details: data.details
          };
        } catch (err) {
          newResults.creatomate = {
            status: 'error',
            message: err.message
          };
        }
      } else {
        newResults.creatomate = { status: 'not_configured', message: 'APIキーが設定されていません（オプション）' };
      }

      setResults(newResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'not_configured':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'not_configured':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="api-diagnostics">
      <h2>🔍 API診断ツール</h2>
      <p className="description">
        各APIサービスへの接続状態を確認し、問題があればエラーの詳細を表示します。
      </p>

      <button 
        onClick={runDiagnostics} 
        className="test-button"
        disabled={testing}
      >
        {testing ? '🔄 テスト中...' : '🚀 診断を実行'}
      </button>

      {error && (
        <div className="error-message">
          ❌ エラー: {error}
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="results-container">
          <h3>診断結果</h3>

          {/* OpenAI */}
          <div className="result-card" style={{ borderLeftColor: getStatusColor(results.openai?.status) }}>
            <div className="result-header">
              <span className="result-icon">{getStatusIcon(results.openai?.status)}</span>
              <h4>OpenAI API</h4>
            </div>
            <p className="result-message">{results.openai?.message}</p>
            {results.openai?.details && (
              <div className="result-details">
                <pre>{JSON.stringify(results.openai.details, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* ElevenLabs */}
          <div className="result-card" style={{ borderLeftColor: getStatusColor(results.elevenlabs?.status) }}>
            <div className="result-header">
              <span className="result-icon">{getStatusIcon(results.elevenlabs?.status)}</span>
              <h4>ElevenLabs API</h4>
            </div>
            <p className="result-message">{results.elevenlabs?.message}</p>
            {results.elevenlabs?.test && (
              <p className="result-test">失敗したテスト: {results.elevenlabs.test}</p>
            )}
            {results.elevenlabs?.details && (
              <div className="result-details">
                <pre>{JSON.stringify(results.elevenlabs.details, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Creatomate */}
          <div className="result-card" style={{ borderLeftColor: getStatusColor(results.creatomate?.status) }}>
            <div className="result-header">
              <span className="result-icon">{getStatusIcon(results.creatomate?.status)}</span>
              <h4>Creatomate API</h4>
            </div>
            <p className="result-message">{results.creatomate?.message}</p>
            {results.creatomate?.details && (
              <div className="result-details">
                <pre>{JSON.stringify(results.creatomate.details, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="help-section">
        <h3>📝 トラブルシューティング</h3>
        <div className="help-content">
          <h4>❌ エラーが表示される場合</h4>
          <ul>
            <li><strong>401 Unauthorized:</strong> APIキーが無効または期限切れです</li>
            <li><strong>403 Forbidden:</strong> アクセス権限がありません</li>
            <li><strong>429 Rate Limit:</strong> API使用量の制限に達しました</li>
            <li><strong>Network Error:</strong> インターネット接続を確認してください</li>
          </ul>

          <h4>✅ すべて成功する場合</h4>
          <p>APIキーは正常に設定されており、動画生成を開始できます！</p>

          <h4>⚠️ 設定されていない場合</h4>
          <p>「⚙️ 設定」タブでAPIキーを設定してください。</p>
        </div>
      </div>
    </div>
  );
}

export default ApiDiagnostics;
