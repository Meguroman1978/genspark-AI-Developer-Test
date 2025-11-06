# 📺 YouTube API 認証設定ガイド

このガイドでは、AI自動動画生成アプリからYouTubeに自動アップロードするための認証設定方法を詳しく説明します。

## 🎯 概要

YouTube APIを使用して動画を自動アップロードするには、Google Cloud ConsoleでOAuth 2.0認証を設定する必要があります。

**所要時間**: 約15〜20分  
**難易度**: 中級  
**費用**: 完全無料

---

## 📋 前提条件

- Googleアカウント（YouTubeアカウント）
- YouTubeチャンネルの作成済み

---

## 🔧 ステップ1: Google Cloud プロジェクトの作成

### 1. Google Cloud Console にアクセス

https://console.cloud.google.com/

### 2. 新しいプロジェクトを作成

1. 画面上部の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: "AI Video Generator"）
4. 「作成」をクリック

---

## 🔌 ステップ2: YouTube Data API v3 の有効化

### 1. APIライブラリに移動

1. 左側メニューから「APIとサービス」→「ライブラリ」を選択
2. 検索バーに「YouTube Data API v3」と入力
3. 「YouTube Data API v3」をクリック

### 2. APIを有効化

1. 「有効にする」ボタンをクリック
2. 有効化が完了するまで数秒待つ

---

## 🔐 ステップ3: OAuth 2.0 認証情報の作成

### 1. OAuth同意画面の設定

1. 左側メニューから「APIとサービス」→「OAuth同意画面」を選択
2. 「外部」を選択して「作成」をクリック

#### アプリ情報の入力

- **アプリ名**: AI Video Generator（任意）
- **ユーザーサポートメール**: あなたのメールアドレス
- **デベロッパーの連絡先**: あなたのメールアドレス

「保存して次へ」をクリック

#### スコープの設定

1. 「スコープを追加または削除」をクリック
2. 検索バーで「YouTube」を検索
3. 以下のスコープにチェックを入れる:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
4. 「更新」→「保存して次へ」

#### テストユーザーの追加

1. 「ユーザーを追加」をクリック
2. あなたのGoogleアカウントのメールアドレスを入力
3. 「保存して次へ」

#### 概要を確認

「ダッシュボードに戻る」をクリック

### 2. OAuth クライアントIDの作成

1. 左側メニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック

#### アプリケーションの種類を選択

- **アプリケーションの種類**: ウェブアプリケーション
- **名前**: AI Video Generator Web Client（任意）

#### 承認済みのリダイレクトURI

以下のURIを追加:
```
http://localhost:5000/oauth2callback
```

「作成」をクリック

### 3. クライアントIDとシークレットを保存

作成されたOAuthクライアントから以下をコピーして保存:
- **クライアントID**: `123456789-abcdefg.apps.googleusercontent.com`
- **クライアントシークレット**: `GOCSPX-abc123xyz`

---

## 🎫 ステップ4: アクセストークンの取得

### 方法1: Google OAuth 2.0 Playground（推奨）

1. **OAuth 2.0 Playground にアクセス**

https://developers.google.com/oauthplayground/

2. **設定を開く**

右上の歯車アイコンをクリック

3. **OAuth設定**

- 「Use your own OAuth credentials」にチェック
- **OAuth Client ID**: 先ほど取得したクライアントID
- **OAuth Client secret**: 先ほど取得したクライアントシークレット

4. **スコープを選択**

左側のリストから:
- `YouTube Data API v3`
  - `https://www.googleapis.com/auth/youtube.upload`
  - `https://www.googleapis.com/auth/youtube`

両方にチェックを入れて「Authorize APIs」をクリック

5. **Googleアカウントで認証**

- アカウントを選択
- 「続行」をクリック
- 権限を許可

6. **トークンを交換**

「Exchange authorization code for tokens」をクリック

7. **トークンをコピー**

以下の情報をコピーして保存:
- **Access token**: `ya29.a0AfH6SMB...`
- **Refresh token**: `1//0gA1B2C3D4E5F...`

---

## 📝 ステップ5: アプリに認証情報を設定

### JSON形式で認証情報を準備

以下のJSON形式で情報をまとめます:

```json
{
  "client_id": "123456789-abcdefg.apps.googleusercontent.com",
  "client_secret": "GOCSPX-abc123xyz",
  "access_token": "ya29.a0AfH6SMB...",
  "refresh_token": "1//0gA1B2C3D4E5F...",
  "token_type": "Bearer",
  "expiry_date": 1699999999999
}
```

