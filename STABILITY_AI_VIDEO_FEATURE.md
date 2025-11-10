# Stability AI Video Generation Feature

## 概要 (Overview)

Kotowaza Channelに **Stability AI Video Generation** 機能を追加しました。従来のDALL-E 3による静止画スライドに加えて、動きのあるアニメ風の動画を生成できるようになりました。

Added **Stability AI Video Generation** feature to Kotowaza Channel. In addition to static image slides by DALL-E 3, you can now generate animated anime-style videos.

---

## 🎬 主な機能 (Key Features)

### 1. **2つのビジュアルモード (Two Visual Modes)**

#### 📷 静止画モード (Images Mode) - デフォルト
- DALL-E 3による高品質な3Dアニメスタイルの画像
- 2.5秒ごとに1枚の画像を生成
- コスト: 画像1枚あたり約$0.04

#### 🎥 アニメーション動画モード (Animation Video Mode)
- Stability AI Video APIによる動きのある動画生成
- **コスト最適化**: 5秒あたり1つの動画を生成（例: 10秒動画 = 2つの動画クリップ）
- 各動画は約2秒の長さでループ可能
- アニメスタイルの滑らかなモーション

---

## 🔧 技術仕様 (Technical Specifications)

### Stability AI Video API

**エンドポイント**: `https://api.stability.ai/v2beta/image-to-video`

**プロセス**:
1. DALL-E 3でベース画像を生成（アニメスタイル）
2. Stability AI Video APIで画像から動画を生成
3. 生成された動画（MP4）をFFmpegで最終動画に統合

**パラメータ**:
```javascript
{
  cfg_scale: 2.5,           // 画像への忠実度（1.0-10.0）
  motion_bucket_id: 127,    // モーション量（127 = 高い動き）
  seed: random              // ランダムシード
}
```

**出力**:
- フォーマット: MP4
- 長さ: 約2秒（25フレーム + 補間）
- 解像度: 入力画像に依存（1024x576, 768x768, 576x1024対応）

---

## 💰 コスト最適化戦略 (Cost Optimization Strategy)

### なぜ「5秒あたり1動画」？

Stability AI Video APIは1回の生成でコストが発生します。そのため:

- **10秒動画** → 2つの動画クリップ
- **15秒動画** → 3つの動画クリップ
- **30秒動画** → 6つの動画クリップ

各動画クリップは複数のシーンの内容を組み合わせたプロンプトで生成されます。

### 計算例 (Example Calculation)

**10秒動画の場合**:
- シーン数: 4（2.5秒 × 4 = 10秒）
- 動画生成数: 2（5秒 × 2 = 10秒）
- シーン1-2 → 動画1
- シーン3-4 → 動画2

---

## 🎨 実装詳細 (Implementation Details)

### 1. **新しいサービス: StabilityAIService**

ファイル: `backend/services/stabilityAIService.js`

主な機能:
- `generateVideoFromImage()` - 画像から動画生成
- `generateImage()` - Stable Diffusion 3で画像生成（将来の拡張用）
- `saveVideo()` / `saveImage()` - ファイル保存ヘルパー

### 2. **VideoGeneratorService の拡張**

ファイル: `backend/services/videoGeneratorService.js`

追加パラメータ:
- `visualMode`: 'images' (デフォルト) または 'stability-video'
- `stabilityAiKey`: Stability AI APIキー

新しいロジック:
```javascript
if (visualMode === 'stability-video' && stabilityAiKey) {
  // 5秒あたり1動画の生成
  const videosNeeded = Math.ceil(duration / 5);
  
  for (let i = 0; i < videosNeeded; i++) {
    // 1. DALL-E 3でベース画像生成
    // 2. Stability AIで動画化
    // 3. 公開URLを作成
  }
}
```

### 3. **フロントエンド UI 追加**

ファイル: `frontend/src/components/VideoGenerator.js`

