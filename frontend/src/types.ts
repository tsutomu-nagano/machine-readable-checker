export type CheckStatus = "passed" | "issues_found" | "unchecked" | "not_applicable";
export type Severity = "error" | "warning";

export interface ExcelPreview {
  sheet: string;
  start_row: number;
  start_column: number;
  columns: string[];
  rows: string[][];
  focus_row: number;
  focus_column?: number | null;
}

export interface Finding {
  code: string;
  message: string;
  severity: Severity;
  check_item?: string | null;
  sheet?: string | null;
  row?: number | null;
  column?: number | null;
  value?: string | null;
  preview?: ExcelPreview | null;
}

export interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  finding_codes: string[];
  finding_count: number;
}

export interface CheckResult {
  path: string;
  filename: string;
  encoding?: string | null;
  source_url?: string;
  valid: boolean;
  findings: Finding[];
  checks: CheckItem[];
  summary: Record<CheckStatus, number>;
}

export interface HistoryRecord {
  id: string;
  userId: string | null;
  checkedAt: string;
  filename: string;
  sourceUrl: string | null;
  valid: boolean;
  summary: CheckResult["summary"];
  schemaVersion: number;
  result: CheckResult;
}
