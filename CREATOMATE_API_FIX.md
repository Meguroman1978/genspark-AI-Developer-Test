# 🎯 Creatomate API形式修正 - JPEG問題の解決

**日時**: 2025年11月9日 09:06 UTC  
**ステータス**: ✅ 修正完了 - テスト待ち

---

## 🔍 根本原因の特定

### 問題の本質
Creatomateが**正しいJSONを受け取っていなかった**ことが判明しました。

### 証拠
お送りいただいたCreatomateのレンダーレスポンス:
```json
{
  "id": "1f0f1713-1e39-425c-813a-30e739657152",
  "status": "succeeded",
  "output_format": "jpg",    // ❌ JPEGになっている
  "render_scale": 0.375,     // ❌ 37.5%に縮小されている
  "width": 480,              // ❌ 1920のはず
  "height": 270,             // ❌ 1080のはず
  "source": {}               // ❌❌ 空！何も送信されていない！
}
```

**`source: {}`** = コンポジションが空 = Creatomateが何を作れば良いか分からない

---

## 📚 Creatomate公式ドキュメントの確認

公式API ドキュメント: https://creatomate.com/docs/api/rest-api/renders

### 正しいAPI形式

```json
{
  "composition": {           // ✅ 'composition' を使う
    "width": 1920,
    "height": 1080,
    "duration": 10,
    "frameRate": 30,         // ✅ camelCase
    "children": [            // ✅ 'children' を使う (NOT 'elements')
      {
        "type": "image",
        "source": "https://...", // ✅ 'source' を使う (children内では)
        "x": "0%",
        "y": "0%",
        "width": "100%",
        "height": "100%",
        "time": 0,             // ✅ 'time' を使う (children内では)
        "duration": 2.5,
        "fit": "cover"         // ✅ 'fit' を使う (children内では)
      },
      {
        "type": "audio",
        "source": "https://...",
        "time": 0,
        "duration": 10,
        "volume": 1.0
      },
      {
        "type": "text",
        "text": "タイトル",
        "fontFamily": "Arial",  // ✅ camelCase
        "fontSize": 64,         // ✅ camelCase
        "fillColor": "#ffffff", // ✅ camelCase
        "strokeColor": "#000000",
        "strokeWidth": 3,
        "x": "50%",
        "y": "10%",
        "xAnchor": "50%",      // ✅ センター配置
        "yAnchor": "50%",
        "time": 0,
        "duration": 3
      }
    ]
  },
  "outputs": [               // ✅ 別のフィールドとして 'outputs' を使う
    {
      "format": "mp4",       // ✅ ここでMP4を指定
      "quality": "high"
    }
  ]
}
```

---

## 🔧 実施した修正

### 変更前 (間違っていたコード)

```javascript
// ❌ 間違った形式
const response = await axios.post(
  `https://api.creatomate.com/v2/renders`,
  {
    source: {
      output_format: 'mp4',
      width: 1920,
      height: 1080,
      frame_rate: 30,
      elements: [...]  // ❌ 'elements' は間違い
    }
  }
);
```

### 変更後 (正しいコード)

```javascript
// ✅ 正しい形式
const renderRequest = {
  composition: {
    width: 1920,
    height: 1080,
    duration: duration,
    frameRate: 30,      // ✅ camelCase
    children: [...]     // ✅ 'children' が正しい
  },
  outputs: [
    {
      format: 'mp4',
      quality: 'high'
    }
  ]
};

