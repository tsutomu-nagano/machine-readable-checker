from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path

from ...findings import CheckResult
from ..common.table import check_rows


def check_csv_file(path: Path) -> CheckResult:
    delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
    content, encoding = _decode_text(path.read_bytes())
    result = check_rows(csv.reader(StringIO(content, newline=""), delimiter=delimiter), str(path))
    result.encoding = encoding
    return result


def _decode_text(content: bytes) -> tuple[str, str]:
    if content.startswith(b"\xef\xbb\xbf"):
        return content.decode("utf-8-sig"), "utf-8-sig"

    try:
        return content.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return content.decode("cp932"), "cp932"
