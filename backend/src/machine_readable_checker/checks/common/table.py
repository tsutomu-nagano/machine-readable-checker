from __future__ import annotations

from typing import Iterable

from ...findings import CheckResult, add_finding
from .patterns import (
    AREA_ABBREVIATIONS,
    AREA_HEADER,
    DEPENDENT_WORDS,
    ERA_ONLY,
    FORBIDDEN_LAYOUT,
    NUMERIC_LIKE,
    NUMERIC_WITH_DECORATION,
    SPECIAL_SYMBOL,
    UNIT_MARK,
    UNIT_WORDS,
)


def check_rows(rows: Iterable[Iterable[object]], path: str = "<memory>") -> CheckResult:
    """Check table data; the first non-empty row is treated as its header."""
    data = [["" if cell is None else str(cell) for cell in row] for row in rows]
    result = CheckResult(path)
    if _is_empty_table(data):
        add_finding(result, "empty-table", "表にデータがありません。", "error")
        return result

    first = _first_non_empty_row_index(data)
    if first:
        add_finding(result, "leading-empty-rows", "先頭の空白行は削除してください。", row=1)

    header = data[first]
    _check_header_names(result, data, first)
    numeric_data_rows = _numeric_data_row_indexes(data)
    split_region = (numeric_data_rows[0] + 1, numeric_data_rows[-1] + 1) if numeric_data_rows else None
    body_rows = _check_body_rows(result, data[first + 1 :], first + 2, len(header), split_region)
    _check_table_context(result, header, body_rows)
    return result


def _is_empty_table(data: list[list[str]]) -> bool:
    return not data or not any(any(cell.strip() for cell in row) for row in data)


def _first_non_empty_row_index(data: list[list[str]]) -> int:
    return next(i for i, row in enumerate(data) if any(cell.strip() for cell in row))


def _check_header_names(result: CheckResult, data: list[list[str]], first_index: int) -> None:
    # 対応チェック項目: 2-5, 4-6
    header_rows, data_columns = _header_rows_above_numeric_data(data, first_index)
    if not header_rows:
        header_rows = [(first_index, data[first_index])]
        data_columns = set(range(1, len(data[first_index]) + 1))

    header_index = max(header_rows, key=lambda item: sum(bool(value.strip()) for value in item[1]))[0]
    for col in sorted(data_columns):
        if not any(col <= len(row) and row[col - 1].strip() for _, row in header_rows):
            add_finding(result, "missing-header", "項目名を省略しないでください。", "error", row=header_index + 1, column=col, value="")

    # A single header row has no parent labels with which repeated child labels
    # can be distinguished, so duplicate detection is reliable only in this case.
    if len(header_rows) != 1:
        return

    names: dict[str, int] = {}
    for col, name in enumerate(header_rows[0][1], 1):
        if col not in data_columns:
            continue
        clean = name.strip()
        if clean in names:
            add_finding(result, "duplicate-header", f"項目名「{clean}」が重複しています。", "error", row=header_index + 1, column=col, value=name)
        elif clean:
            names[clean] = col


def _header_rows_above_numeric_data(
    data: list[list[str]], first_index: int
) -> tuple[list[tuple[int, list[str]]], set[int]]:
    """Infer the header band from its position relative to dense numeric rows."""
    data_row_indexes = _numeric_data_row_indexes(data)
    if not data_row_indexes:
        return [], set()
    data_start = data_row_indexes[0]
    if data_start <= first_index:
        return [], set()

    data_columns = {
        col
        for index in data_row_indexes
        for col, value in enumerate(data[index], 1)
        if value.strip()
    }
    candidates = [
        (index, row)
        for index, row in enumerate(data[first_index:data_start], first_index)
        if any(col <= len(row) and row[col - 1].strip() for col in data_columns)
    ]
    if not candidates:
        return [], data_columns

    anchor_index, _ = max(
        candidates,
        key=lambda item: (
            sum(col <= len(item[1]) and bool(item[1][col - 1].strip()) for col in data_columns),
            item[0],
        ),
    )
    header_rows = [(index, row) for index, row in candidates if anchor_index - 1 <= index <= anchor_index + 2]
    return header_rows, data_columns


