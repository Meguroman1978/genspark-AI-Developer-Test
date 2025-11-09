# 🔴 YouTube API診断とアップロード失敗の理由

**日時**: 2025年11月9日 10:30 UTC  
**ステータス**: ⚠️ OAuthスコープの問題

---

## 🎯 問題の本質

**質問**: 「API診断ではYouTube APIへのアクセスが成功している（チャンネル名も取得できている）のに、なぜアップロードが失敗するのか？」

**答え**: **OAuthスコープが異なるため**

---

## 📊 API診断 vs アップロードの違い

### API診断 (✅ 成功)
```javascript
// 使用しているスコープ
scope: 'https://www.googleapis.com/auth/youtube.readonly'

// 実行している操作
youtube.channels.list({
  part: 'snippet,statistics',
  mine: true
})
```

**結果**: 
- ✅ チャンネル情報を取得できる
- ✅ チャンネル名、統計情報を読み取れる
- ✅ 401エラーが出ない

**理由**: `youtube.readonly`スコープで**読み取り専用**操作が可能

---

### 動画アップロード (❌ 失敗)
```javascript
// 必要なスコープ
scope: 'https://www.googleapis.com/auth/youtube.upload'

// 実行している操作
youtube.videos.insert({
  part: ['snippet', 'status'],
  requestBody: { ... },
  media: { body: videoStream }
})
```

**結果**:
- ❌ 401 Invalid Credentials エラー
- ❌ authError: UNAUTHENTICATED
- ❌ アップロードが完全に失敗

**理由**: `youtube.upload`スコープが**トークンに含まれていない**

---

## 🔍 技術的な詳細

### OAuthスコープとは？

OAuthスコープは、トークンが**どの操作を実行できるか**を定義します。

| スコープ | 許可される操作 | API診断 | アップロード |
|---------|--------------|---------|------------|
| `youtube.readonly` | 読み取り専用 (チャンネル情報、再生リスト等) | ✅ 使用可能 | ❌ 不十分 |
| `youtube.upload` | 動画のアップロード | ❌ 不要 | ✅ 必須 |
| `youtube` | すべての操作 (フルアクセス) | ✅ 使用可能 | ✅ 使用可能 |

### 現在の状況

あなたのトークンには**`youtube.readonly`スコープしか含まれていない**可能性が高いです。

そのため：
- ✅ API診断（読み取り）は成功
- ❌ アップロード（書き込み）は401エラー

---

## ✅ 解決方法

### ステップ1: OAuth 2.0 Playgroundにアクセス

https://developers.google.com/oauthplayground/

### ステップ2: 正しいスコープを選択

左側のリストから、以下の**どちらか**を選択：

#### オプション1: アップロード専用スコープ (推奨)
```
YouTube Data API v3
  ├─ https://www.googleapis.com/auth/youtube.upload
```

#### オプション2: フルアクセススコープ
```
YouTube Data API v3
  ├─ https://www.googleapis.com/auth/youtube
```

**注意**: 
- `youtube.readonly` は選択**しない**
- `youtube.upload` または `youtube` を選択

### ステップ3: 認証を実行

1. **「Authorize APIs」**ボタンをクリック
2. Googleアカウントでログイン
3. 権限リクエストを承認
   - 「このアプリはYouTubeに動画をアップロードできます」という警告が表示される
   - 「許可」をクリック

### ステップ4: トークンを取得

1. **「Exchange authorization code for tokens」**をクリック
2. 以下の2つのトークンをコピー：
   - **Access token**: `ya29.a0...` で始まる
   - **Refresh token**: `1//04...` で始まる

### ステップ5: アプリに設定

1. アプリの**「API設定」**ページを開く
2. **「YouTube API 設定」**セクションを展開
3. 以下をペースト：
   - **Access Token**: 手順4でコピーしたAccess token
   - **Refresh Token**: 手順4でコピーしたRefresh token
4. **「保存」**をクリック

---

## 🔬 診断スコープの確認方法

### 現在のトークンのスコープを確認

OAuth 2.0 Playgroundで、以下のエンドポイントにアクセス：

