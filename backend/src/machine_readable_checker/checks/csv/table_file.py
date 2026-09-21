from __future__ import annotations

import csv
from dataclasses import replace
from io import StringIO
from pathlib import Path

from ...findings import CheckResult
from ..common.table import check_rows


def check_csv_file(path: Path) -> CheckResult:
    delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
    content, encoding = _decode_text(path.read_bytes())
    rows = list(csv.reader(StringIO(content, newline=""), delimiter=delimiter))
    result = check_rows(rows, str(path))
    result.encoding = encoding
    result.sheet_previews.append(_build_table_preview(rows))
    result.findings = [_with_preview(finding, rows) for finding in result.findings]
    return result


def _with_preview(finding, rows: list[list[str]]):
    if finding.row is None:
        return finding
    focus_column = finding.column or 1
    column_count = max((len(row) for row in rows), default=0)
    start_row = max(1, finding.row - 2)
    end_row = min(max(len(rows), finding.row), finding.row + 2)
    start_column = max(1, focus_column - 2)
    end_column = min(max(column_count, focus_column), focus_column + 3)
    preview = {
        "sheet": "",
        "start_row": start_row,
        "start_column": start_column,
        "columns": [_column_label(column) for column in range(start_column, end_column + 1)],
        "rows": [
            [row[column - 1] if column <= len(row) else "" for column in range(start_column, end_column + 1)]
            for row in rows[start_row - 1:end_row]
        ],
        "focus_row": finding.row,
        "focus_column": finding.column,
    }
    return replace(finding, preview=preview)


def _build_table_preview(rows: list[list[str]]) -> dict:
    column_count = max((len(row) for row in rows), default=0)
    return {
        "sheet": "",
        "columns": [_column_label(column) for column in range(1, column_count + 1)],
        "rows": [row + [""] * (column_count - len(row)) for row in rows],
        "merged_ranges": [],
    }


def _column_label(column: int) -> str:
    label = ""
    while column:
        column, remainder = divmod(column - 1, 26)
        label = chr(65 + remainder) + label
    return label


def _decode_text(content: bytes) -> tuple[str, str]:
    if content.startswith(b"\xef\xbb\xbf"):
        return content.decode("utf-8-sig"), "utf-8-sig"

    try:
        return content.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return content.decode("cp932"), "cp932"
