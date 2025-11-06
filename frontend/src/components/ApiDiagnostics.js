import React, { useState } from 'react';
import './ApiDiagnostics.css';

function ApiDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setTesting(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/diagnostics/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'default_user'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || '診断の実行に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました: ' + err.message);
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
      case 'warning':
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
      case 'warning':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="api-diagnostics">
      <h2>🔬 API診断</h2>
      <p className="description">
        設定されたAPIキーの動作確認を行います。各APIに実際のリクエストを送信して、正常に動作するかをチェックします。
      </p>

      <button 
        onClick={runDiagnostics} 
        className="diagnose-button"
        disabled={testing}
      >
        {testing ? '🔄 診断中...' : '🚀 診断を実行'}
      </button>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {results && (
        <div className="diagnostic-results">
          <h3>📊 診断結果</h3>
          
          {results.openai && (
            <div className="diagnostic-card" style={{ borderLeft: `4px solid ${getStatusColor(results.openai.status)}` }}>
              <div className="diagnostic-header">
                <span className="diagnostic-icon">{getStatusIcon(results.openai.status)}</span>
                <span className="diagnostic-name">OpenAI API</span>
                <span className="diagnostic-status" style={{ color: getStatusColor(results.openai.status) }}>
                  {results.openai.status === 'success' ? '正常' : 'エラー'}
                </span>
              </div>
              <div className="diagnostic-details">
                <p><strong>メッセージ:</strong> {results.openai.message}</p>
                {results.openai.details && (
                  <div className="detail-section">
                    <p><strong>詳細:</strong></p>
                    <p className="detail-text">{results.openai.details}</p>
                  </div>
                )}
                {results.openai.solution && (
                  <div className="solution-section">
                    <p><strong>📋 対応方法:</strong></p>
                    <pre className="solution-text">{results.openai.solution}</pre>
                  </div>
                )}
                {results.openai.error && <p className="error-detail">技術的エラー: {results.openai.error}</p>}
              </div>
            </div>
          )}

          {results.elevenlabs && (
            <div className="diagnostic-card" style={{ borderLeft: `4px solid ${getStatusColor(results.elevenlabs.status)}` }}>
              <div className="diagnostic-header">
                <span className="diagnostic-icon">{getStatusIcon(results.elevenlabs.status)}</span>
                <span className="diagnostic-name">ElevenLabs API</span>
                <span className="diagnostic-status" style={{ color: getStatusColor(results.elevenlabs.status) }}>
                  {results.elevenlabs.status === 'success' ? '正常' : 'エラー'}
                </span>
              </div>
              <div className="diagnostic-details">
                <p><strong>メッセージ:</strong> {results.elevenlabs.message}</p>
                {results.elevenlabs.details && (
                  <div className="detail-section">
                    <p><strong>詳細:</strong></p>
                    <p className="detail-text">{results.elevenlabs.details}</p>
                  </div>
                )}
                {results.elevenlabs.solution && (
                  <div className="solution-section">
                    <p><strong>📋 対応方法:</strong></p>
                    <pre className="solution-text">{results.elevenlabs.solution}</pre>
                  </div>
                )}
                {results.elevenlabs.error && <p className="error-detail">技術的エラー: {results.elevenlabs.error}</p>}
              </div>
            </div>
          )}

          {results.creatomate && (
            <div className="diagnostic-card" style={{ borderLeft: `4px solid ${getStatusColor(results.creatomate.status)}` }}>
              <div className="diagnostic-header">
                <span className="diagnostic-icon">{getStatusIcon(results.creatomate.status)}</span>
                <span className="diagnostic-name">Creatomate API</span>
                <span className="diagnostic-status" style={{ color: getStatusColor(results.creatomate.status) }}>
                  {results.creatomate.status === 'success' ? '正常' : 'エラー'}
                </span>
              </div>
              <div className="diagnostic-details">
                <p><strong>メッセージ:</strong> {results.creatomate.message}</p>
                {results.creatomate.details && (
                  <div className="detail-section">
                    <p><strong>詳細:</strong></p>
                    <p className="detail-text">{results.creatomate.details}</p>
                  </div>
                )}
                {results.creatomate.solution && (
                  <div className="solution-section">
                    <p><strong>📋 対応方法:</strong></p>
                    <pre className="solution-text">{results.creatomate.solution}</pre>
                  </div>
                )}
                {results.creatomate.error && <p className="error-detail">技術的エラー: {results.creatomate.error}</p>}
              </div>
            </div>
          )}

          {results.stability_ai && (
            <div className="diagnostic-card" style={{ borderLeft: `4px solid ${getStatusColor(results.stability_ai.status)}` }}>
              <div className="diagnostic-header">
                <span className="diagnostic-icon">{getStatusIcon(results.stability_ai.status)}</span>
                <span className="diagnostic-name">Stability AI API</span>
                <span className="diagnostic-status" style={{ color: getStatusColor(results.stability_ai.status) }}>
                  {results.stability_ai.status === 'success' ? '正常' : 'エラー'}
                </span>
              </div>
              <div className="diagnostic-details">
                <p><strong>メッセージ:</strong> {results.stability_ai.message}</p>
                {results.stability_ai.details && (
                  <div className="detail-section">
                    <p><strong>詳細:</strong></p>
                    <p className="detail-text">{results.stability_ai.details}</p>
                  </div>
                )}
                {results.stability_ai.solution && (
                  <div className="solution-section">
                    <p><strong>📋 対応方法:</strong></p>
                    <pre className="solution-text">{results.stability_ai.solution}</pre>
                  </div>
                )}
                {results.stability_ai.error && <p className="error-detail">技術的エラー: {results.stability_ai.error}</p>}
              </div>
            </div>
          )}

          {results.youtube && (
            <div className="diagnostic-card" style={{ borderLeft: `4px solid ${getStatusColor(results.youtube.status)}` }}>
              <div className="diagnostic-header">
                <span className="diagnostic-icon">{getStatusIcon(results.youtube.status)}</span>
                <span className="diagnostic-name">YouTube API</span>
                <span className="diagnostic-status" style={{ color: getStatusColor(results.youtube.status) }}>
                  {results.youtube.status === 'success' ? '正常' : 'エラー'}
                </span>
              </div>
              <div className="diagnostic-details">
                <p><strong>メッセージ:</strong> {results.youtube.message}</p>
                {results.youtube.details && (
                  <div className="detail-section">
                    <p><strong>詳細:</strong></p>
                    <p className="detail-text">{results.youtube.details}</p>
                  </div>
                )}
                {results.youtube.solution && (
                  <div className="solution-section">
                    <p><strong>📋 対応方法:</strong></p>
                    <pre className="solution-text">{results.youtube.solution}</pre>
                  </div>
                )}
                {results.youtube.error && <p className="error-detail">技術的エラー: {results.youtube.error}</p>}
              </div>
            </div>
          )}

          {!results.openai && !results.elevenlabs && !results.creatomate && !results.stability_ai && !results.youtube && (
            <div className="no-keys-message">
              <p>⚠️ APIキーが設定されていません。「⚙️ 設定」タブでAPIキーを入力してください。</p>
            </div>
          )}
        </div>
      )}

      <div className="diagnostic-info">
        <h3>📋 診断について</h3>
        <ul>
          <li><strong>OpenAI:</strong> GPT-4 APIへの接続とモデルリスト取得をテストします</li>
          <li><strong>ElevenLabs:</strong> 音声合成APIへの接続とユーザー情報取得をテストします</li>
          <li><strong>Creatomate:</strong> 動画編集APIへの接続とテンプレートリスト取得をテストします</li>
          <li><strong>Stability AI:</strong> 画像生成APIへの接続とアカウント情報取得をテストします</li>
          <li><strong>YouTube:</strong> OAuth認証情報の有効性とチャンネル情報取得をテストします</li>
        </ul>
        <p className="note">
          ⚠️ <strong>注意:</strong> この診断では実際のAPIリクエストを送信しますが、課金が発生するような操作（動画生成、音声合成など）は行いません。
        </p>
      </div>
    </div>
  );
}

export default ApiDiagnostics;
