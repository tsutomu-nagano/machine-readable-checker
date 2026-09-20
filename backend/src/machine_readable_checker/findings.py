from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class Finding:
    code: str
    message: str
    severity: str = "warning"
    sheet: str | None = None
    row: int | None = None
    column: int | None = None
    value: str | None = None
    preview: dict | None = None


@dataclass
class CheckResult:
    path: str
    findings: list[Finding] = field(default_factory=list)
    encoding: str | None = None
    sheet_previews: list[dict] = field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not any(item.severity == "error" for item in self.findings)

    def as_dict(self) -> dict:
        from .check_catalog import check_statuses, finding_check_item

        checks = check_statuses(self.path, self.findings)
        return {
            "path": self.path,
            "encoding": self.encoding,
            "valid": self.valid,
            "findings": [_finding_as_dict(item, finding_check_item(self.path, item.code)) for item in self.findings],
            "sheet_previews": self.sheet_previews,
            "checks": checks,
            "summary": {
                "issues_found": sum(item["status"] == "issues_found" for item in checks),
                "passed": sum(item["status"] == "passed" for item in checks),
                "unchecked": sum(item["status"] == "unchecked" for item in checks),
                "not_applicable": sum(item["status"] == "not_applicable" for item in checks),
            },
        }


def add_finding(
    result: CheckResult,
    code: str,
    message: str,
    severity: str = "warning",
    sheet: str | None = None,
    row: int | None = None,
    column: int | None = None,
    value: str | None = None,
) -> None:
    result.findings.append(Finding(code, message, severity, sheet, row, column, value))


def _finding_as_dict(finding: Finding, check_item: str | None) -> dict:
    result = asdict(finding)
    result["check_item"] = check_item
    return result
