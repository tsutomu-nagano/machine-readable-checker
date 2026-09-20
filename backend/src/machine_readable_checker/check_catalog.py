from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .findings import Finding


@dataclass(frozen=True)
class CheckItem:
    id: str
    label: str
    finding_codes: tuple[str, ...]
    scope: str


COMMON_CHECK_ITEM_REFERENCES = {
    "unsupported-format": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "legacy-xls": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "invalid-xlsx": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "empty-workbook": "チェック項目１ ファイル形式は Excel か CSV となっているか",
    "merged-cells": "チェック項目２-３ セルの結合をしていないか",
    "formulas": "チェック項目２-６ 数式を使用している場合は、数値データに修正しているか",
    "xlsx-object": "チェック項目２-７ オブジェクトを使用していないか",
}


CSV_CHECK_ITEM_REFERENCES = {
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
}


EXCEL_CHECK_ITEM_REFERENCES = {
    "empty-table": "チェック項目３-１ データが分断されていないか",
    "missing-header": "チェック項目２-５ 項目名等を省略していないか",
    "duplicate-header": "チェック項目２-５ 項目名等を省略していないか",
    "inconsistent-columns": "チェック項目２-１ １セル１データとなっているか",
    "leading-empty-rows": "チェック項目３-１ データが分断されていないか",
    "split-table": "チェック項目３-１ データが分断されていないか",
    "layout-whitespace": "チェック項目２-４ スペースや改行等で体裁を整えていないか",
    "dependent-character": "チェック項目２-９ 機種依存文字を使用していないか。",
    "decorated-number": "チェック項目２-２ 数値データは数値属性とし、文字列を含まないこと",
    "era-only-date": "チェック項目２-10 e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか",
    "missing-unit": "チェック項目２-８ データの単位を記載しているか",
    "area-abbreviation": "チェック項目２-11 地域コード又は地域名称が表記されているか",
    "ambiguous-empty-value": "チェック項目２-12 数値データの同一列内に特殊記号（秘匿等）が含まれる場合",
    "multiple-table-sets": "チェック項目３-２ １シートに複数の表が掲載されていないか",
}


