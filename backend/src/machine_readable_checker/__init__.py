"""Machine-readable statistical-table checker."""

from .checker import CheckResult, Finding, check_file, check_rows

__all__ = ["CheckResult", "Finding", "check_file", "check_rows"]
