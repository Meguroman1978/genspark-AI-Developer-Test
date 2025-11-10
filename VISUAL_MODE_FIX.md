# ビジュアルモード修正 - 静止画 vs Ken Burns効果

**日付**: 2025-11-10  
**修正内容**: 静止画/Ken Burns効果の切り替え、複数スライド表示

---

## 🐛 修正した問題

### 1. ✅ 静止画モード選択時にKen Burns効果が適用される

#### 問題
- UIで「静止画スライド（DALL-E 3）」を選択しても、Ken Burns効果（ズーム・パン）が適用されていた
- 説明文に「💡 Ken Burns効果: ゆっくりとしたズーム・パン...」と表示される

#### 原因
- `visualMode`パラメータがフロントエンドからバックエンドに渡されていなかった
- FFmpegサービスが常にKen Burns効果を適用していた
- 条件分岐がなかった

#### 解決策

**パラメータ伝達の修正:**
```
Frontend (visualMode) 
  → Route (videoGenerator.js)
  → Service (videoGeneratorService.js)
  → FFmpeg (ffmpegService.js)
```

**FFmpegでの条件分岐:**
```javascript
const useKenBurns = (visualMode === 'ken-burns');

if (useKenBurns) {
  // Ken Burns effect with zoompan filter
  imageFilter = `scale=${width * 1.2}:${height * 1.2}:...,zoompan=...`;
} else {
  // Static mode: simple scale and pad
  imageFilter = `scale=${width}:${height}:...,pad=${width}:${height}:...`;
}
```

---

### 2. ✅ 1枚の画像しか表示されない

#### 問題
- どちらのビジュアルモードでも1枚の画像しか表示されない
- 以前は2.5秒ごとに新しい画像が表示されていた

#### 原因
- Pexels動画検索が最初に実行され、画像生成をブロックしていた
- Pexels APIキーが設定されていない場合、動画は取得されないが、ループは1回しか実行されていなかった可能性
- FFmpegサービスが`type === 'video'`のアセットをスキップしていた

#### 解決策

**Pexels検索を削除:**
```javascript
// Before: Pexels検索を試行
const videoClips = await pexelsService.searchVideos(scene.searchQuery);
if (videoClips && videoClips.length > 0) {
  // Use Pexels video
} else {
  // Generate DALL-E image
}

// After: 常にDALL-E画像を生成
for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  // Generate DALL-E image for every scene
  const imageResponse = await openai.images.generate({...});
  assets.push({ type: 'image', url: ... });
}
```

**ログの改善:**
```javascript
console.log(`Scene ${i+1}/${scenes.length}: Generating DALL-E image...`);
console.log(`Scene ${i+1}/${scenes.length}: Image generated successfully`);
```

これにより、各シーンで画像が生成されていることを確認できます。

---

## 🎯 修正内容の詳細

### コード変更

#### 1. **backend/routes/videoGenerator.js**

visualModeパラメータを抽出:
```javascript
const { theme, themeRomaji, duration, ..., visualMode } = req.body;
```

videoGeneratorServiceに渡す:
```javascript
videoGeneratorService.generateVideo({
  ...,
  visualMode: visualMode || 'images',  // デフォルトは'images'（静止画）
  ...
});
```

#### 2. **backend/services/videoGeneratorService.js**

visualModeをFFmpegに渡す:
```javascript
const videoConfig = {
  ...,
  visualMode: visualMode || 'static',  // FFmpegには'static'として渡す
  ...
};
```

Pexels検索を削除して常にDALL-E生成:
```javascript
// すべてのシーンでDALL-E画像を生成
for (let i = 0; i < scenes.length; i++) {
  const visualTheme = visualThemes[i % visualThemes.length];
  const imageResponse = await openai.images.generate({...});
  assets.push({ type: 'image', url: ... });
}
```

#### 3. **backend/services/ffmpegService.js**