CHECK_ITEMS = (
    CheckItem("estat-1", "チェック項目１ ファイル形式は Excel か CSV となっているか", ("unsupported-format", "invalid-xlsx", "empty-workbook", "legacy-xls"), "all"),
    CheckItem("estat-2-1", "チェック項目２-１ １セル１データとなっているか", (), "xlsx"),
    CheckItem("estat-2-2", "チェック項目２-２ 数値データは数値属性とし、文字列を含まないこと", ("decorated-number",), "xlsx"),
    CheckItem("estat-2-3", "チェック項目２-３ セルの結合をしていないか", ("merged-cells",), "xlsx"),
    CheckItem("estat-2-4", "チェック項目２-４ スペースや改行等で体裁を整えていないか", ("layout-whitespace",), "xlsx"),
    CheckItem("estat-2-5", "チェック項目２-５ 項目名等を省略していないか", ("missing-header", "duplicate-header"), "xlsx"),
    CheckItem("estat-2-6", "チェック項目２-６ 数式を使用している場合は、数値データに修正しているか", ("formulas",), "xlsx"),
    CheckItem("estat-2-7", "チェック項目２-７ オブジェクトを使用していないか", ("xlsx-object",), "xlsx"),
    CheckItem("estat-2-8", "チェック項目２-８ データの単位を記載しているか", ("missing-unit",), "xlsx"),
    CheckItem("estat-2-9", "チェック項目２-９ 機種依存文字を使用していないか。", ("dependent-character",), "xlsx"),
    CheckItem("estat-2-10", "チェック項目２-10 e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか", ("era-only-date",), "xlsx"),
    CheckItem("estat-2-11", "チェック項目２-11 地域コード又は地域名称が表記されているか", ("area-abbreviation",), "xlsx"),
    CheckItem("estat-2-12", "チェック項目２-12 数値データの同一列内に特殊記号（秘匿等）が含まれる場合", ("ambiguous-empty-value",), "xlsx"),
    CheckItem("estat-3-1", "チェック項目３-１ データが分断されていないか", ("leading-empty-rows", "split-table"), "xlsx"),
    CheckItem("estat-3-2", "チェック項目３-２ １シートに複数の表が掲載されていないか", ("multiple-table-sets",), "xlsx"),
    CheckItem("estat-4-1", "チェック項目４-１ 変数行から始まり、次行からデータ入力がされているか", ("empty-table", "leading-empty-rows"), "csv"),
    CheckItem("estat-4-2", "チェック項目４-２ １フィールド１データとなっているか", ("layout-whitespace",), "csv"),
    CheckItem("estat-4-3", "チェック項目４-３ 数値データは数値属性とし、文字列を含まないこと", ("decorated-number",), "csv"),
    CheckItem("estat-4-4", "チェック項目４-４ スペースを使っていないか", ("layout-whitespace",), "csv"),
    CheckItem("estat-4-5", "チェック項目４-５ １行１データで表現されているか", ("inconsistent-columns",), "csv"),
    CheckItem("estat-4-6", "チェック項目４-６ 項目名等を省略していないか", ("missing-header", "duplicate-header"), "csv"),
    CheckItem("estat-4-7", "チェック項目４-７ データの単位を記載しているか", ("missing-unit",), "csv"),
    CheckItem("estat-4-8", "チェック項目４-８ 機種依存文字を使用していないか", ("dependent-character",), "csv"),
    CheckItem("estat-4-9", "チェック項目４-９ e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか", ("era-only-date",), "csv"),
    CheckItem("estat-4-10", "チェック項目４-10 地域コード又は地域名称が表記されているか", ("area-abbreviation",), "csv"),
    CheckItem("estat-4-11", "チェック項目４-11 数値データの同一列内に特殊記号（秘匿等）が含まれる場合", ("ambiguous-empty-value",), "csv"),
    CheckItem("estat-4-12", "チェック項目４-12 各フィールドの値をダブルコーテーション（“）で囲んでいるか", (), "csv"),
    CheckItem("estat-4-13", "チェック項目４-13 データが分断されていないか", ("leading-empty-rows", "split-table"), "csv"),
    CheckItem("estat-4-14", "チェック項目４-14 １ファイル内に変数とデータのセットが複数掲載されていないか", ("multiple-table-sets",), "csv"),
)


def finding_check_item(path: str, code: str) -> str | None:
    suffix = table_suffix(path)
    references = EXCEL_CHECK_ITEM_REFERENCES if suffix in {".xlsx", ".xls"} else CSV_CHECK_ITEM_REFERENCES
    return COMMON_CHECK_ITEM_REFERENCES.get(code) or references.get(code)


def check_statuses(path: str, findings: list[Finding]) -> list[dict]:
    """Return every check outcome, including checks with no detected issue."""
    suffix = table_suffix(path)
    has_table = suffix in {".csv", ".tsv", ".xlsx", ".xls"}
    is_csv = suffix in {".csv", ".tsv"}
    is_excel = suffix in {".xlsx", ".xls"}
    unchecked = unchecked_check_ids(suffix)
    present_codes = {finding.code for finding in findings}
    statuses: list[dict] = []
    for item in CHECK_ITEMS:
        applicable = (
            item.scope == "all"
            or item.scope == "table" and has_table
            or item.scope == "xlsx" and is_excel
            or item.scope == "csv" and is_csv
        )
        detected = sorted(set(item.finding_codes) & present_codes) if applicable else []
        status = "not_applicable"
        if applicable:
            status = "unchecked" if item.id in unchecked else "issues_found" if detected else "passed"
        statuses.append(
            {
                "id": item.id,
                "label": item.label,
                "status": status,
                "finding_codes": detected,
                "finding_count": sum(finding.code in item.finding_codes for finding in findings),
            }
        )
    return statuses


def unchecked_check_ids(suffix: str) -> set[str]:
    if suffix == ".xls":
        return {"estat-2-6"}
    return set()


def table_suffix(path: str) -> str:
    suffix = Path(path).suffix.lower()
    if suffix not in {".csv", ".tsv", ".xlsx", ".xls"} and ":" in path:
        suffix = Path(path.rsplit(":", 1)[0]).suffix.lower()
    return suffix
