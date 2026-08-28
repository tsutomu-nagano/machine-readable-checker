from __future__ import annotations

import csv
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
FORBIDDEN_LAYOUT = re.compile(r"[\r\n]| {2,}")
DEPENDENT_WORDS = re.compile(r"[①②③④⑤⑥⑦⑧⑨⑩㈱㈲㍾㍽㍼㍻]" )
NUMERIC_WITH_DECORATION = re.compile(r"^\s*[+-]?[0-9][0-9, ]*(?:\.[0-9]+)?\s*(?:[%％円人件戸本個台㎏kg\*†])\s*$")
NUMERIC_LIKE = re.compile(r"^\s*[+-]?[0-9][0-9, ]*(?:\.[0-9]+)?\s*$")
SPECIAL_SYMBOL = re.compile(r"^(?:0|\*\*\*|X)$")
ERA_ONLY = re.compile(r"^(?:令和|平成|昭和|大正|明治)\s*\d+(?:年)?$")
UNIT_WORDS = re.compile(r"(?:数|量|額|率|割合|人口|面積|密度|単価|金額|価格|本数|件数|人数|戸数)$")
UNIT_MARK = re.compile(r"[（(].+[）)]")
AREA_HEADER = re.compile(r"(?:都道府県|市区町村|地域|所在地|住所)")
AREA_ABBREVIATIONS = {
    "青森",
    "岩手",
    "宮城",
    "秋田",
    "山形",
    "福島",
    "茨城",
    "栃木",
    "群馬",
    "埼玉",
    "千葉",
    "神奈川",
    "新潟",
    "富山",
    "石川",
    "福井",
    "山梨",
    "長野",
    "岐阜",
    "静岡",
    "愛知",
    "三重",
    "滋賀",
    "京都",
    "大阪",
    "兵庫",
    "奈良",
    "和歌山",
    "鳥取",
    "島根",
    "岡山",
    "広島",
    "山口",
    "徳島",
    "香川",
    "愛媛",
    "高知",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿児島",
    "沖縄",
}


@dataclass(frozen=True)
class Finding:
    code: str
    message: str
    severity: str = "warning"
    row: int | None = None
    column: int | None = None
    value: str | None = None


@dataclass
class CheckResult:
    path: str
    findings: list[Finding] = field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not any(item.severity == "error" for item in self.findings)

    def as_dict(self) -> dict:
        checks = _check_statuses(self.path, self.findings)
        return {
            "path": self.path,
            "valid": self.valid,
            "findings": [_finding_as_dict(item) for item in self.findings],
            "checks": checks,
            "summary": {
                "issues_found": sum(item["status"] == "issues_found" for item in checks),
                "passed": sum(item["status"] == "passed" for item in checks),
                "not_applicable": sum(item["status"] == "not_applicable" for item in checks),
            },
        }


# e-Stat「結果表における機械判読可能なデータ作成に関する表記方法 Ver.1.2」の全チェック項目。
CHECK_ITEM_REFERENCES = {
    "unsupported-format": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "legacy-xls": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "invalid-xlsx": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "empty-workbook": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "empty-table": "チェック項目４-１ 変数行から始まり、次行からデータ入力がされているか",
    "missing-header": "チェック項目４-６ 項目名等を省略していないか",
    "duplicate-header": "チェック項目４-６ 項目名等を省略していないか",
    "inconsistent-columns": "チェック項目４-５ １行１データで表現されているか",
    "leading-empty-rows": "チェック項目４-１３ データが分断されていないか",
    "split-table": "チェック項目４-１３ データが分断されていないか",
    "layout-whitespace": "チェック項目４-４ スペースを使っていないか",
    "dependent-character": "チェック項目４-８ 機種依存文字を使用していないか",
    "decorated-number": "チェック項目４-３ 数値データは数値属性とし、文字列を含まないこと",
    "era-only-date": "チェック項目４-９ e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか",
    "missing-unit": "チェック項目４-７ データの単位を記載しているか",
    "area-abbreviation": "チェック項目４-10 地域コード又は地域名称が表記されているか",
    "ambiguous-empty-value": "チェック項目４-11 数値データの同一列内に特殊記号（秘匿等）が含まれる場合",
    "multiple-table-sets": "チェック項目４-14 １ファイル内に変数とデータのセットが複数掲載されていないか",
    "merged-cells": "チェック項目２-３ セルの結合をしていないか",
    "formulas": "チェック項目２-６ 数式を使用している場合は、数値データに修正しているか",
    "xlsx-object": "チェック項目２-７ オブジェクトを使用していないか",
}