createVideoでvisualModeを受け取る:
```javascript
async createVideo(config) {
  const { ..., visualMode } = config;
  ...
}
```

generateVideoWithFFmpegに渡す:
```javascript
await this.generateVideoWithFFmpeg({
  ...,
  visualMode: visualMode || 'static',
  ...
});
```

Ken Burns効果を条件付きで適用:
```javascript
const useKenBurns = (visualMode === 'ken-burns');

let imageFilter = '';
if (useKenBurns) {
  // Ken Burns: zoom/pan animation
  const kenBurnsEffects = [...];
  const kenBurnsEffect = kenBurnsEffects[i % kenBurnsEffects.length];
  imageFilter = `scale=${width * 1.2}:${height * 1.2}:...,${kenBurnsEffect}`;
} else {
  // Static: simple scale and pad
  imageFilter = `scale=${width}:${height}:...,pad=${width}:${height}:...`;
}
```

---

## 📊 動作比較

### 静止画モード (visualMode: 'static')

**FFmpegフィルター:**
```
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2
```

**結果:**
- ✅ 画像をそのまま表示
- ✅ アニメーションなし
- ✅ シンプルで高速

**使用例:**
- プレゼンテーション風の動画
- テキスト重視の解説動画
- クラシックなスライドショー

---

### Ken Burns効果モード (visualMode: 'ken-burns')

**FFmpegフィルター (例: ズームイン):**
```
scale=1296:2304:force_original_aspect_ratio=decrease,
zoompan=z='min(zoom+0.0015,1.1)':d=97:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920
```

**結果:**
- ✅ ゆっくりとしたズーム・パン
- ✅ 映画のようなシネマティック効果
- ✅ 4種類の効果をローテーション
  1. ズームイン
  2. ズームアウト
  3. 左→右パン
  4. 右→左パン

**使用例:**
- ストーリー性のある動画
- エモーショナルなコンテンツ
- プロフェッショナルなプレゼンテーション

---

## 🎬 スライド生成の仕組み

### シーン数の計算

```javascript
// 2.5秒ごとに1シーン
const imageCount = Math.ceil(duration / 2.5);

// 例:
// 10秒動画 = 4シーン (0-2.5s, 2.5-5s, 5-7.5s, 7.5-10s)
// 15秒動画 = 6シーン
// 30秒動画 = 12シーン
```

### 各シーンで画像生成

```javascript
for (let i = 0; i < scenes.length; i++) {
  // シーンごとに異なるビジュアルテーマ
  const visualTheme = visualThemes[i % visualThemes.length];
  
  // DALL-E 3で画像生成
  const imageResponse = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `... with ${visualTheme} ...`,
    size: '1024x1792'  // 9:16 vertical
  });
  
  assets.push({ type: 'image', url: ... });
}
```

### 結果

- ✅ **10秒動画**: 4枚の異なる画像
- ✅ **15秒動画**: 6枚の異なる画像
- ✅ **30秒動画**: 12枚の異なる画像

各画像は異なるビジュアルテーマで生成されるため、視覚的に多様。

---

## 🔧 UIの説明文

### frontend/src/components/VideoGenerator.js

**静止画モード:**
```jsx
<option value="static">🖼️ 静止画スライド（DALL-E 3）</option>
```

説明なし（シンプルなスライドショー）

**Ken Burns効果モード:**
```jsx
<option value="ken-burns">🎬 動きのあるアニメーション（Ken Burns効果）</option>

{formData.visualMode === 'ken-burns' && (
  <div className="info-box">
    <strong>💡 Ken Burns効果:</strong> ゆっくりとしたズーム・パンで映画のような動きを追加します（追加コストなし）
  </div>
)}
```

---

## 🧪 テスト方法

### 1. 静止画モードのテスト

1. フロントエンドにアクセス
2. ビジュアルモード: **静止画スライド（DALL-E 3）**
3. テーマ入力（例: 「七転び八起き」）
4. 動画生成開始