const response = await axios.post(
  `https://api.creatomate.com/v2/renders`,
  renderRequest
);
```

---

## 📋 フィールド名の変更一覧

| 要素 | 変更前 (間違い) | 変更後 (正しい) |
|------|----------------|----------------|
| トップレベル | `source: { ... }` | `composition: { ... }, outputs: [...]` |
| 子要素配列 | `elements` | `children` |
| フレームレート | `frame_rate` | `frameRate` |
| 画像URL | `src` | `source` (children内では) |
| 時間位置 | `start` | `time` (children内では) |
| フィット方法 | `scale_mode` | `fit` (children内では) |
| フォント | `font_family` | `fontFamily` |
| フォントサイズ | `font_size` | `fontSize` |
| 塗り色 | `fill_color` | `fillColor` |
| 線の色 | `stroke_color` | `strokeColor` |
| 線の幅 | `stroke_width` | `strokeWidth` |
| 出力形式 | `output_format` (composition内) | `outputs[].format` (別フィールド) |

---

## 🎯 期待される結果

### 修正後のCreatomateレスポンス (予想)

```json
{
  "id": "...",
  "status": "succeeded",
  "output_format": "mp4",     // ✅ MP4になるはず
  "render_scale": 1.0,        // ✅ 100%サイズ
  "width": 1920,              // ✅ 正しいサイズ
  "height": 1080,             // ✅ 正しいサイズ
  "url": "https://.../*.mp4", // ✅ MP4ファイル
  "source": {                 // ✅ コンポジションが含まれる
    "composition": {
      "width": 1920,
      "height": 1080,
      ...
    }
  }
}
```

---

## 🧪 テスト手順

### ステップ1: アプリにアクセス
**https://3000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai**

### ステップ2: 動画生成をテスト
1. トピック: 任意 (例: "富士山の四季")
2. 言語: 日本語
3. 長さ: 10秒
4. 「🎥 動画生成を開始」をクリック

### ステップ3: ログで確認

バックエンドログを監視:
```bash
cd /home/user/webapp && tail -f temp/backend.log | grep -A 80 "Request structure:"
```

**確認ポイント**:
```json
{
  "composition": {           // ✅ これが表示されるはず
    "children": [            // ✅ これが表示されるはず
      {
        "source": "...",     // ✅ 'source' になっているはず
        "time": 0,           // ✅ 'time' になっているはず
        "fit": "cover"       // ✅ 'fit' になっているはず
      }
    ]
  },
  "outputs": [               // ✅ これが表示されるはず
    {
      "format": "mp4"        // ✅ MP4が指定されているはず
    }
  ]
}
```

### ステップ4: Creatomateの応答確認

ログで以下を探す:
```
[Job X] Render status: succeeded
[Job X] Video URL: https://.../*.mp4
```

**重要**: URLが `.mp4` で終わっていることを確認！

---

## ⚠️ まだ残っている問題

### YouTube自動アップロード

**ステータス**: まだ401エラーが発生します

**原因**: OAuthトークンの有効期限切れ

**対策**: 
1. 動画自体は正常に生成されます ✅
2. ダウンロードして手動アップロード可能 ✅
3. 自動アップロードを有効にしたい場合は、OAuth 2.0 Playgroundで新しいトークンを取得してください

---

## 🔄 変更履歴

### Commit 439da83 (最新)
- Creatomate API形式を公式ドキュメント通りに修正
- `source` → `composition` + `outputs`
- `elements` → `children`
- `output_format` → `outputs[].format`
- すべてのフィールド名をcamelCaseに変更
- サーバーを再起動してコードをリロード

---

## ✅ 成功判定基準

動画生成が**正常に修正された**と判断できる条件:

1. ✅ バックエンドログに `"composition": { ... }` が表示される
2. ✅ バックエンドログに `"children": [ ... ]` が表示される
3. ✅ バックエンドログに `"outputs": [ ... ]` が表示される
4. ✅ Creatomateのレンダー応答に `"output_format": "mp4"` が含まれる
5. ✅ CreatomateのURLが `.mp4` 拡張子で終わる
6. ✅ 生成された動画がアプリの動画プレーヤーで**再生可能**
7. ✅ 動画に**画像シーケンスと音声**が含まれる (静止画ではない)
8. ✅ 動画の解像度が **1920x1080** (480x270ではない)

---

## 📝 技術メモ

### なぜ間違った形式を使っていたのか？

1. Creatomate APIには**2つの異なる方法**がある:
   - **テンプレートベース**: テンプレートIDを指定して変数を上書き
   - **カスタムコンポジション**: 完全なコンポジションを送信

2. 私たちは**カスタムコンポジション**を使っているが、フィールド名が公式ドキュメントと異なっていた

3. 公式ドキュメントを参照して、正しい形式に修正

### Private設定について

お問い合わせの「CreatomateのプロジェクトがPrivateになっている」件は、**API使用には影響しません**。

- Privateプロジェクト = Webエディタでのアクセス制限
- API経由のレンダー = APIキーがあれば実行可能
- 生成された動画URL = 公開URLとして返される

したがって、Private設定は問題ではありません。

---

## 🎉 まとめ

### 修正完了 ✅
- Creatomate API形式を公式ドキュメント通りに修正
- すべてのフィールド名を正しい形式に変更
- サーバーを再起動して新しいコードを読み込み

### 次のステップ 🚀
**今すぐテストしてください！**

動画生成を実行して、今度は**MP4動画**が正しく生成されることを確認してください。

フロントエンドURL:  
**https://3000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai**

---

**これで本当に直るはずです！** 🎬✨

何か問題が発生した場合は、バックエンドログを共有してください。

---

**作成日時**: 2025年11月9日 09:06 UTC  
**Commit**: 439da83  
**参考資料**: https://creatomate.com/docs/api/rest-api/renders