新しいフォームフィールド:
```jsx
<select name="visualMode">
  <option value="images">🖼️ 静止画スライド（DALL-E 3）</option>
  <option value="stability-video">🎬 アニメーション動画（Stability AI Video）</option>
</select>
```

コスト情報の表示:
- Stability AI選択時に「5秒あたり1つの動画を生成」と表示

---

## 📝 使用方法 (How to Use)

### 1. **APIキーの設定**

「設定」タブで以下を設定:
- ✅ OpenAI API Key (必須)
- ✅ ElevenLabs API Key (必須)
- ✅ **Stability AI API Key** (動画生成を使う場合のみ必須)

Stability AI APIキーの取得:
1. https://platform.stability.ai/ にアクセス
2. アカウント作成
3. APIキーを生成
4. Kotowaza Channelの設定に入力

### 2. **動画生成**

1. **テーマ入力**: 例: "七転び八起き"
2. **動画の長さ**: 10-120秒
3. **ビジュアルモード**: 
   - 📷 静止画スライド（DALL-E 3）← デフォルト
   - 🎥 **アニメーション動画（Stability AI Video）** ← 新機能！
4. **動画生成開始**

---

## ⚠️ 重要な注意事項 (Important Notes)

### Stability AI Video API の廃止予定

**注意**: Stability AIは2025年7月24日にStable Video Diffusion APIの廃止を発表しています。

ソース: https://stability.ai/api-pricing-update-25

**対応策**:
- 現在は使用可能ですが、将来的に代替APIへの移行が必要
- 代替候補: Runway Gen-3, Pika Labs, Luma AI など
- アーキテクチャは拡張可能に設計済み（新しいサービスクラスを追加するだけ）

### 生成時間

- **DALL-E 3画像**: 約10-15秒/枚
- **Stability AI動画**: 約40-60秒/動画
- **10秒動画の合計時間**: 約3-5分

### コスト

- **DALL-E 3**: $0.04/画像
- **Stability AI Video**: 価格は公式サイトで確認
- **ElevenLabs TTS**: $0.30/1000文字

---

## 🐛 トラブルシューティング (Troubleshooting)

### エラー: "Stability AI video generation failed"

**原因**:
1. APIキーが設定されていない
2. APIクォータ超過
3. 画像サイズが対応していない

**解決方法**:
1. 設定タブでStability AI APIキーを確認
2. Stability AIダッシュボードでクレジット残高を確認
3. 画像は自動的に対応解像度に調整されます

### エラー: "The sandbox is running but there's no service on port 3001"

**原因**: 古いポート番号の参照

**解決方法**: 
- 正しいURL: https://5173-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai
- Vite dev serverはポート5173で動作

---

## 🔮 今後の拡張予定 (Future Enhancements)

1. **代替動画生成API対応**
   - Runway Gen-3
   - Pika Labs
   - Luma AI Dream Machine

2. **モーション強度の調整**
   - UIでmotion_bucket_idを変更可能に
   - 低モーション（風景）vs 高モーション（アクション）

3. **動画品質の選択**
   - 標準品質（速い、安い）
   - 高品質（遅い、高い）

4. **プレビュー機能**
   - 動画生成前にベース画像をプレビュー
   - 気に入った画像だけ動画化

---

## 📚 参考資料 (References)

- **Stability AI Developer Platform**: https://platform.stability.ai/
- **API Documentation**: https://platform.stability.ai/docs/api-reference
- **Stable Video Diffusion Paper**: https://stability.ai/research/stable-video-diffusion
- **API Pricing Update**: https://stability.ai/api-pricing-update-25

---

## 📞 サポート (Support)

質問や問題がある場合:
1. GitHubのIssuesに投稿
2. ログを確認: `pm2 logs backend`
3. エラーメッセージをスクリーンショットで共有

---

**最終更新**: 2025-11-10
**バージョン**: 1.1.0
**機能追加者**: Claude (AI Developer)