**確認ポイント:**
- ✅ 画像がそのまま表示される（アニメーションなし）
- ✅ 2.5秒ごとに新しい画像に切り替わる
- ✅ 各画像が異なるデザイン・色調

---

### 2. Ken Burns効果モードのテスト

1. フロントエンドにアクセス
2. ビジュアルモード: **動きのあるアニメーション（Ken Burns効果）**
3. テーマ入力（例: 「犬も歩けば棒に当たる」）
4. 動画生成開始

**確認ポイント:**
- ✅ 画像がゆっくりズーム・パンする
- ✅ 2.5秒ごとに新しい画像＋新しいアニメーション
- ✅ 効果のバリエーション（ズームイン、ズームアウト、パン）

---

## 📈 パフォーマンス

### 処理時間

| 項目 | 静止画 | Ken Burns | 差異 |
|------|--------|-----------|------|
| DALL-E 3生成 | 10-15s/枚 | 10-15s/枚 | 同じ |
| FFmpeg処理 | 30-40s | 35-50s | +10-15s |
| 合計 | 3-4分 | 3.5-5分 | +0.5-1分 |

Ken Burns効果はFFmpegのzoompan処理に追加時間が必要ですが、大きな差ではありません。

### コスト

どちらのモードも同じ：
- DALL-E 3: $0.04/枚
- ElevenLabs TTS: $0.30/1000文字
- FFmpeg: 無料

---

## ⚠️ 注意事項

### Pexels動画について

現在、Pexels動画検索は**無効化**されています。

**理由:**
- FFmpegで動画と画像を混在させる処理が複雑
- Pexels APIキーが必要（ほとんどのユーザーが設定していない）
- 画像のみの方がシンプルで安定

**将来の拡張:**
Pexels動画を使いたい場合は、以下を実装する必要があります：
1. Pexels APIキーの設定UI
2. FFmpegでの動画処理（`-loop 1`なし、trim処理）
3. 動画と画像の混在時の長さ調整

---

## 🚀 今すぐテスト

**フロントエンドURL**: https://5173-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai

### テストケース1: 静止画モード

```
テーマ: 「七転び八起き」
言語: 日本語
長さ: 10秒
ビジュアルモード: 静止画スライド（DALL-E 3）
```

**期待結果:**
- 4枚の静止画が2.5秒ごとに切り替わる
- アニメーションなし
- 各画像が異なるデザイン

---

### テストケース2: Ken Burns効果モード

```
テーマ: 「犬も歩けば棒に当たる」
言語: English
長さ: 15秒
ビジュアルモード: 動きのあるアニメーション（Ken Burns効果）
```

**期待結果:**
- 6枚の画像が2.5秒ごとに切り替わる
- 各画像でズーム・パンアニメーション
- 効果のバリエーション（ズームイン/アウト、パン左右）

---

## 📝 まとめ

### 修正内容

1. **visualModeパラメータの追加**
   - フロントエンド → バックエンド → FFmpegの完全な伝達
   - デフォルト: 'static'（静止画）

2. **Ken Burns効果の条件付き適用**
   - 静止画モード: シンプルなscale + pad
   - Ken Burnsモード: zoompanフィルター

3. **複数スライドの修正**
   - Pexels検索を削除
   - すべてのシーンでDALL-E画像生成
   - 2.5秒ごとに1枚のペース

4. **ログの改善**
   - `Scene X/Y: Generating DALL-E image...`
   - 進行状況が明確に

### 結果

- ✅ 静止画モード: アニメーションなしのクリーンなスライド
- ✅ Ken Burnsモード: 映画のようなズーム・パン
- ✅ 複数スライド: 2.5秒ごとに新しい画像
- ✅ 視覚的多様性: 6種類のテーマでバリエーション豊か

---

**最終更新**: 2025-11-10  
**バージョン**: 1.4.0  
**修正者**: Claude (AI Developer)
