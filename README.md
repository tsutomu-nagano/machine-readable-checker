# machine-readable-checker


e-Stat の「結果表における機械判読可能なデータ作成に関する表記方法 Ver.1.2」を参考に、統計表を機械判読しやすい形にするための簡易チェッカーです。

## 対象

- CSV / TSV
- Excel `.xlsx`（セル結合、数式、図形・画像も検出）
- `.xls` は対象として認識しますが、旧形式のため構造検査は行わず `.xlsx` への変換を案内します。
- e-Stat の `file-download` URL

## チェック内容

- e-Stat の全チェック項目（チェック項目 1、2-1〜2-12、3-1〜3-2、4-1〜4-14）を結果一覧に表示
- 1 行目の項目名の欠落・重複、変数行の前の空白行
- 1 行 1 データ、列数の不一致、空白行による表の分断、複数表セット
- 空白・改行による体裁調整、数値と単位・記号の混在
- 単位の未記載、地域名の略称らしさ、数値列の空欄と特殊記号、機種依存文字、和暦のみの時間軸
- Excel のセル結合、数式、図形・画像などのオブジェクト

## 使い方

```bash
python -m pip install -e ./backend
machine-readable-checker sample.xlsx
machine-readable-checker --json result.csv
```

## API と Web UI

```bash
python -m pip install "./backend[test]"
machine-readable-checker-api
```

ブラウザで `http://localhost:8015` を開くと、ファイルアップロードまたは e-Stat の `file-download` URL から検査結果を確認できます。

ファイルアップロード API は `POST /api/check` です。`multipart/form-data` の `file` フィールドに CSV、TSV、XLSX、XLS を指定すると、検査結果を JSON で返します。アップロード上限は標準で 25 MB です。

URL 指定 API は `POST /api/check-url` です。JSON の `url` フィールドに e-Stat の `file-download` URL を指定します。

```bash
curl -X POST http://localhost:8015/api/check-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040387904&fileKind=0"}'
```

## Render への API デプロイ

このリポジトリは `render.yaml` と `Dockerfile` で Render の Docker Web Service としてデプロイできます。

1. Render Dashboard で GitHub リポジトリを接続します。
2. Blueprint または Web Service 作成時に、このリポジトリの `render.yaml` を使用します。
3. Cloudflare Pages など別ドメインのフロントエンドから呼び出す場合は、Render の環境変数 `CORS_ALLOWED_ORIGINS` に許可するオリジンをカンマ区切りで設定します。

例:

```text
CORS_ALLOWED_ORIGINS=https://example.pages.dev,https://example.com
```

アップロード上限を変更する場合は、環境変数 `MAX_UPLOAD_MB` に MB 単位の整数を指定します。未指定時は `25` です。

```text
MAX_UPLOAD_MB=50
```

Render が設定する `PORT` 環境変数で起動するため、ポート番号の追加設定は不要です。ヘルスチェックは `/health` を使用します。

### Docker で起動・テスト

Web UI（フロントエンド）と API は同じコンテナで起動します。

```bash
docker compose up --build
```

起動後、`http://localhost:8015` を開きます。テストだけを Docker で実行する場合は、別のターミナルで次を実行します。

```bash
docker compose --profile test run --rm test
```

## 開発時のテスト

```bash
cd backend
python -m unittest discover -s tests -v
```

## フロントエンド開発

Web UI は `frontend/` の React + TypeScript + Vite アプリです。開発時は FastAPI と Vite をそれぞれ起動します。

```bash
machine-readable-checker-api
cd frontend
npm install
npm run dev
```

本番用の静的ファイルは `npm run build` で `backend/src/machine_readable_checker/static/` に生成されます。Docker イメージのビルドではこの処理も自動実行されます。

参考資料: [e-Stat: 結果表における機械判読可能なデータ作成に関する表記方法](https://www.e-stat.go.jp/estat/html/machine-readable-stats-format.pdf)
