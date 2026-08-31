from __future__ import annotations

import csv
from pathlib import Path

from ...findings import CheckResult
from ..common.table import check_rows


def check_csv_file(path: Path) -> CheckResult:
    delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return check_rows(csv.reader(handle, delimiter=delimiter), str(path))
