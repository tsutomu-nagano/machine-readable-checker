# machine-readable-checker

e-Stat の「結果表における機械判読可能なデータ作成に関する表記方法 Ver.1.2」を参考に、統計表を機械判読しやすい形にするための簡易チェッカーです。

## 対象

- CSV / TSV
- Excel `.xlsx`（セル結合、数式、図形・画像も検出）
- `.xls` は対象として認識しますが、旧形式のため構造検査は行わず `.xlsx` への変換を案内します。

## チェック内容

- 1 行目の項目名の欠落・重複
- 1 行 1 データ、列数の不一致、空白行による表の分断
- 空白・改行による体裁調整
- 数値と単位・記号の混在、機種依存文字、和暦のみの時間軸
- Excel のセル結合、数式、図形・画像などのオブジェクト

## 使い方

```bash
python -m pip install -e .
machine-readable-checker sample.xlsx
machine-readable-checker --json result.csv
```

## API と Web UI

```bash
python -m pip install ".[test]"
machine-readable-checker-api
```

ブラウザで `http://localhost:8000` を開くと、ファイルをアップロードして検査結果を確認できます。

API は `POST /api/check` です。`multipart/form-data` の `file` フィールドに CSV、TSV、XLSX、XLS を指定すると、検査結果を JSON で返します。アップロード上限は 25 MB です。

## 開発時のテスト

```bash
python -m unittest discover -s tests -v
```

参考資料: [e-Stat: 結果表における機械判読可能なデータ作成に関する表記方法](https://www.e-stat.go.jp/estat/html/machine-readable-stats-format.pdf)
