from __future__ import annotations

from pathlib import Path

from .checks.common.table import check_rows
from .checks.csv.table_file import check_csv_file
from .checks.excel.workbook import check_xls_file, check_xlsx_file
from .findings import CheckResult, Finding, add_finding

__all__ = ["CheckResult", "Finding", "check_file", "check_rows"]


def check_file(path: str | Path) -> CheckResult:
    file_path = Path(path)
    suffix = file_path.suffix.lower()
    if suffix in {".csv", ".tsv"}:
        return check_csv_file(file_path)
    if suffix == ".xlsx":
        return check_xlsx_file(file_path)
    if suffix == ".xls":
        return check_xls_file(file_path)

    result = CheckResult(str(file_path))
    add_finding(result, "unsupported-format", "CSV、TSV、XLSX、XLS のいずれかを指定してください。", "error")
    return result
