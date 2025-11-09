import React, { useState, useEffect } from 'react';
import './VideoGenerator.css';

function VideoGenerator({ apiKeysConfigured }) {
  const [formData, setFormData] = useState({
    theme: '',
    duration: 10,  // デフォルトを10秒に変更
    videoTitle: '',  // YouTubeタイトル（オプション）
    videoDescription: '',  // YouTube説明文（オプション）
    privacyStatus: 'private',
    contentType: '',
    language: 'ja',
    thumbnailBackground: 'bg1_lantern_street',  // デフォルト: 提灯の路地
    videoFormat: 'normal',  // 'normal' (16:9) or 'shorts' (9:16)
    videoService: 'creatomate'  // 'creatomate', 'ffmpeg', or 'shotstack'
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
          videoTitle: formData.videoTitle,
          videoDescription: formData.videoDescription,
          privacyStatus: formData.privacyStatus,
          contentType: formData.contentType,
          language: formData.language,
          thumbnailBackground: formData.thumbnailBackground,
          videoFormat: formData.videoFormat
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
            <label htmlFor="thumbnailBackground">
              タイトル背景画像
              <span className="help-text">冒頭2秒のタイトルスクリーンの背景</span>
            </label>
            <select
              id="thumbnailBackground"
              name="thumbnailBackground"
              value={formData.thumbnailBackground}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="bg1_lantern_street">🏮 提灯の路地</option>
              <option value="bg2_castle_sakura">🏯 桜と城</option>
              <option value="bg3_winter_village">❄️ 雪の集落</option>
              <option value="bg4_festival_fireworks">🎆 祭りの花火</option>
              <option value="bg5_rice_field_fuji">🗻 田園と富士山</option>
              <option value="bg6_sunset_pagoda">🌅 夕焼けの塔</option>
              <option value="bg7_cherry_temple">🌸 桜の寺院</option>
              <option value="bg8_sakura_path">🌸 桜並木</option>
              <option value="bg9_bamboo_forest">🎋 竹林の道</option>
              <option value="bg10_shibuya_rain">🌧️ 雨の渋谷</option>
              <option value="cherry_blossom">🌸 桜の窓辺（旧）</option>
              <option value="none">なし（最初の画像を使用）</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="videoFormat">
              動画フォーマット
              <span className="help-text">YouTubeショート or 通常動画</span>
            </label>
            <select
              id="videoFormat"
              name="videoFormat"
              value={formData.videoFormat}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="normal">📺 通常動画 (16:9 横長)</option>
              <option value="shorts">📱 YouTubeショート (9:16 縦長)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="videoService">
              動画生成サービス
              <span className="help-text">使用する動画編集サービスを選択</span>
            </label>
            <select
              id="videoService"
              name="videoService"
              value={formData.videoService}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="creatomate">🎬 Creatomate (有料推奨)</option>
              <option value="ffmpeg">🆓 FFmpeg (完全無料・ローカル処理)</option>
              <option value="shotstack">⚡ Shotstack (月20回まで無料)</option>
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
            <label htmlFor="videoTitle">
              YouTube動画タイトル
              <span className="help-text">（オプション）未入力の場合は自動生成されます</span>
            </label>
            <input
              type="text"
              id="videoTitle"
              name="videoTitle"
              value={formData.videoTitle}
              onChange={handleChange}
              placeholder="例: 犬も歩けば棒にあたる - 日本のことわざ"
              className="form-input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="videoDescription">
              YouTube動画説明文
              <span className="help-text">（オプション）未入力の場合は自動生成されます</span>
            </label>
            <textarea
              id="videoDescription"
              name="videoDescription"
              value={formData.videoDescription}
              onChange={handleChange}
              placeholder="動画の説明文を入力してください..."
              className="form-input"
              rows="4"
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
                    <div className="video-links">
                      <a 
                        href={jobStatus.youtube_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="youtube-link primary-link"
                      >
                        🎬 YouTubeで視聴する
                      </a>
                      {jobStatus.video_url && (
                        <a 
                          href={jobStatus.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link secondary-link"
                        >
                          📥 動画ファイルをダウンロード
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="success-message">✅ 動画が正常に生成されました！</p>
                    {jobStatus.video_url && (
                      <div className="video-links">
                        <a 
                          href={jobStatus.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link primary-link"
                        >
                          🎬 動画を視聴する
                        </a>
                        <a 
                          href={jobStatus.video_url} 
                          download
                          className="video-link secondary-link"
                        >
                          📥 動画ファイルをダウンロード
                        </a>
                      </div>
                    )}
                    <div className="info-box">
                      {jobStatus.progress && jobStatus.progress.includes('YouTube upload failed') ? (
                        <>
                          <p>⚠️ <strong>YouTube アップロードに失敗しました</strong></p>
                          <p>動画は正常に生成されましたが、YouTubeへのアップロードに失敗しました。</p>
                          <p><strong>考えられる原因:</strong></p>
                          <ul>
                            <li>access_tokenの有効期限が切れている（約1時間）</li>
                            <li>YouTubeスコープが不足している</li>
                            <li>OAuth認証情報が無効</li>
                          </ul>
                          <p><strong>対処方法:</strong></p>
                          <ol>
                            <li>「🔍 API診断」タブでYouTube API接続を確認</li>
                            <li>エラーが出る場合は、OAuth 2.0 Playgroundで新しいトークンを取得</li>
                            <li>「⚙️ 設定」タブで新しいaccess_tokenを設定</li>
                            <li>上記の動画ファイルを手動でYouTubeにアップロード、または再生成</li>
                          </ol>
                        </>
                      ) : (
                        <>
                          <p>📝 <strong>注意:</strong> YouTube認証情報が設定されていないため、YouTubeへのアップロードはスキップされました。</p>
                          <p>動画をYouTubeにアップロードするには:</p>
                          <ol>
                            <li>「⚙️ 設定」タブでYouTube API認証情報を設定してください</li>
                            <li>再度動画を生成すると、自動的にYouTubeにアップロードされます</li>
                          </ol>
                        </>
                      )}
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

          {/* Debug Artifacts Section */}
          {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
            <div className="artifacts-section">
              <h4 className="artifacts-title">🔍 デバッグ情報（生成された中間ファイル）</h4>
              <p className="artifacts-description">
                動画生成過程で作成された各種ファイルを確認できます。動画内容が意図と異なる場合、これらを確認してください。
              </p>

              {/* Script Text */}
              {jobStatus.script_text && (
                <details className="artifact-details">
                  <summary className="artifact-summary">
                    <span className="artifact-icon">📝</span>
                    <span className="artifact-name">GPT-4生成スクリプト（ナレーション原稿）</span>
                  </summary>
                  <div className="artifact-content">
                    <pre className="script-text">{jobStatus.script_text}</pre>
                  </div>
                </details>
              )}

              {/* Audio URL */}
              {jobStatus.audio_url && (
                <details className="artifact-details">
                  <summary className="artifact-summary">
                    <span className="artifact-icon">🎙️</span>
                    <span className="artifact-name">ElevenLabs生成音声（ナレーション）</span>
                  </summary>
                  <div className="artifact-content">
                    <audio controls className="audio-player">
                      <source src={jobStatus.audio_url} type="audio/mpeg" />
                      お使いのブラウザは音声再生に対応していません。
                    </audio>
                    <a 
                      href={jobStatus.audio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="artifact-link"
                    >
                      🔗 音声ファイルを開く
                    </a>
                  </div>
                </details>
              )}

              {/* DALL-E Images */}
              {jobStatus.image_urls && jobStatus.image_urls.length > 0 && (
                <details className="artifact-details">
                  <summary className="artifact-summary">
                    <span className="artifact-icon">🎨</span>
                    <span className="artifact-name">DALL-E 3生成画像（{jobStatus.image_urls.length}枚）</span>
                  </summary>
                  <div className="artifact-content">
                    <div className="image-gallery">
                      {jobStatus.image_urls.map((url, index) => (
                        <div key={index} className="image-item">
                          <img src={url} alt={`Generated image ${index + 1}`} className="artifact-image" />
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="artifact-link"
                          >
                            🔗 画像 {index + 1} を開く
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Pexels Videos */}
              {jobStatus.pexels_urls && jobStatus.pexels_urls.length > 0 && (
                <details className="artifact-details">
                  <summary className="artifact-summary">
                    <span className="artifact-icon">📹</span>
                    <span className="artifact-name">Pexels動画素材（{jobStatus.pexels_urls.length}個）</span>
                  </summary>
                  <div className="artifact-content">
                    <div className="video-gallery">
                      {jobStatus.pexels_urls.map((url, index) => (
                        <div key={index} className="video-item">
                          <video controls className="artifact-video">
                            <source src={url} type="video/mp4" />
                            お使いのブラウザは動画再生に対応していません。
                          </video>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="artifact-link"
                          >
                            🔗 素材 {index + 1} を開く
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Final Video */}
              {jobStatus.video_url && (
                <details className="artifact-details" open>
                  <summary className="artifact-summary">
                    <span className="artifact-icon">🎬</span>
                    <span className="artifact-name">Creatomate最終動画</span>
                  </summary>
                  <div className="artifact-content">
                    <video controls className="final-video">
                      <source src={jobStatus.video_url} type="video/mp4" />
                      お使いのブラウザは動画再生に対応していません。
                    </video>
                    <a 
                      href={jobStatus.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="artifact-link"
                    >
                      🔗 動画ファイルを開く
                    </a>
                  </div>
                </details>
              )}

              {(!jobStatus.script_text && !jobStatus.audio_url && !jobStatus.image_urls && !jobStatus.pexels_urls && !jobStatus.video_url) && (
                <p className="no-artifacts">中間ファイルは保存されていません（この機能は最近追加されました）</p>
              )}
            </div>
          )}
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
                  <div className="job-links">
                    {job.youtube_url && (
                      <a 
                        href={job.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="job-link youtube-job-link"
                      >
                        🎬 YouTube
                      </a>
                    )}
                    {job.video_url && (
                      <a 
                        href={job.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="job-link video-job-link"
                      >
                        📥 動画
                      </a>
                    )}
                  </div>
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
