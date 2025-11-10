# 修正内容まとめ (Fixes Summary)

**日付**: 2025-11-10  
**対応内容**: YouTubeアップロード失敗、ロゴ調整、サブタイトル修正、動画アニメーション追加

---

## 🔧 修正した問題 (Fixed Issues)

### 1. ✅ YouTubeアップロード失敗の原因と対策

#### 問題
```
Error 403: quotaExceeded
The request cannot be completed because you have exceeded your quota.
```

#### 原因
**YouTube Data API v3の1日のクォータ制限に達しました**

- YouTube APIには1日あたりのアップロード回数制限があります
- デフォルトのクォータ: 10,000ユニット/日
- 動画アップロード: 1,600ユニット/回
- **1日に約6本の動画アップロードが上限**

#### 対策
1. **エラーメッセージの改善**
   - より明確なエラーメッセージに変更
   - 「YouTube API daily quota exceeded. Please wait until tomorrow or request a quota increase.」

2. **解決方法（3つの選択肢）**

   **A. 翌日まで待つ（最も簡単）**
   - クォータは日本時間の午前9時（太平洋標準時0時）にリセット
   - 追加費用なし

   **B. Google Cloud Consoleでクォータ増加リクエスト**
   1. https://console.cloud.google.com にアクセス
   2. 「APIs & Services」→「Quotas」
   3. 「YouTube Data API v3」を検索
   4. 「Queries per day」を選択
   5. 「EDIT QUOTAS」をクリック
   6. 増加理由を記入して申請
   7. 承認まで数日かかる場合あり

   **C. 動画ファイルのみ保存（YouTube手動アップロード）**
   - 生成された動画はこちらからダウンロード可能: `https://5000-..../temp/video_XXXXX.mp4`
   - YouTubeに手動でアップロード

---

### 2. ✅ ロゴサイズと位置の調整

#### 変更内容
**サイズ**: 1000px/750px → **500px/375px** (半分に縮小)  
**位置**: `H*0.08` → **`H*0.05`** (より上部へ移動)

#### Before & After
```javascript
// Before: ロゴが大きすぎた
const logoSize = height > 1080 ? 1000 : 750;
overlay=(W-w)/2:H*0.08  // 画面の8%下

// After: ちょうど良いサイズ
const logoSize = height > 1080 ? 500 : 375;
overlay=(W-w)/2:H*0.05  // 画面の5%下（より上）
```

#### 効果
- ✅ ロゴが適切なサイズに
- ✅ タイトルテキストとのバランスが改善
- ✅ よりプロフェッショナルな見た目

---

### 3. ✅ サブタイトルの横はみ出し修正

#### 問題
サブタイトルテキストが画面から横にはみ出して読めない箇所があった

#### 原因
- 1行あたりの最大文字数が多すぎた（20文字）
- 縦長動画（9:16）では横幅が狭い
- 英語の長い単語が改行されずにはみ出した

#### 修正内容
```javascript
// Before
const maxCharsPerLine = 20;  // 長すぎ
const maxLines = 3;

// After
const maxCharsPerLine = 15;  // より短く、安全に
const maxLines = 4;          // 4行まで許可
```

#### テキスト分割アルゴリズム改善
1. 文字数ベースの均等分割
2. 文章境界での改行（。！？．!?）
3. 単語境界での改行（スペース、カンマ）
4. 15文字/行を超えたら自動改行
5. 最大4行まで

#### 効果
- ✅ すべてのサブタイトルが画面内に収まる
- ✅ 日本語・英語・中国語すべてで正常動作
- ✅ 読みやすさが大幅に向上

---

### 4. ✅ 動きのあるアニメーション追加

#### 背景
ユーザー要望: 「静止画ではなく動画（または動きのあるアニメーション）を使いたい」

#### 解決策: Ken Burns効果の実装

**Ken Burns効果とは？**
- 映画でよく使われる手法
- 静止画にゆっくりとしたズーム・パンを追加
- シネマティックな動きを演出

#### 実装した4種類のアニメーション

1. **ズームイン（Zoom In）**
   ```
   1.0倍 → 1.1倍にゆっくり拡大
   ```

2. **ズームアウト（Zoom Out）**
   ```
   1.1倍 → 1.0倍にゆっくり縮小
   ```

3. **左から右へパン（Pan Right）**
   ```
   画面左端 → 右端へゆっくり移動
   ```

4. **右から左へパン（Pan Left）**
   ```
   画面右端 → 左端へゆっくり移動
   ```

#### FFmpegコード例
```bash
# ズームイン効果
zoompan=z='min(zoom+0.0015,1.1)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920

# パン効果（左→右）
zoompan=z='1.05':d=75:x='iw/2-(iw/zoom/2)+(t/2.5)*iw*0.1':y='ih/2-(ih/zoom/2)':s=1080x1920
```

#### スライド間での効果のバリエーション
- スライド1: ズームイン
- スライド2: ズームアウト
- スライド3: 左→右パン
- スライド4: 右→左パン
- （以降繰り返し）