def _finding_as_dict(finding: Finding) -> dict:
    result = asdict(finding)
    result["check_item"] = CHECK_ITEM_REFERENCES.get(finding.code)
    return result


CHECK_GROUPS = (
    ("estat-1", "チェック項目１ ファイル形式は Excel か CSV となっているか", ("unsupported-format", "invalid-xlsx", "empty-workbook", "legacy-xls"), "all"),
    ("estat-2-1", "チェック項目２-１ １セル１データとなっているか", (), "xlsx"),
    ("estat-2-2", "チェック項目２-２ 数値データは数値属性とし、文字列を含まないこと", ("decorated-number",), "xlsx"),
    ("estat-2-3", "チェック項目２-３ セルの結合をしていないか", ("merged-cells",), "xlsx"),
    ("estat-2-4", "チェック項目２-４ スペースや改行等で体裁を整えていないか", ("layout-whitespace",), "xlsx"),
    ("estat-2-5", "チェック項目２-５ 項目名等を省略していないか", ("missing-header", "duplicate-header"), "xlsx"),
    ("estat-2-6", "チェック項目２-６ 数式を使用している場合は、数値データに修正しているか", ("formulas",), "xlsx"),
    ("estat-2-7", "チェック項目２-７ オブジェクトを使用していないか", ("xlsx-object",), "xlsx"),
    ("estat-2-8", "チェック項目２-８ データの単位を記載しているか", ("missing-unit",), "xlsx"),
    ("estat-2-9", "チェック項目２-９ 機種依存文字を使用していないか。", ("dependent-character",), "xlsx"),
    ("estat-2-10", "チェック項目２-10 e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか", ("era-only-date",), "xlsx"),
    ("estat-2-11", "チェック項目２-11 地域コード又は地域名称が表記されているか", ("area-abbreviation",), "xlsx"),
    ("estat-2-12", "チェック項目２-12 数値データの同一列内に特殊記号（秘匿等）が含まれる場合", ("ambiguous-empty-value",), "xlsx"),
    ("estat-3-1", "チェック項目３-１ データが分断されていないか", ("leading-empty-rows", "split-table"), "xlsx"),
    ("estat-3-2", "チェック項目３-２ １シートに複数の表が掲載されていないか", ("multiple-table-sets",), "xlsx"),
    ("estat-4-1", "チェック項目４-１ 変数行から始まり、次行からデータ入力がされているか", ("empty-table", "leading-empty-rows"), "csv"),
    ("estat-4-2", "チェック項目４-２ １フィールド１データとなっているか", ("layout-whitespace",), "csv"),
    ("estat-4-3", "チェック項目４-３ 数値データは数値属性とし、文字列を含まないこと", ("decorated-number",), "csv"),
    ("estat-4-4", "チェック項目４-４ スペースを使っていないか", ("layout-whitespace",), "csv"),
    ("estat-4-5", "チェック項目４-５ １行１データで表現されているか", ("inconsistent-columns",), "csv"),
    ("estat-4-6", "チェック項目４-６ 項目名等を省略していないか", ("missing-header", "duplicate-header"), "csv"),
    ("estat-4-7", "チェック項目４-７ データの単位を記載しているか", ("missing-unit",), "csv"),
    ("estat-4-8", "チェック項目４-８ 機種依存文字を使用していないか", ("dependent-character",), "csv"),
    ("estat-4-9", "チェック項目４-９ e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか", ("era-only-date",), "csv"),
    ("estat-4-10", "チェック項目４-10 地域コード又は地域名称が表記されているか", ("area-abbreviation",), "csv"),
    ("estat-4-11", "チェック項目４-11 数値データの同一列内に特殊記号（秘匿等）が含まれる場合", ("ambiguous-empty-value",), "csv"),
    ("estat-4-12", "チェック項目４-12 各フィールドの値をダブルコーテーション（“）で囲んでいるか", (), "csv"),
    ("estat-4-13", "チェック項目４-13 データが分断されていないか", ("leading-empty-rows", "split-table"), "csv"),
    ("estat-4-14", "チェック項目４-14 １ファイル内に変数とデータのセットが複数掲載されていないか", ("multiple-table-sets",), "csv"),
)


