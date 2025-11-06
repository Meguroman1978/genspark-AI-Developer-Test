# 📘 AI自動動画生成アプリ - 使用ガイド

## 🎯 このガイドについて

このガイドでは、AI自動動画生成アプリの詳しい使用方法を説明します。初めて使う方から、高度な機能を使いたい方まで、ステップバイステップで解説します。

## 📋 目次

1. [初期設定](#初期設定)
2. [APIキーの取得方法](#apiキーの取得方法)
3. [動画生成の手順](#動画生成の手順)
4. [YouTube連携の設定](#youtube連携の設定)
5. [ヒントとベストプラクティス](#ヒントとベストプラクティス)
6. [トラブルシューティング](#トラブルシューティング)

---

## 🚀 初期設定

### 1. アプリケーションの起動

#### バックエンドの起動
```bash
cd backend
npm install
node server.js
```

#### フロントエンドの起動
```bash
cd frontend
npm install
npm start
```

### 2. ブラウザでアクセス
```
http://localhost:3000
```

---

## 🔑 APIキーの取得方法

### OpenAI API Key（必須）

1. **OpenAI公式サイトにアクセス**
   - URL: https://platform.openai.com/

2. **アカウントを作成/ログイン**
   - 「Sign up」または「Log in」をクリック

3. **APIキーページへ移動**
   - URL: https://platform.openai.com/api-keys

4. **新しいAPIキーを作成**
   - 「Create new secret key」をクリック
   - キー名を入力（例: "AI Video Generator"）
   - 生成されたキーを必ずコピーして保存（一度しか表示されません）

5. **料金プランの確認**
   - 無料トライアル: $5分のクレジット
   - 従量課金制: GPT-4は1,000トークンあたり約$0.03

**例**: `sk-proj-abc123...xyz789`

### ElevenLabs API Key（必須）

1. **ElevenLabs公式サイトにアクセス**
   - URL: https://elevenlabs.io/

2. **アカウントを作成/ログイン**
   - 「Get Started」をクリック

3. **API設定ページへ移動**
   - ダッシュボード → Profile Settings → API Keys

4. **新しいAPIキーを生成**
   - 「Generate」をクリック
   - キーをコピー

5. **無料プランの制限**
   - 月10,000文字まで無料
   - 約3〜5本の動画（60秒想定）

**例**: `a1b2c3d4e5f6...`

### Creatomate API Key（オプション）

1. **Creatomate公式サイトにアクセス**
   - URL: https://creatomate.com/

2. **アカウントを作成**
   - 無料トライアルあり

3. **APIキーを取得**
   - Dashboard → API Keys
   - 新しいキーを生成

4. **テンプレートの設定**
   - 動画編集用のテンプレートを作成
   - テンプレートIDをメモ

**注意**: Creatomateキーが未設定の場合、簡易版で動作します。

### Pexels API Key（オプション）

1. **Pexels APIページにアクセス**
   - URL: https://www.pexels.com/api/

2. **アカウント作成とAPIキー取得**
   - 「Get Started」をクリック
   - アカウント作成後、自動的にAPIキーが発行される

3. **完全無料**
   - 使用制限: 月200回まで（十分な量）

4. **バックエンドでの設定**
   ```javascript
   // backend/services/pexelsService.js
   this.apiKey = 'YOUR_PEXELS_API_KEY';
   ```

---

## 🎬 動画生成の手順

### ステップ1: APIキーの設定

1. アプリケーションを開く
2. **「⚙️ 設定（APIキー）」タブ**をクリック
3. 必須APIキーを入力：
   - OpenAI API Key
   - ElevenLabs API Key
4. オプションでCreatomate、YouTubeキーも入力
5. **「💾 APIキーを保存」**をクリック

### ステップ2: 動画テーマの決定

**良いテーマの例**:
- ✅ 「未来都市の建築技術」
- ✅ 「深海に生息する発光生物」
- ✅ 「古代エジプトのピラミッド建設」
- ✅ 「宇宙探査の最新技術」

**避けるべきテーマ**:
- ❌ 「動画を作って」（具体性がない）
- ❌ 「面白いこと」（抽象的すぎる）

### ステップ3: 動画設定の入力

1. **「🎥 動画生成」タブ**をクリック
2. フォームに入力：

   ```
   動画のテーマ: 未来都市の建築技術
   動画の長さ: 60秒
   YouTubeチャンネル名: AI Tech Channel（オプション）
   公開設定: 非公開
   ```

3. **「🚀 動画を生成・アップロード」**をクリック

### ステップ4: 処理の監視

処理は以下の順序で進みます：

```
⏳ 処理中...

1. 📚 情報収集中...
   → Wikipedia/Web検索でテーマについて調査

2. ✍️ スクリプト作成中...
   → GPT-4が魅力的なナレーション原稿を作成

3. 🎙️ 音声生成中...
   → ElevenLabsで高品質な音声を合成

4. 🎨 ビジュアル準備中...
   → 画像生成・動画素材検索

5. 🎬 動画編集中...
   → Creatomateで統合

6. 📤 YouTubeアップロード中...
   → 動画を自動アップロード

✅ 完了！
```

### ステップ5: 結果の確認

1. **処理完了後**、YouTube URLが表示されます
2. **「🎬 YouTubeで視聴する」**をクリック
3. 生成履歴から過去の動画も確認可能

---

## 🎥 YouTube連携の設定

### OAuth 2.0認証の設定

#### 1. Google Cloud Consoleでプロジェクト作成

1. **Google Cloud Consoleにアクセス**
   - URL: https://console.cloud.google.com/

2. **新しいプロジェクトを作成**
   - 「プロジェクトを選択」→「新しいプロジェクト」
   - プロジェクト名: 例「AI Video Generator」

3. **YouTube Data API v3を有効化**
   - 「APIとサービス」→「ライブラリ」
   - 「YouTube Data API v3」を検索
   - 「有効にする」をクリック

#### 2. OAuth 2.0クライアントIDの作成

1. **認証情報ページへ移動**
   - 「APIとサービス」→「認証情報」

2. **OAuth同意画面を設定**
   - 「OAuth同意画面」をクリック
   - ユーザータイプ: 「外部」を選択
   - アプリ名、サポートメールなどを入力

3. **スコープの追加**
   - 「スコープを追加または削除」
   - 以下を追加:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube`

4. **OAuth 2.0クライアントIDを作成**
   - 「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 承認済みのリダイレクトURI: `http://localhost:5000/oauth2callback`

5. **クライアントIDとシークレットをコピー**

#### 3. アクセストークンの取得

**方法1: コマンドラインツールを使用**

```bash
# Google OAuth Playgroundを使用
# https://developers.google.com/oauthplayground/
```

**方法2: 認証フローの実装**

```javascript
// 認証URLの生成
const authUrl = youtubeService.generateAuthUrl(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:5000/oauth2callback'
);
console.log('以下のURLで認証してください:', authUrl);
```

#### 4. 認証情報をアプリに設定

以下のJSON形式でアプリに入力:

```json
{
  "client_id": "123456789-abcdefg.apps.googleusercontent.com",
  "client_secret": "GOCSPX-abc123xyz",
  "access_token": "ya29.a0AfH6SMB...",
  "refresh_token": "1//0gA1B2C3D4E5F...",
  "token_type": "Bearer",
  "expiry_date": 1633024800000
}
```

---

## 💡 ヒントとベストプラクティス

### 動画生成のコツ

#### 1. テーマの選び方
- **具体的に**: 「動物」より「サバンナのライオンの狩り」
- **教育的**: 知識や情報が含まれるテーマが良い
- **視覚的**: 映像で表現しやすいテーマを選ぶ

#### 2. 動画の長さ
- **初心者**: 30〜60秒がおすすめ
- **標準**: 60秒が最も安定
- **長尺**: 90〜120秒（コストと時間増加）

#### 3. APIコストの節約
- **テスト時**: 短い動画（30秒）で試す
- **本番**: 満足したら長い動画を生成
- **キャッシュ**: 同じテーマは避ける

### セキュリティのベストプラクティス

1. **APIキーの管理**
   - 定期的にキーをローテーション
   - 使用していないキーは削除
   - .envファイルにバックアップ

2. **YouTube認証**
   - リフレッシュトークンを安全に保管
   - アクセストークンの有効期限に注意

3. **データベース**
   - 定期的にバックアップ
   - 本番環境では暗号化を検討

---

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 「APIキーが無効です」エラー

**原因**:
- APIキーが正しくない
- APIキーの有効期限切れ
- API使用量の制限超過

**解決方法**:
```bash
# APIキーを確認
# 1. コピー時にスペースが入っていないか
# 2. キーが完全にコピーされているか
# 3. 各サービスのダッシュボードで使用量を確認
```

#### 2. 「動画生成に失敗しました」エラー

**原因**:
- OpenAIまたはElevenLabsのAPIキーが未設定
- API使用量制限
- ネットワークエラー

**解決方法**:
1. APIキーが正しく設定されているか確認
2. 各サービスのダッシュボードで使用量を確認
3. ネットワーク接続を確認
4. しばらく待ってから再試行

#### 3. 音声が生成されない

**原因**:
- ElevenLabsの月間制限超過
- APIキーが無効

**解決方法**:
```bash
# ElevenLabsダッシュボードで使用量を確認
# https://elevenlabs.io/dashboard

# 無料プラン: 月10,000文字まで
# 約60秒動画 = 約2,000文字
```

#### 4. YouTubeアップロードが失敗する

**原因**:
- OAuth認証の有効期限切れ
- YouTube API割り当て超過
- 動画ファイルが大きすぎる

**解決方法**:
1. OAuth認証情報を再取得
2. YouTube Data API v3の割り当てを確認
3. 動画の長さを短くする

#### 5. サーバーが起動しない

**原因**:
- ポート5000が使用中
- 依存関係がインストールされていない

**解決方法**:
```bash
# ポート5000を解放
lsof -ti:5000 | xargs kill -9

# 依存関係を再インストール
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 使用量の目安

### API使用量とコスト（60秒動画の場合）

| サービス | 使用量 | コスト（目安） |
|---------|--------|--------------|
| OpenAI (GPT-4) | 約5,000トークン | $0.15 |
| OpenAI (DALL-E 3) | 3〜5画像 | $0.12〜$0.20 |
| ElevenLabs | 約2,000文字 | 無料プラン内 |
| Creatomate | 1レンダリング | $0.10〜$0.50 |
| Pexels | 3〜5リクエスト | 無料 |
| YouTube | アップロード | 無料 |

**合計**: 約$0.37〜$0.85 / 動画

### 無料プランでできること

- **OpenAI**: $5無料クレジット = 約30本
- **ElevenLabs**: 月10,000文字 = 約5本
- **Pexels**: 完全無料
- **YouTube**: 完全無料

---

## 🎓 高度な使い方

### カスタマイズ

#### 1. 音声の変更
```javascript
// backend/services/elevenlabsService.js
this.defaultVoiceId = 'YOUR_VOICE_ID'; // 好みの音声に変更
```

#### 2. スクリプトのスタイル調整
```javascript
// backend/services/videoGeneratorService.js
// プロンプトをカスタマイズ
```

#### 3. 動画テンプレートの変更
```javascript
// backend/services/creatomateService.js
template_id: 'YOUR_TEMPLATE_ID'
```

---

## 📞 サポート

問題が解決しない場合:

1. GitHubのissueを確認
2. 新しいissueを作成
3. エラーログを添付

---

**Happy Video Creating! 🎬✨**
