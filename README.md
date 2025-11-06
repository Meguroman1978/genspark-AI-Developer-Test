# 🎬 AI自動動画生成アプリケーション

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**完全自動でプロフェッショナルな動画を生成し、YouTubeにアップロード！**

このアプリケーションは、ユーザーが入力したテーマに基づいて、Web検索からYouTubeアップロードまでの全プロセスを完全自動で実行します。外部ツール（n8nなど）は不要で、アプリ単体で完結します。

## ✨ 主な機能

### 🔄 完全自動ワークフロー
1. **📚 情報収集**: Wikipedia・Web検索で自動的にテーマについて調査
2. **✍️ スクリプト生成**: GPT-4が魅力的なナレーション原稿を作成
3. **🎙️ 音声生成**: ElevenLabsで高品質なナレーション音声を合成
4. **🎨 ビジュアル準備**: DALL-E 3で画像生成、Pexelsで動画素材取得
5. **🎬 動画編集**: Creatomateで音声と映像を統合
6. **📤 YouTubeアップロード**: 完成した動画を自動アップロード

### 🔑 APIキー管理システム
- ユーザーごとにAPIキーを安全に保存
- OpenAI、ElevenLabs、Creatomate、YouTube APIに対応
- ブラウザ側での入力と、サーバー側での暗号化保存

### 📊 リアルタイム進捗表示
- 処理の各ステップをリアルタイムで表示
- 生成履歴の管理と閲覧
- YouTube動画URLへの直接リンク

## 🚀 クイックスタート

### 必要な環境
- Node.js 16以上
- npm または yarn

### インストールと起動

#### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd webapp
```

#### 2. バックエンドのセットアップ
```bash
cd backend
npm install
node server.js
```
バックエンドはポート5000で起動します。

#### 3. フロントエンドのセットアップ
```bash
cd ../frontend
npm install
npm start
```
フロントエンドはポート3000（または3001）で起動します。

#### 4. ブラウザでアクセス
```
http://localhost:3000
```

### 🌐 デモURL（現在稼働中）
- **フロントエンド**: https://3001-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai
- **バックエンドAPI**: https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai

## 🔧 APIキーの設定

アプリケーションを使用するには、以下のAPIキーが必要です：

### 必須APIキー

#### 1. OpenAI API Key（必須）
- **取得先**: https://platform.openai.com/api-keys
- **用途**: GPT-4でのスクリプト生成、DALL-E 3での画像生成
- **料金**: 従量課金制（GPT-4使用時）

#### 2. ElevenLabs API Key（必須）
- **取得先**: https://elevenlabs.io/api
- **用途**: 高品質なナレーション音声の生成
- **料金**: 無料プランあり（月10,000文字まで）

### オプションAPIキー

#### 3. Creatomate API Key（オプション）
- **取得先**: https://creatomate.com/docs/api/rest-api
- **用途**: プロフェッショナルな動画編集
- **料金**: 無料トライアルあり
- **注意**: 未設定の場合は簡易版で動作します

#### 4. YouTube API認証情報（オプション）
- **取得先**: https://console.cloud.google.com/
- **用途**: YouTubeへの自動アップロード
- **設定方法**:
  1. Google Cloud Consoleで新しいプロジェクトを作成
  2. YouTube Data API v3を有効化
  3. OAuth 2.0クライアントIDを作成
  4. 認証後、JSON形式で入力

#### 5. Pexels API Key（オプション）
- **取得先**: https://www.pexels.com/api/
- **用途**: 著作権フリーの動画素材の検索
- **料金**: 完全無料
- **設定**: `backend/services/pexelsService.js`で設定

## 📖 使い方

### 1. APIキーの設定
1. アプリケーションを開く
2. 「⚙️ 設定（APIキー）」タブをクリック
3. 各APIキーを入力
4. 「💾 APIキーを保存」をクリック

### 2. 動画の生成
1. 「🎥 動画生成」タブをクリック
2. 以下の情報を入力：
   - **動画のテーマ**: 例「未来都市」「深海の生物」など
   - **動画の長さ**: 10〜120秒
   - **YouTubeチャンネル名**: （オプション）
   - **公開設定**: 公開、限定公開、非公開から選択
3. 「🚀 動画を生成・アップロード」をクリック
4. 処理の進捗をリアルタイムで確認
5. 完了後、YouTube URLをクリックして視聴

### 3. 生成履歴の確認
- 「📋 最近の生成履歴」セクションで過去の動画を確認
- YouTube URLから直接動画にアクセス可能

## 🏗️ プロジェクト構造

```
webapp/
├── backend/                    # バックエンドサーバー
│   ├── server.js              # メインサーバーファイル
│   ├── routes/                # APIルート
│   │   ├── apiKeys.js        # APIキー管理
│   │   └── videoGenerator.js # 動画生成
│   ├── services/              # ビジネスロジック
│   │   ├── videoGeneratorService.js  # 動画生成メインロジック
│   │   ├── searchService.js          # Web/Wikipedia検索
│   │   ├── elevenlabsService.js      # 音声生成
│   │   ├── pexelsService.js          # 動画素材検索
│   │   ├── creatomateService.js      # 動画編集
│   │   └── youtubeService.js         # YouTubeアップロード
│   ├── database.sqlite        # SQLiteデータベース
│   └── package.json           # 依存関係
│
├── frontend/                   # フロントエンド（React + Vite）
│   ├── src/
│   │   ├── App.js            # メインアプリコンポーネント
│   │   ├── components/
│   │   │   ├── ApiKeysSettings.js     # APIキー設定UI
│   │   │   └── VideoGenerator.js      # 動画生成UI
│   │   ├── index.js          # エントリーポイント
│   │   └── *.css             # スタイルシート
│   ├── index.html            # HTMLテンプレート
│   ├── vite.config.js        # Vite設定
│   └── package.json          # 依存関係
│
└── README.md                  # このファイル
```

## 🔒 セキュリティについて

### APIキーの保存
- APIキーはサーバー側のSQLiteデータベースに保存されます
- 通信はHTTPS経由で暗号化されます（本番環境）
- フロントエンドではマスク表示（末尾4文字のみ表示）

### 本番環境での推奨事項
1. 環境変数の使用（`.env`ファイル）
2. データベースの暗号化
3. レート制限の実装
4. CORS設定の厳格化
5. HTTPS通信の強制

## 🛠️ 技術スタック

### バックエンド
- **Node.js**: ランタイム環境
- **Express.js**: Webフレームワーク
- **SQLite**: データベース
- **OpenAI API**: GPT-4、DALL-E 3
- **ElevenLabs API**: 音声合成
- **Creatomate API**: 動画編集
- **YouTube Data API v3**: 動画アップロード
- **Axios**: HTTP クライアント

### フロントエンド
- **React 18**: UIライブラリ
- **Vite**: ビルドツール
- **CSS3**: スタイリング
- **Axios**: APIクライアント

## 📝 API エンドポイント

### APIキー管理
- `GET /api/keys?userId=<userId>` - APIキーの取得（マスク済み）
- `POST /api/keys` - APIキーの保存・更新
- `GET /api/keys/actual?userId=<userId>` - 実際のAPIキー取得（内部用）

### 動画生成
- `POST /api/video/generate` - 動画生成の開始
- `GET /api/video/status/:jobId` - ジョブステータスの確認
- `GET /api/video/jobs?userId=<userId>` - ユーザーのジョブ履歴取得

### ヘルスチェック
- `GET /health` - サーバーの稼働状態確認

## 🎯 今後の改善予定

- [ ] ユーザー認証機能の追加
- [ ] 複数の音声・スタイルの選択肢
- [ ] 動画プレビュー機能
- [ ] より高度な動画編集オプション
- [ ] 複数言語対応
- [ ] クラウドストレージ連携
- [ ] バッチ処理（複数動画の一括生成）

## 🐛 トラブルシューティング

### よくある問題

#### 1. バックエンドが起動しない
```bash
# ポート5000が使用中の場合
lsof -ti:5000 | xargs kill -9
```

#### 2. フロントエンドが起動しない
```bash
# node_modulesを再インストール
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. APIキーエラー
- APIキーが正しく入力されているか確認
- APIキーの有効期限を確認
- 各サービスのAPI使用量制限を確認

#### 4. 動画生成が失敗する
- OpenAIとElevenLabsのAPIキーが必須です
- API使用量制限に達していないか確認
- ネットワーク接続を確認

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 👥 作者

AI Video Generator Team

## 📮 お問い合わせ

問題や質問がある場合は、GitHubのissueを開いてください。

---

**注意**: このアプリケーションは、各種APIの利用料金が発生する可能性があります。使用前に各サービスの料金プランを確認してください。