def _check_statuses(path: str, findings: list[Finding]) -> list[dict]:
    """Return every check outcome, including checks with no detected issue."""
    suffix = Path(path).suffix.lower()
    if suffix not in {".csv", ".tsv", ".xlsx", ".xls"} and ":" in path:
        suffix = Path(path.rsplit(":", 1)[0]).suffix.lower()
    has_table = suffix in {".csv", ".tsv", ".xlsx"}
    is_csv = suffix in {".csv", ".tsv"}
    present_codes = {finding.code for finding in findings}
    statuses: list[dict] = []
    for check_id, label, codes, scope in CHECK_GROUPS:
        applicable = (
            scope == "all"
            or scope == "table" and has_table
            or scope == "xlsx" and suffix == ".xlsx"
            or scope == "csv" and is_csv
        )
        detected = sorted(set(codes) & present_codes) if applicable else []
        statuses.append(
            {
                "id": check_id,
                "label": label,
                "status": "not_applicable" if not applicable else "issues_found" if detected else "passed",
                "finding_codes": detected,
                "finding_count": sum(finding.code in codes for finding in findings),
            }
        )
    return statuses


def _add(
    result: CheckResult,
    code: str,
    message: str,
    severity: str = "warning",
    row: int | None = None,
    column: int | None = None,
    value: str | None = None,
) -> None:
    result.findings.append(Finding(code, message, severity, row, column, value))


def check_rows(rows: Iterable[Iterable[object]], path: str = "<memory>") -> CheckResult:
    """Check a rectangular table; the first non-empty row is treated as its header."""
    data = [["" if cell is None else str(cell) for cell in row] for row in rows]
    result = CheckResult(path)
    if not data or not any(any(cell.strip() for cell in row) for row in data):
        _add(result, "empty-table", "表にデータがありません。", "error")
        return result

    first = next(i for i, row in enumerate(data) if any(cell.strip() for cell in row))
    if first:
        _add(result, "leading-empty-rows", "先頭の空白行は削除してください。", row=1)
    header = data[first]
    width = len(header)
    names: dict[str, int] = {}
    for col, name in enumerate(header, 1):
        clean = name.strip()
        if not clean:
            _add(result, "missing-header", "項目名を省略しないでください。", "error", first + 1, col, name)
        elif clean in names:
            _add(result, "duplicate-header", f"項目名「{clean}」が重複しています。", "error", first + 1, col, name)
        else:
            names[clean] = col

    gap_seen = False
    body_rows: list[tuple[int, list[str]]] = []
    for index, row in enumerate(data[first + 1 :], first + 2):
        if not any(cell.strip() for cell in row):
            gap_seen = True
            continue
        if gap_seen:
            _add(result, "split-table", "空白行で表を分断しないでください。", "warning", index)
            gap_seen = False
        if len(row) != width:
            _add(result, "inconsistent-columns", "データ行の列数が項目名の列数と一致しません。", "error", index)
        body_rows.append((index, row))
        for col, value in enumerate(row, 1):
            _check_cell(result, value, index, col)
    _check_table_context(result, header, body_rows)
    return result


