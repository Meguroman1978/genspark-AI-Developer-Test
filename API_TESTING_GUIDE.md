# 🧪 APIテスト・トラブルシューティングガイド

このガイドでは、ElevenLabs、Creatomate、OpenAI各APIの動作確認方法と、エラーが発生した際のトラブルシューティング手順を説明します。

## 📊 ログの確認方法

### バックエンドログの表示

動画生成中のログは、バックエンドのコンソールに表示されます。

```bash
# バックエンドディレクトリで実行
cd backend
node server.js

# または、ログファイルに出力する場合
node server.js > logs/backend.log 2>&1
```

### ログの見方

各APIリクエストには以下のような絵文字アイコンが付いています：

- 🔍 **検索**: Web/Wikipedia検索
- ✍️ **スクリプト**: GPT-4によるスクリプト生成
- 🎙️ **音声**: ElevenLabsによる音声生成
- 🎨 **ビジュアル**: 画像・動画素材の準備
- 🎬 **動画**: Creatomateによる動画編集
- 📤 **アップロード**: YouTubeへのアップロード
- ✅ **成功**: 処理成功
- ❌ **エラー**: 処理失敗
- ⏳ **待機**: 処理中

### ログの例

```
[Job 1] 🎙️ Generating audio with ElevenLabs...
[Job 1] Text length: 245 characters
[Job 1] Voice ID: 21m00Tcm4TlvDq8ikWAM
[Job 1] Verifying API key...
[Job 1] ✅ API key verified. Available voices: 25
[Job 1] Sending TTS request...
[Job 1] ✅ Audio generated successfully
[Job 1] Response size: 48235 bytes
[Job 1] 💾 Audio saved to: /path/to/audio.mp3
[Job 1] 🔗 Audio URL: http://localhost:5000/temp/audio_1234567890.mp3
```

---

## 🔍 各APIの動作確認

### 1. OpenAI API (GPT-4)

#### テスト方法

```bash
# curlでテスト
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 期待される結果

- ステータスコード: 200
- レスポンス: 利用可能なモデルのリスト

#### よくあるエラー

| エラーコード | 原因 | 解決方法 |
|------------|------|---------|
| 401 | APIキーが無効 | APIキーを再確認 |
| 429 | レート制限超過 | 少し待ってから再試行 |
| 500 | OpenAIサーバーエラー | 時間を置いて再試行 |

#### アプリ内での確認

ログに以下が表示されればOK：
```
[Job X] Script generated: In life's journey...
```

エラーの場合：
```
❌ OpenAI API error: Invalid API key
```

---

### 2. ElevenLabs API (音声合成)

#### テスト方法

```bash
# APIキーの確認
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_API_KEY"
```

#### 期待される結果

- ステータスコード: 200
- レスポンス: 利用可能な音声のリスト

#### 簡単な音声生成テスト

```bash
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.8
    }
  }' \
  --output test_audio.mp3
```

#### よくあるエラー

| エラーコード | 原因 | 解決方法 |
|------------|------|---------|
| 401 | APIキーが無効 | ElevenLabsダッシュボードでキーを確認 |
| 403 | モデルが利用不可 | プランを確認、または別のモデルを試す |
| 422 | テキストが無効 | テキストの長さや文字を確認 |
| 429 | レート制限 | 無料プラン: 月10,000文字制限 |

#### アプリ内での確認

成功時のログ：
```
[Job X] 🎙️ Generating audio with ElevenLabs...
[Job X] ✅ API key verified. Available voices: 25
[Job X] ✅ Audio generated successfully
[Job X] Response size: 48235 bytes
[Job X] 💾 Audio saved to: /backend/temp/audio_xxx.mp3
```

エラー時のログ：
```
[Job X] ❌ API key verification failed:
{
  code: 401,
  message: 'Invalid API key. Please check your ElevenLabs API key.'
}
```

#### 無料プラン制限の確認

```bash
# 使用量を確認（ダッシュボードで）
# https://elevenlabs.io/dashboard
```

---

### 3. Creatomate API (動画編集)

#### テスト方法

```bash
# APIキーの確認
curl -X GET https://api.creatomate.com/v1/templates \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 期待される結果

- ステータスコード: 200
- レスポンス: 利用可能なテンプレートのリスト

#### テンプレートを使用した動画生成テスト

```bash
curl -X POST https://api.creatomate.com/v2/renders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "template_id": "8739fb2c-b1a4-4809-830a-3c10e5a622e0",
    "modifications": {
      "Image-1.source": "https://example.com/image1.jpg",
      "Voiceover-1.source": "https://example.com/audio1.mp3"
    }
  }'
```

#### レンダーステータスの確認