```
GET https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=YOUR_ACCESS_TOKEN
```

**応答例**:
```json
{
  "issued_to": "...",
  "audience": "...",
  "scope": "https://www.googleapis.com/auth/youtube.readonly",  // ← これが問題！
  "expires_in": 3599,
  "access_type": "offline"
}
```

`scope`が `youtube.readonly` だけの場合、アップロードは**不可能**です。

**必要なスコープ**:
```json
{
  "scope": "https://www.googleapis.com/auth/youtube.upload"
  // または
  "scope": "https://www.googleapis.com/auth/youtube"
}
```

---

## 📝 よくある質問

### Q1: なぜAPI診断では成功するのか？

**A**: API診断は`youtube.channels.list()`を使用しており、これは**読み取り専用**操作です。`youtube.readonly`スコープで十分です。

### Q2: なぜアップロードは失敗するのか？

**A**: 動画アップロードは`youtube.videos.insert()`を使用しており、これは**書き込み**操作です。`youtube.upload`または`youtube`スコープが必要です。

### Q3: トークンを更新せずにアップロードできるか？

**A**: **不可能**です。スコープはトークン取得時に決定され、後から変更できません。新しいスコープで新しいトークンを取得する必要があります。

### Q4: Refresh Tokenだけで自動的にスコープが追加されるか？

**A**: **されません**。Refresh Tokenも特定のスコープに紐付いています。新しいスコープで新しいRefresh Tokenを取得する必要があります。

### Q5: 動画生成自体は成功するか？

**A**: **はい！** YouTubeアップロードが失敗しても、動画は正常に生成され、ダウンロード可能です。手動でYouTubeにアップロードすることもできます。

---

## 🎬 動画生成の現在の状態

### ✅ 成功している部分

1. ✅ スクリプト生成 (GPT-4)
2. ✅ 音声生成 (ElevenLabs)
3. ✅ 画像生成 (DALL-E 3 / Pexels)
4. ✅ 動画編集 (Creatomate)
5. ✅ MP4動画の生成 (1920x1080)
6. ✅ タイトルスクリーン (2秒)
7. ✅ 音量ブースト (2.0x)
8. ✅ フルスクリーン表示

### ❌ 失敗している部分

1. ❌ YouTube自動アップロード
   - 原因: OAuthスコープ不足
   - 影響: 動画生成には影響なし

---

## 📋 対策のまとめ

### 短期的な対策 (今すぐできる)
1. ✅ 生成された動画をダウンロード
2. ✅ YouTubeに手動でアップロード
3. ✅ アプリの動画プレーヤーで視聴

### 長期的な対策 (自動アップロードを有効化)
1. ⚠️ OAuth 2.0 Playgroundで**`youtube.upload`スコープ**の新しいトークンを取得
2. ⚠️ アプリのAPI設定ページで新しいトークンを保存
3. ✅ 次回から自動アップロードが動作

---

## 🔐 セキュリティ上の注意

### スコープは最小限に

- 読み取り専用の操作には `youtube.readonly`
- アップロードには `youtube.upload`
- 削除/編集が必要な場合のみ `youtube` (フルアクセス)

### トークンの管理

- Access Tokenの有効期限: 約1時間
- Refresh Tokenの有効期限: 無期限（revoke されない限り）
- 定期的にトークンを更新することを推奨

---

## 🎉 まとめ

### 問題の本質
- **API診断**: `youtube.readonly`スコープで成功 ✅
- **アップロード**: `youtube.upload`スコープが必要 ❌
- **現在のトークン**: `youtube.readonly`のみ ⚠️

### 解決策
1. OAuth 2.0 Playgroundで**`youtube.upload`スコープ**のトークンを取得
2. アプリに新しいトークンを設定
3. 次回から自動アップロードが動作 ✅

### 現在の状態
- ✅ 動画生成は**完全に動作**
- ✅ MP4動画がダウンロード可能
- ❌ YouTube自動アップロードのみ失敗（スコープ不足）

---

**作成日時**: 2025年11月9日 10:30 UTC  
**関連ドキュメント**: FINAL_FIX_SUMMARY.md  
**参考資料**: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