def _check_table_context(result: CheckResult, header: list[str], body_rows: list[tuple[int, list[str]]]) -> None:
    normalized_header = [cell.strip() for cell in header]
    for row_index, row in body_rows:
        if [cell.strip() for cell in row[: len(normalized_header)]] == normalized_header:
            _add(result, "multiple-table-sets", "１ファイル内に変数とデータのセットを複数掲載しないでください。", "warning", row_index)
            break

    for col, raw_name in enumerate(header, 1):
        name = raw_name.strip()
        column_values = [row[col - 1].strip() for _, row in body_rows if col <= len(row)]
        non_empty_values = [value for value in column_values if value]
        if not non_empty_values:
            continue
        numeric_count = sum(_is_plain_numeric(value) for value in non_empty_values)
        special_count = sum(bool(SPECIAL_SYMBOL.match(value)) for value in non_empty_values)
        if UNIT_WORDS.search(name) and not UNIT_MARK.search(name) and numeric_count >= max(2, len(non_empty_values) // 2):
            _add(result, "missing-unit", "単位が必要な項目は、項目名と同じフィールドに単位を記載してください。", "warning", 1, col, name)
        if numeric_count and special_count and any(not value for value in column_values):
            first_empty_row = next(row_index for row_index, row in body_rows if col <= len(row) and not row[col - 1].strip())
            _add(result, "ambiguous-empty-value", "数値列の空欄は、0、***、X など意味が分かる特殊記号で表してください。", "warning", first_empty_row, col)
        if AREA_HEADER.search(name):
            for row_index, row in body_rows:
                if col <= len(row) and row[col - 1].strip() in AREA_ABBREVIATIONS:
                    _add(result, "area-abbreviation", "地域は標準地域コード又は地域名称で表記してください。", "warning", row_index, col, row[col - 1])
                    break


def _is_plain_numeric(value: str) -> bool:
    return bool(NUMERIC_LIKE.match(value)) and not bool(NUMERIC_WITH_DECORATION.match(value))


def _check_cell(result: CheckResult, value: str, row: int, column: int) -> None:
    if not value:
        return
    if FORBIDDEN_LAYOUT.search(value):
        _add(result, "layout-whitespace", "空白や改行で体裁を整えず、列を分けてください。", "warning", row, column, value)
    if DEPENDENT_WORDS.search(value):
        _add(result, "dependent-character", "機種依存文字は使用しないでください。", "warning", row, column, value)
    if NUMERIC_WITH_DECORATION.match(value):
        _add(result, "decorated-number", "数値・単位・注記は別の列にしてください。", "warning", row, column, value)
    if ERA_ONLY.match(value.strip()):
        _add(result, "era-only-date", "時間軸は西暦を併記してください。", "warning", row, column, value)


def check_file(path: str | Path) -> CheckResult:
    file_path = Path(path)
    suffix = file_path.suffix.lower()
    if suffix in {".csv", ".tsv"}:
        delimiter = "\t" if suffix == ".tsv" else ","
        with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
            return check_rows(csv.reader(handle, delimiter=delimiter), str(file_path))
    if suffix == ".xlsx":
        return _check_xlsx(file_path)
    result = CheckResult(str(file_path))
    if suffix == ".xls":
        _add(result, "legacy-xls", "古い .xls 形式は構造検査できません。.xlsx へ変換してください。", "warning")
    else:
        _add(result, "unsupported-format", "CSV、TSV、XLSX、XLS のいずれかを指定してください。", "error")
    return result


def _check_xlsx(path: Path) -> CheckResult:
    result = CheckResult(str(path))
    try:
        workbook = load_workbook(path, data_only=False, read_only=False)
        if not workbook.worksheets:
            _add(result, "empty-workbook", "ワークシートがありません。", "error")
            return result
        for sheet in workbook.worksheets:
            for merged_range in sheet.merged_cells.ranges:
                merged_values = (
                    sheet.cell(row=row_index, column=column_index).value
                    for row_index in range(merged_range.min_row, merged_range.max_row + 1)
                    for column_index in range(merged_range.min_col, merged_range.max_col + 1)
                )
                if not any(str(value).strip() for value in merged_values if value is not None):
                    continue
                _add(
                    result,
                    "merged-cells",
                    "セル結合は使用しないでください。",
                    row=merged_range.min_row,
                    column=merged_range.min_col,
                    value=str(merged_range),
                )
            if sheet._images or sheet._charts:
                _add(result, "xlsx-object", "図形・画像等のオブジェクトではなくセルにデータを入力してください。")
            for row in sheet.iter_rows():
                for cell in row:
                    if cell.data_type == "f":
                        _add(result, "formulas", "結果表は数式ではなく値として出力してください。", row=cell.row, column=cell.column, value=str(cell.value))
            rows = [[cell.value for cell in row] for row in sheet.iter_rows()]
            sheet_result = check_rows(rows, f"{path}:{sheet.title}")
            result.findings.extend(sheet_result.findings)
        workbook.close()
    except (OSError, InvalidFileException, ValueError) as error:
        _add(result, "invalid-xlsx", f"XLSX を読み取れません: {error}", "error")
    return result