```bash
# レンダーIDを使用して確認
curl -X GET https://api.creatomate.com/v2/renders/RENDER_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### よくあるエラー

| エラーコード | 原因 | 解決方法 |
|------------|------|---------|
| 401 | APIキーが無効 | Creatomateダッシュボードでキーを確認 |
| 404 | テンプレートが見つからない | テンプレートIDを確認 |
| 422 | 無効なリクエスト | modificationsの形式を確認 |
| 403 | アクセス権限なし | サブスクリプション状態を確認 |

#### アプリ内での確認

成功時のログ：
```
[Job X] 🎬 Creating video with Creatomate...
[Job X] Template ID: 8739fb2c-b1a4-4809-830a-3c10e5a622e0
[Job X] ✅ API key verified. Available templates: 5
[Job X] ✅ Render created successfully
[Job X] Render ID: abc123...
[Job X] ⏳ Waiting for render to complete...
[Job X] Render status (1/60): processing
[Job X] Render status (2/60): processing
[Job X] Render status (3/60): succeeded
[Job X] ✅ Video completed: https://cdn.creatomate.com/...
```

エラー時のログ：
```
[Job X] ❌ API key verification failed:
{
  code: 401,
  message: 'Invalid API key. Please check your Creatomate API key.',
  technical: 'The provided API key is invalid.'
}
```

---

## 🔧 トラブルシューティング

### 問題: ElevenLabsで音声が生成されない

#### 確認事項

1. **APIキーの確認**
```bash
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_API_KEY"
```

2. **使用量の確認**
   - https://elevenlabs.io/dashboard
   - 無料プラン: 月10,000文字

3. **ログの確認**
```
[Job X] ❌ ElevenLabs API error: {
  code: 429,
  message: 'Rate limit exceeded. Please wait and try again.'
}
```

#### 解決方法

- **401エラー**: APIキーを設定画面で再入力
- **403エラー**: `eleven_multilingual_v2`が利用可能か確認、または`eleven_monolingual_v1`を試す
- **429エラー**: 月の使用量制限に達している可能性。翌月まで待つか、プランをアップグレード

---

### 問題: Creatomateで動画が生成されない

#### 確認事項

1. **APIキーの確認**
```bash
curl -X GET https://api.creatomate.com/v1/templates \
  -H "Authorization: Bearer YOUR_API_KEY"
```

2. **テンプレートIDの確認**
   - テンプレートID: `8739fb2c-b1a4-4809-830a-3c10e5a622e0`
   - Creatomateダッシュボードで確認

3. **レンダー失敗の詳細**
```bash
curl -X GET https://api.creatomate.com/v2/renders/RENDER_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 解決方法

- **401エラー**: APIキーを確認
- **404エラー**: テンプレートIDが正しいか確認
- **422エラー**: 音声URLと画像URLが有効か確認
- **Render failed**: レンダーのエラーメッセージを確認

---

### 問題: 動画生成が途中で止まる

#### 確認事項

1. **バックエンドのログを確認**
```bash
# どこで止まったか確認
tail -f logs/backend.log
```

2. **各ステップのステータス**
   - ✅ GPT-4: スクリプト生成
   - ❌ ElevenLabs: 音声生成 ← ここで止まっている？
   - ⏳ Creatomate: 動画編集
   - 📤 YouTube: アップロード

#### 解決方法

- どのAPIで失敗しているか特定
- 該当APIのトラブルシューティングを実施
- エラーメッセージをもとに対処

---

## 📝 エラーメッセージ一覧

### ElevenLabs

| メッセージ | 原因 | 対処法 |
|-----------|------|--------|
| Invalid API key | APIキーが間違っている | 設定画面で再入力 |
| Access forbidden | モデルが利用不可 | プランを確認 |
| Rate limit exceeded | 使用量制限 | 翌月まで待つ |
| Text too long | テキストが長すぎる | スクリプトを短縮 |

### Creatomate

| メッセージ | 原因 | 対処法 |
|-----------|------|--------|
| Invalid API key | APIキーが間違っている | 設定画面で再入力 |
| Template not found | テンプレートIDが無効 | IDを確認 |
| Invalid request | modificationsが不正 | フォーマットを確認 |
| Render failed | レンダリングエラー | 素材URLを確認 |

### OpenAI

| メッセージ | 原因 | 対処法 |
|-----------|------|--------|
| Invalid API key | APIキーが間違っている | 設定画面で再入力 |
| Rate limit exceeded | リクエスト過多 | 少し待つ |
| Model not found | モデルが存在しない | GPT-4が利用可能か確認 |

---

## 📞 サポート

問題が解決しない場合は、以下の情報を添えてGitHubのissueを作成してください：

1. エラーメッセージ（ログから）
2. どのAPIで失敗しているか
3. 使用しているAPIキーの種類（無料/有料プラン）
4. 動画のテーマと長さ

---

**Happy Debugging! 🐛🔍**
