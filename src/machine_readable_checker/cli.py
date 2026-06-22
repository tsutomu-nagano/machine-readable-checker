from __future__ import annotations

import argparse
import json
from pathlib import Path

from .checker import check_file


def main() -> int:
    parser = argparse.ArgumentParser(description="e-Stat の機械判読可能な統計表の簡易チェック")
    parser.add_argument("files", nargs="+", type=Path, help="CSV/TSV/XLSX/XLS ファイル")
    parser.add_argument("--json", action="store_true", help="JSON で出力")
    args = parser.parse_args()
    results = [check_file(path) for path in args.files]
    if args.json:
        print(json.dumps([result.as_dict() for result in results], ensure_ascii=False, indent=2))
    else:
        for result in results:
            print(f"{result.path}: {'OK' if result.valid else 'ERROR'}")
            for finding in result.findings:
                position = "" if finding.row is None else f" ({finding.row}行{finding.column or ''}列)"
                print(f"  [{finding.severity}] {finding.code}{position}: {finding.message}")
    return 0 if all(result.valid for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