def _numeric_data_row_indexes(data: list[list[str]]) -> list[int]:
    numeric_counts = [sum(_is_plain_numeric(value.strip()) for value in row) for row in data]
    peak = max(numeric_counts, default=0)
    if not peak:
        return []
    density = max(1, (peak + 1) // 2)
    return [index for index, count in enumerate(numeric_counts) if count >= density]


def _check_body_rows(
    result: CheckResult,
    rows: list[list[str]],
    start_index: int,
    header_width: int,
    split_region: tuple[int, int] | None,
) -> list[tuple[int, list[str]]]:
    body_rows: list[tuple[int, list[str]]] = []
    gap_seen = False
    for index, row in enumerate(rows, start_index):
        if not any(cell.strip() for cell in row):
            if split_region and split_region[0] <= index <= split_region[1]:
                gap_seen = True
            continue
        if gap_seen and split_region and index <= split_region[1]:
            add_finding(result, "split-table", "空白行で表を分断しないでください。", "warning", row=index)
        gap_seen = False
        if len(row) != header_width:
            add_finding(result, "inconsistent-columns", "データ行の列数が項目名の列数と一致しません。", "error", row=index)
        body_rows.append((index, row))
        for col, value in enumerate(row, 1):
            _check_cell_value(result, value, index, col)
    return body_rows


def _check_cell_value(result: CheckResult, value: str, row: int, column: int) -> None:
    if not value:
        return
    if FORBIDDEN_LAYOUT.search(value):
        add_finding(result, "layout-whitespace", "空白や改行で体裁を整えず、列を分けてください。", "warning", row=row, column=column, value=value)
    if DEPENDENT_WORDS.search(value):
        add_finding(result, "dependent-character", "機種依存文字は使用しないでください。", "warning", row=row, column=column, value=value)
    if NUMERIC_WITH_DECORATION.match(value):
        add_finding(result, "decorated-number", "数値・単位・注記は別の列にしてください。", "warning", row=row, column=column, value=value)
    if ERA_ONLY.match(value.strip()):
        add_finding(result, "era-only-date", "時間軸は西暦を併記してください。", "warning", row=row, column=column, value=value)


def _check_table_context(result: CheckResult, header: list[str], body_rows: list[tuple[int, list[str]]]) -> None:
    _check_repeated_header(result, header, body_rows)
    _check_column_context(result, header, body_rows)


def _check_repeated_header(result: CheckResult, header: list[str], body_rows: list[tuple[int, list[str]]]) -> None:
    # 対応チェック項目: 3-2, 4-14
    normalized_header = [cell.strip() for cell in header]
    for row_index, row in body_rows:
        if [cell.strip() for cell in row[: len(normalized_header)]] == normalized_header:
            add_finding(result, "multiple-table-sets", "１ファイル内に変数とデータのセットを複数掲載しないでください。", "warning", row=row_index)
            break


def _check_column_context(result: CheckResult, header: list[str], body_rows: list[tuple[int, list[str]]]) -> None:
    for col, raw_name in enumerate(header, 1):
        name = raw_name.strip()
        column_values = [row[col - 1].strip() for _, row in body_rows if col <= len(row)]
        non_empty_values = [value for value in column_values if value]
        if not non_empty_values:
            continue
        numeric_count = sum(_is_plain_numeric(value) for value in non_empty_values)
        special_count = sum(bool(SPECIAL_SYMBOL.match(value)) for value in non_empty_values)
        _check_missing_unit(result, name, col, numeric_count, non_empty_values)
        _check_ambiguous_empty_value(result, body_rows, col, numeric_count, special_count, column_values)
        _check_area_abbreviation(result, name, body_rows, col)


def _check_missing_unit(result: CheckResult, name: str, col: int, numeric_count: int, non_empty_values: list[str]) -> None:
    # 対応チェック項目: 2-8, 4-7
    if UNIT_WORDS.search(name) and not UNIT_MARK.search(name) and numeric_count >= max(2, len(non_empty_values) // 2):
        add_finding(result, "missing-unit", "単位が必要な項目は、項目名と同じフィールドに単位を記載してください。", "warning", row=1, column=col, value=name)


def _check_ambiguous_empty_value(
    result: CheckResult,
    body_rows: list[tuple[int, list[str]]],
    col: int,
    numeric_count: int,
    special_count: int,
    column_values: list[str],
) -> None:
    # 対応チェック項目: 2-12, 4-11
    if numeric_count and special_count and any(not value for value in column_values):
        first_empty_row = next(row_index for row_index, row in body_rows if col <= len(row) and not row[col - 1].strip())
        add_finding(result, "ambiguous-empty-value", "数値列の空欄は、***、X など意味が分かる特殊記号で表してください。", "warning", row=first_empty_row, column=col)


def _check_area_abbreviation(result: CheckResult, name: str, body_rows: list[tuple[int, list[str]]], col: int) -> None:
    # 対応チェック項目: 2-11, 4-10
    if not AREA_HEADER.search(name):
        return
    for row_index, row in body_rows:
        if col <= len(row) and row[col - 1].strip() in AREA_ABBREVIATIONS:
            add_finding(result, "area-abbreviation", "地域は標準地域コード又は地域名称で表記してください。", "warning", row=row_index, column=col, value=row[col - 1])
            break


def _is_plain_numeric(value: str) -> bool:
    return bool(NUMERIC_LIKE.match(value)) and not bool(NUMERIC_WITH_DECORATION.match(value))