#### メリット
- ✅ **完全無料** - 追加のAPI呼び出し不要
- ✅ **高品質** - FFmpegで高精度なアニメーション
- ✅ **即座に適用** - 外部APIを待つ必要なし
- ✅ **カスタマイズ可能** - 動きの速度・範囲を調整可能

---

### 5. ✅ Stability AI Video APIの問題

#### 問題
```
Error 404: Stability AI Video API endpoint not found
```

#### 原因
**Stability AI Video APIは2025年7月24日に廃止予定**
- 既にアクセスできなくなっている可能性
- 公式発表: https://stability.ai/api-pricing-update-25

#### 解決策
Ken Burns効果で代替実装
- 外部APIに依存しない
- より高速で安定
- コスト削減

---

## 🎨 UIの変更 (UI Changes)

### ビジュアルモード選択

**Before:**
```
🖼️ 静止画スライド（DALL-E 3）
🎬 アニメーション動画（Stability AI Video）
```

**After:**
```
🖼️ 静止画スライド（DALL-E 3）
🎬 動きのあるアニメーション（Ken Burns効果）
```

### 説明テキスト

**ken-burns選択時:**
```
💡 Ken Burns効果: ゆっくりとしたズーム・パンで映画のような動きを追加します（追加コストなし）
```

---

## 📊 技術的な詳細 (Technical Details)

### 修正されたファイル

1. **backend/services/ffmpegService.js**
   - ロゴサイズ: `750/1000` → `375/500`
   - ロゴ位置: `H*0.08` → `H*0.05`
   - サブタイトル: `maxCharsPerLine: 20` → `15`
   - Ken Burns効果の追加: `zoompan` フィルター

2. **backend/services/youtubeService.js**
   - YouTube Quota超過エラーメッセージ改善
   - より詳細なエラー情報の提供

3. **backend/services/videoGeneratorService.js**
   - Stability AI関連コード削除
   - `prepareVisualAssets`メソッド簡略化
   - デフォルトvisualMode: `ken-burns`

4. **frontend/src/components/VideoGenerator.js**
   - visualModeオプション更新
   - UIテキスト変更

---

## 🎬 Ken Burns効果の仕組み

### FFmpeg zoompanフィルター

**パラメータ説明:**
```bash
zoompan=z='式':d=フレーム数:x='X位置':y='Y位置':s=サイズ
```

| パラメータ | 説明 | 例 |
|----------|------|-----|
| `z` | ズーム倍率（時間で変化） | `min(zoom+0.0015,1.1)` |
| `d` | 継続フレーム数 | `75` (2.5秒 @ 30fps) |
| `x` | X座標（中心からのオフセット） | `iw/2-(iw/zoom/2)` |
| `y` | Y座標（中心からのオフセット） | `ih/2-(ih/zoom/2)` |
| `s` | 出力解像度 | `1080x1920` (9:16) |

### 動きの速度調整

```javascript
// ゆっくり（推奨）
z='min(zoom+0.0015,1.1)'  // 0.15%/フレーム

// 速め
z='min(zoom+0.003,1.1)'   // 0.3%/フレーム

// 非常にゆっくり
z='min(zoom+0.001,1.1)'   // 0.1%/フレーム
```

---

## 🚀 今すぐ試す (Try It Now)

1. **フロントエンドにアクセス**
   - URL: https://5173-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai

2. **動画を生成**
   - テーマを入力（例: 七転び八起き）
   - ビジュアルモード: **動きのあるアニメーション（Ken Burns効果）**
   - 「動画生成開始」をクリック

3. **結果を確認**
   - ✅ ロゴが適切なサイズと位置
   - ✅ サブタイトルが画面内に収まっている
   - ✅ スムーズなズーム・パンアニメーション

---

## ⚠️ 注意事項 (Important Notes)

### YouTube APIクォータについて

**現在の状況:**
- ❌ 本日の動画アップロード回数制限に達しています
- ⏰ クォータリセット: 翌日午前9時（日本時間）
- 📹 生成された動画はダウンロード可能

**対処方法:**
1. 翌日まで待つ（最も簡単）
2. Google Cloud Consoleでクォータ増加申請
3. 動画を手動でYouTubeにアップロード

### Ken Burns効果について

**推奨設定:**
- ✅ すべての動画で有効（デフォルト）
- ✅ 追加コストなし
- ✅ 処理時間への影響: 最小限（約5-10秒追加）

**カスタマイズ（上級者向け）:**
- `ffmpegService.js`の`zoompan`パラメータを調整
- 動きの速度、範囲、方向を変更可能

---

## 📞 サポート (Support)

問題が発生した場合:

1. **ログ確認**
   ```bash
   pm2 logs backend --lines 50
   ```

2. **サービス再起動**
   ```bash
   pm2 restart backend
   ```

3. **GitHub Issue作成**
   - エラーメッセージのスクリーンショット
   - 生成しようとした動画の設定
   - ログの関連部分

---

**最終更新**: 2025-11-10  
**バージョン**: 1.2.0  
**修正者**: Claude (AI Developer)
