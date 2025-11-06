import React, { useState, useEffect } from 'react';
import './VideoGenerator.css';

function VideoGenerator({ apiKeysConfigured }) {
  const [formData, setFormData] = useState({
    theme: '',
    duration: 60,
    channelName: '',
    privacyStatus: 'private',
    contentType: '',
    language: 'ja'
  });
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    loadRecentJobs();
  }, []);

  useEffect(() => {
    let interval;
    if (jobId && jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed') {
      interval = setInterval(() => {
        checkJobStatus(jobId);
      }, 3000); // Check every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, jobStatus]);

  const loadRecentJobs = async () => {
    try {
      const response = await fetch('/api/video/jobs?userId=default_user');
      const jobs = await response.json();
      setRecentJobs(jobs);
    } catch (error) {
      console.error('Error loading recent jobs:', error);
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
    
    if (!apiKeysConfigured) {
      setError('APIキーが設定されていません。設定タブでAPIキーを入力してください。');
      return;
    }

    if (!formData.theme) {
      setError('動画のテーマを入力してください');
      return;
    }

    if (formData.duration < 10 || formData.duration > 120) {
      setError('動画の長さは10秒から120秒の間で指定してください');
      return;
    }

    setLoading(true);
    setError('');
    setJobStatus(null);

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'default_user',
          theme: formData.theme,
          duration: parseInt(formData.duration),
          channelName: formData.channelName,
          privacyStatus: formData.privacyStatus,
          contentType: formData.contentType,
          language: formData.language
        })
      });

      const data = await response.json();

      if (response.ok) {
        setJobId(data.jobId);
        setJobStatus({
          status: 'processing',
          progress: '動画生成を開始しました...'
        });
        loadRecentJobs(); // Reload job list
      } else {
        setError(data.error || '動画生成の開始に失敗しました');
        setLoading(false);
      }
    } catch (error) {
      setError('エラーが発生しました: ' + error.message);
      setLoading(false);
    }
  };

  const checkJobStatus = async (id) => {
    try {
      const response = await fetch(`/api/video/status/${id}`);
      const data = await response.json();
      
      setJobStatus(data);

      if (data.status === 'completed' || data.status === 'failed') {
        setLoading(false);
        loadRecentJobs(); // Reload job list
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return '⏳';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return '#ffc107';
      case 'completed':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="video-generator">
      <h2>🎥 動画生成</h2>
      <p className="description">
        テーマを入力するだけで、AI が自動的に情報収集・スクリプト作成・音声生成・動画編集・YouTubeアップロードまで行います。
      </p>

      <form onSubmit={handleSubmit} className="generator-form">
        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="theme">
              <span className="required">* </span>動画のテーマ
              <span className="help-text">例: 未来都市、深海の生物、古代文明の謎</span>
            </label>
            <input
              type="text"
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              placeholder="動画のテーマを入力してください"
              className="form-input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="duration">
              <span className="required">* </span>動画の長さ（秒）
              <span className="help-text">10〜120秒</span>
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="10"
              max="120"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">
              <span className="required">* </span>動画の言語
              <span className="help-text">スクリプトと音声の言語</span>
            </label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="ja">🇯🇵 日本語</option>
              <option value="en">🇺🇸 English</option>
              <option value="zh">🇨🇳 中文</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="privacyStatus">
              YouTube公開設定
            </label>
            <select
              id="privacyStatus"
              name="privacyStatus"
              value={formData.privacyStatus}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="private">非公開 (Private)</option>
              <option value="unlisted">限定公開 (Unlisted)</option>
              <option value="public">公開 (Public)</option>
            </select>
          </div>

          <div className="form-group">
            {/* Empty div for consistent grid layout */}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="contentType">
              動画コンテンツのタイプ
              <span className="help-text">（オプション）動画のスタイルを指定できます</span>
            </label>
            <select
              id="contentType"
              name="contentType"
              value={formData.contentType}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="">指定なし（自動判定）</option>
              <option value="story">物語</option>
              <option value="explanation">解説</option>
              <option value="educational">学習教材</option>
              <option value="howto">How-to</option>
              <option value="performing">パフォーミングアート</option>
              <option value="music">音楽動画（PV風）</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="channelName">
              YouTubeチャンネル名
              <span className="help-text">（オプション）説明文に記載されます</span>
            </label>
            <input
              type="text"
              id="channelName"
              name="channelName"
              value={formData.channelName}
              onChange={handleChange}
              placeholder="チャンネル名（オプション）"
              className="form-input"
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <button 
          type="submit" 
          className="generate-button" 
          disabled={loading || !apiKeysConfigured}
        >
          {loading ? '🔄 生成中...' : '🚀 動画を生成・アップロード'}
        </button>
      </form>

      {jobStatus && (
        <div className="job-status-card">
          <h3>
            {getStatusIcon(jobStatus.status)} 処理状況
          </h3>
          <div className="status-content">
            <div className="status-badge" style={{ background: getStatusColor(jobStatus.status) }}>
              {jobStatus.status === 'processing' && '処理中'}
              {jobStatus.status === 'completed' && '完了'}
              {jobStatus.status === 'failed' && '失敗'}
            </div>
            <div className="progress-text">
              {jobStatus.progress || '処理中...'}
            </div>
            {jobStatus.status === 'processing' && (
              <div className="loading-spinner"></div>
            )}
            {jobStatus.status === 'completed' && (
              <div className="success-result">
                {jobStatus.youtube_url ? (
                  <>
                    <p className="success-message">✅ 動画が正常に生成され、YouTubeにアップロードされました！</p>
                    <a 
                      href={jobStatus.youtube_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="youtube-link"
                    >
                      🎬 YouTubeで視聴する
                    </a>
                  </>
                ) : (
                  <>
                    <p className="success-message">✅ 動画が正常に生成されました！</p>
                    <div className="info-box">
                      <p>📝 <strong>注意:</strong> YouTube認証情報が設定されていないため、YouTubeへのアップロードはスキップされました。</p>
                      <p>動画をYouTubeにアップロードするには:</p>
                      <ol>
                        <li>「⚙️ 設定」タブでYouTube API認証情報を設定してください</li>
                        <li>再度動画を生成すると、自動的にYouTubeにアップロードされます</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            )}
            {jobStatus.status === 'failed' && jobStatus.error_message && (
              <div className="error-result">
                <p>エラー: {jobStatus.error_message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {recentJobs.length > 0 && (
        <div className="recent-jobs">
          <h3>📋 最近の生成履歴</h3>
          <div className="jobs-list">
            {recentJobs.map(job => (
              <div key={job.id} className="job-item">
                <div className="job-header">
                  <span className="job-icon">{getStatusIcon(job.status)}</span>
                  <span className="job-theme">{job.theme}</span>
                  <span className="job-duration">{job.duration}秒</span>
                </div>
                <div className="job-meta">
                  <span className="job-date">
                    {new Date(job.created_at).toLocaleString('ja-JP')}
                  </span>
                  {job.youtube_url && (
                    <a 
                      href={job.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-link"
                    >
                      YouTubeで見る →
                    </a>
                  )}
                </div>
                {job.progress && (
                  <div className="job-progress">{job.progress}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="workflow-info">
        <h3>🔄 処理フロー</h3>
        <ol className="workflow-steps">
          <li>📚 <strong>情報収集:</strong> Web検索・Wikipedia検索でテーマについて調査</li>
          <li>✍️ <strong>スクリプト生成:</strong> GPT-4が魅力的なナレーション原稿を作成</li>
          <li>🎙️ <strong>音声生成:</strong> ElevenLabsで高品質なナレーション音声を合成</li>
          <li>🎨 <strong>ビジュアル準備:</strong> DALL-E 3で画像生成 / Pexelsで動画素材取得</li>
          <li>🎬 <strong>動画編集:</strong> Creatomateで音声と映像を統合</li>
          <li>📤 <strong>YouTubeアップロード:</strong> 完成した動画を自動アップロード</li>
        </ol>
      </div>
    </div>
  );
}

export default VideoGenerator;