**expiry_date の計算**:
現在時刻 + 3600秒（1時間）をミリ秒に変換

JavaScript例:
```javascript
const expiryDate = Date.now() + 3600 * 1000;
```

### アプリに設定

1. アプリケーションを開く
2. 「⚙️ 設定（APIキー）」タブをクリック
3. 「YouTube API 認証情報」フィールドに上記JSONをペースト
4. 「💾 APIキーを保存」をクリック

---

## ✅ ステップ6: 動作確認

### テスト動画を生成

1. 「🎥 動画生成」タブを開く
2. テーマを入力（例: "テスト動画"）
3. 動画の長さ: 30秒
4. 公開設定: **非公開**（テストのため）
5. 「🚀 動画を生成・アップロード」をクリック

### 確認

- 処理完了後「YouTubeで視聴する」リンクが表示される
- リンクをクリックして動画が表示されることを確認
- YouTube Studioで動画がアップロードされているか確認

---

## 🔄 トークンのリフレッシュ

アクセストークンは通常1時間で期限切れになりますが、リフレッシュトークンを使用して自動的に更新されます。

### 自動リフレッシュの仕組み

本アプリは`googleapis`ライブラリを使用しており、以下のように動作します:

1. アクセストークンが期限切れの場合を検出
2. リフレッシュトークンを使用して新しいアクセストークンを取得
3. 自動的に認証情報を更新

### 注意事項

- **リフレッシュトークンは失われない**: 再認証不要
- **長期間使用しない場合**: 90日間使用しないと無効になる場合あり
- **再認証が必要な場合**: OAuth Playgroundで再度トークンを取得

---

## 🔒 セキュリティのベストプラクティス

### 1. 認証情報の保護

❌ **絶対にしないこと**:
- GitHubなどの公開リポジトリに認証情報をコミット
- 他人に認証情報を共有

✅ **推奨事項**:
- 環境変数に保存
- `.env`ファイルに記載（`.gitignore`に追加）
- パスワードマネージャーで管理

### 2. スコープの最小化

必要最小限のスコープのみを許可:
- `youtube.upload`: アップロードのみ
- `youtube`: 動画の管理

### 3. 定期的な見直し

- 使用していないOAuthクライアントは削除
- 定期的にトークンをローテーション

---

## ❓ よくある問題と解決方法

### エラー: "insufficient_permissions"

**原因**: 必要なスコープが許可されていない

**解決策**:
1. OAuth同意画面でスコープを確認
2. OAuth Playgroundで再度認証
3. 正しいスコープが選択されているか確認

### エラー: "invalid_grant"

**原因**: トークンが無効または期限切れ

**解決策**:
1. OAuth Playgroundで新しいトークンを取得
2. リフレッシュトークンが正しいか確認

### エラー: "quotaExceeded"

**原因**: YouTube API の1日あたりの割り当て超過

**解決策**:
- 翌日まで待つ
- Google Cloud Consoleで割り当てを増やす申請
- デフォルト割り当て: 10,000ユニット/日
- 1回のアップロード: 約1,600ユニット

### 動画がアップロードされない

**確認事項**:
1. YouTube API が有効化されているか
2. OAuth認証が正しく設定されているか
3. リフレッシュトークンが有効か
4. バックエンドのログを確認

---

## 📊 YouTube API 割り当てについて

### デフォルト割り当て

- **1日の制限**: 10,000ユニット
- **動画アップロード**: 1回あたり約1,600ユニット
- **1日あたり**: 約6本の動画をアップロード可能

### コスト（ユニット）

| 操作 | コスト |
|-----|-------|
| 動画アップロード | 1,600 |
| 動画の更新 | 50 |
| 動画の削除 | 50 |
| リスト取得 | 1 |

### 割り当ての増加申請

必要に応じて、Google Cloud Consoleから割り当て増加を申請できます:

1. Google Cloud Console → YouTube Data API v3
2. 「割り当て」タブ
3. 「割り当ての引き上げをリクエスト」

---

## 🎓 追加リソース

### 公式ドキュメント

- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [OAuth 2.0 認証](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

### トラブルシューティング

- [YouTube API エラーリファレンス](https://developers.google.com/youtube/v3/docs/errors)
- [OAuth 2.0 トラブルシューティング](https://developers.google.com/identity/protocols/oauth2/policies)

---

## 📞 サポート

問題が解決しない場合は、GitHubのissueで質問してください。

認証設定が完了したら、快適に自動動画生成をお楽しみください！🎬✨
