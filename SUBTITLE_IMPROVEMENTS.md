# 字幕表示とオーディオカットオフの改善

## 🎯 修正内容

### 1. ⏱️ オーディオカットオフの防止

**問題**: 最後の2秒くらいで音声が途中で切れる

**解決策**:
- 動画の総尺を適切に計算
- タイトル画面: 2秒
- コンテンツ: 指定された秒数
- **終了バッファ: 3秒以上** ← これで音声が途切れない
- 総尺 = タイトル(2s) + コンテンツ(duration) + バッファ(3s)

**実装箇所**: `ffmpegService.js` Line 93-103
```javascript
const titleDuration = titleBgPath ? 2 : 0;
const contentDuration = duration;
const endBuffer = 3; // 最低3秒のバッファ
const totalDuration = titleDuration + contentDuration + endBuffer;
```

---

### 2. 📝 字幕フォントサイズの拡大

**問題**: 字幕の文字が小さすぎて読みにくい

**変更前**:
- 通常動画(16:9): 24px
- ショート動画(9:16): 32px

**変更後**:
- 通常動画(16:9): **42px** (75%増加)
- ショート動画(9:16): **56px** (75%増加)

**実装箇所**: `ffmpegService.js` Line 201
```javascript
const subtitleFontsize = height > 1080 ? 56 : 42;
```

---

### 3. ⬆️ 字幕表示位置の改善

**問題**: 字幕が画面の下端に近すぎる

**変更前**: `y=h-fontsize*3` (画面下端から固定距離)

**変更後**: `y=h*0.72` (画面高さの72%の位置、より高い)

**利点**:
- より読みやすい位置
- 画像の主要部分を遮らない
- モバイルデバイスでの視認性向上

**実装箇所**: `ffmpegService.js` Line 222

---

### 4. 🎨 丸みのあるフォントデザイン

**問題**: 角張ったフォントで硬い印象

**解決策**:
- **M+ Rounded 1c** フォントを導入
- 日本語に最適化された丸ゴシック体
- フレンドリーで読みやすいデザイン

**フォントファイル**: `/home/user/webapp/temp/mplus-rounded.ttf`

**フォールバック**: M+ Roundedが利用できない場合はNoto Sans CJK JPを使用

**実装箇所**: `ffmpegService.js` Line 202-206
```javascript
const roundedFontPath = path.join(this.tempDir, 'mplus-rounded.ttf');
const japaneseFont = fs.existsSync(roundedFontPath) 
  ? roundedFontPath 
  : '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
```

---

### 5. 📏 長文の自動分割

**問題**: 長い文章が画面からはみ出す

**解決策**:
1. **1行あたり最大30文字**に制限
2. 自然な区切り点で改行（読点、句読点、助詞など）
3. **最大3行**まで表示
4. ナレーションとの同期を保つ

**分割ロジック**:
```javascript
// 30文字を超える場合、自動的に複数行に分割
const maxCharsPerLine = 30;
if (chunkText.length > maxCharsPerLine) {
  const lines = this.splitTextIntoLines(chunkText, maxCharsPerLine);
  chunkText = lines.join('\n');
}
```

**改善点**:
- ✅ テキストが画面からはみ出さない
- ✅ 読みやすい行長
- ✅ 自然な改行位置
- ✅ ナレーションの内容と字幕が一致

**実装箇所**: 
- `splitNarrationIntoChunks()` - Line 334-372
- `splitTextIntoLines()` - 新規メソッド Line 374-398

---

### 6. 🎯 視認性の向上

**追加改善**:
1. **ストロークの太さ**: 3px → **4px**
2. **背景ボックスの不透明度**: 0.5 → **0.6** (より濃い)
3. **ボックスボーダー**: 10px → **15px** (より広い余白)

これにより、あらゆる背景色に対して字幕が読みやすくなります。

**実装箇所**: `ffmpegService.js` Line 222
```javascript
box=1:boxcolor=0x000000@0.6:boxborderw=15
```

---

## 📊 ビフォー・アフター比較

| 項目 | 変更前 | 変更後 | 改善率 |
|------|--------|--------|--------|
| **字幕サイズ (16:9)** | 24px | 42px | +75% |
| **字幕サイズ (9:16)** | 32px | 56px | +75% |
| **字幕位置** | 下端から固定 | 画面の72% | より高い |
| **1行の文字数** | 制限なし | 最大30文字 | はみ出し防止 |
| **行数** | 1行 | 最大3行 | 長文対応 |
| **フォントデザイン** | 角張った | 丸みのある | より親しみやすい |
| **ストローク** | 3px | 4px | +33% |
| **背景ボックス** | 薄い | 濃い | 視認性向上 |
| **終了バッファ** | 不明確 | 確実に3秒 | 音声カットなし |

---

## 🧪 テスト方法

1. **フロントエンドにアクセス**: https://5173-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai

2. **動画を生成**:
   - テーマ: 任意（例: 「猿も木から落ちる」）
   - 長さ: 30秒以上推奨（音声カットオフをテストするため）
   - 言語: 日本語

3. **確認ポイント**:
   - ✅ 音声が最後まで切れずに再生される
   - ✅ 字幕のサイズが大きく読みやすい
   - ✅ 字幕の位置が高く、画像を遮らない
   - ✅ フォントが丸みを帯びて親しみやすい
   - ✅ 長い文章が複数行に分割されている
   - ✅ 字幕が画面からはみ出していない
   - ✅ 字幕とナレーションの内容が一致している

---

## 📝 技術詳細

### タイミング計算ログ

バックエンドログに以下の情報が出力されます：
```
[Job XX] ⏱️  Timing calculation:
[Job XX]   - Title duration: 2s
[Job XX]   - Content duration: 30s
[Job XX]   - End buffer: 3s
[Job XX]   - Total video duration: 35s
```

これにより、動画の長さが正しく計算されているか確認できます。

### FFmpeg字幕パラメータ

```bash
drawtext=
  text='字幕テキスト'
  :fontfile=/home/user/webapp/temp/mplus-rounded.ttf
  :fontsize=42
  :fontcolor=0xffffff
  :borderw=4
  :bordercolor=0x000000
  :x=(w-text_w)/2          # 中央揃え
  :y=h*0.72                # 画面高さの72%の位置
  :box=1                   # 背景ボックス有効
  :boxcolor=0x000000@0.6   # 黒、60%不透明度
  :boxborderw=15           # ボックス余白15px
```

---

## 🚀 デプロイ状況

- ✅ コード変更完了
- ✅ GitHubにプッシュ済み
- ✅ バックエンドサービス再起動済み
- ✅ M+ Roundedフォントダウンロード済み

すべての変更が適用され、次回の動画生成から新しい設定が使用されます。

---

## 🔧 追加の微調整（必要に応じて）

もし以下のような要望があれば、さらに調整可能です：

1. **字幕サイズ**: さらに大きく/小さく
2. **字幕位置**: さらに高く/低く
3. **1行の文字数**: 30文字から変更
4. **終了バッファ**: 3秒から変更
5. **フォントスタイル**: 太字、イタリックなど
6. **色**: 白以外の色に変更

お気軽にお申し付けください！
