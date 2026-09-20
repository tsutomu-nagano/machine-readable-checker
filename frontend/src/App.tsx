import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Braces, CheckCircle2, ChevronRight, CircleHelp, Clock3, FileCheck2,
  FileSpreadsheet, FileText, Info, LoaderCircle, Trash2, UploadCloud, X, XCircle
} from "lucide-react";
import { checkFile, checkUrl } from "@/lib/api";
import { historyStore } from "@/lib/history-store";
import type { CheckItem, CheckResult, ExcelPreview, ExcelSheetPreview, Finding, HistoryRecord } from "@/types";

type Source = "file" | "url";

const statusText = { passed: "問題なし", issues_found: "指摘あり", unchecked: "チェック不可", not_applicable: "対象外" };

function App() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkOpen, setCheckOpen] = useState(false);

  const refreshHistory = async () => setHistory(await historyStore.list());
  useEffect(() => { refreshHistory().catch(() => setNotice("チェック結果一覧を読み込めませんでした。")); }, []);

  const runCheck = async (source: Source, file: File | null, url: string) => {
    setBusy(true); setNotice("");
    try {
      const next = source === "file" ? await checkFile(file!) : await checkUrl(url);
      setResult(next);
      await historyStore.save(next);
      await refreshHistory();
      setCheckOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "検査に失敗しました。");
    } finally { setBusy(false); }
  };

  const openHistory = (record: HistoryRecord) => setResult(record.result);
  const removeHistory = async (record: HistoryRecord) => {
    if (!confirm(`「${record.filename}」のチェック結果を削除しますか？`)) return;
    await historyStore.delete(record.id); await refreshHistory();
  };

  const openCheck = () => { setNotice(""); setCheckOpen(true); };

  return <>
    <div className="app-shell">
    <div className="main-column">
      <Header />
      <main className="page-container">
        <ResultsPage result={result} records={history} onOpen={openHistory} onDelete={removeHistory} onOpenCheck={openCheck} />
      </main>
    </div>
    </div>
    {checkOpen ? <CheckModal busy={busy} notice={notice} onCheck={runCheck} onClose={() => setCheckOpen(false)} /> : null}
  </>;
}

function Header() {
  return <header className="topbar">
    <div className="header-brand"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="machine readability checker" /><span>統計表の品質を、すばやく確かめる</span></div>
    <div className="header-actions"><a className="header-api-link" href="/docs" target="_blank" rel="noreferrer"><Braces />API仕様</a><span className="service-status"><i />サービス稼働中</span></div>
  </header>;
}

function CheckModal({ busy, notice, onCheck, onClose }: { busy: boolean; notice: string; onCheck: (s: Source, f: File | null, u: string) => void; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="check-modal" role="dialog" aria-modal="true" aria-labelledby="check-modal-title">
      <div className="check-modal-heading"><div><span>CHECK WORKSPACE</span><h2 id="check-modal-title">新しいチェック</h2></div><button aria-label="閉じる" onClick={onClose} disabled={busy}><X /></button></div>
      <CheckForm busy={busy} notice={notice} onSubmit={onCheck} />
    </div>
  </div>;
}

function ResultsPage({ result, records, onOpen, onDelete, onOpenCheck }: { result: CheckResult | null; records: HistoryRecord[]; onOpen: (r: HistoryRecord) => void; onDelete: (r: HistoryRecord) => void; onOpenCheck: () => void }) {
  return <div className="page-stack">
    <div className="review-layout">
      <CheckResultList records={records} activeResult={result} onOpen={onOpen} onDelete={onDelete} onOpenCheck={onOpenCheck} />
      {result ? <ResultDashboard key={`${result.path}-${result.filename}`} result={result} /> : <EmptyResult />}
    </div>
  </div>;
}

function CheckForm({ busy, notice, onSubmit }: { busy: boolean; notice: string; onSubmit: (s: Source, f: File | null, u: string) => void }) {
  const [source, setSource] = useState<Source>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (source === "file" && !file) return; if (source === "url" && !url.trim()) return; onSubmit(source, file, url.trim()); };
  return <section className="panel check-form-card">
    <div className="panel-title"><div className="icon-box"><UploadCloud /></div><div><h2>新しいチェック</h2><p>入力方法を選択してデータを指定してください</p></div></div>
    <form onSubmit={submit}>
      <div className="segmented"><button type="button" className={source === "file" ? "active" : ""} onClick={() => setSource("file")}>ファイル</button><button type="button" className={source === "url" ? "active" : ""} onClick={() => setSource("url")}>e-Stat URL</button></div>
      {source === "file" ? <label className="file-drop"><input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} /><FileSpreadsheet /><span>{file?.name ?? "ファイルを選択"}<small>CSV、TSV、XLSX、XLS</small></span></label>
        : <label className="url-field"><span>e-Stat file-download URL</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.e-stat.go.jp/stat-search/file-download?..." /></label>}
      <button className="primary-button" disabled={busy || (source === "file" ? !file : !url.trim())}>{busy ? <><LoaderCircle className="spin" />検査中...</> : <><FileCheck2 />チェックする</>}</button>
    </form>
    {notice ? <p className="notice" role="status"><Info />{notice}</p> : null}
  </section>;
}

function EmptyResult() { return <section className="empty-card"><div><FileCheck2 /></div><h2>チェック結果がここに表示されます</h2><p>ヘッダーの「新しいチェック」からファイルまたはURLを指定してください。</p></section>; }

function isExcelResult(result: CheckResult) {
  return /\.xlsx?$/i.test(result.filename) || /\.xlsx?$/i.test(result.path);
}

function getApplicableChecks(result: CheckResult) {
  const isExcel = isExcelResult(result);
  return result.checks.filter(check => {
    if (check.id === "estat-1") return true;
    return isExcel
      ? check.id.startsWith("estat-2-") || check.id.startsWith("estat-3-")
      : check.id.startsWith("estat-4-");
  });
}

function summarizeChecks(checks: CheckItem[]): CheckResult["summary"] {
  return checks.reduce<CheckResult["summary"]>((summary, check) => {
    summary[check.status] += 1;
    return summary;
  }, { passed: 0, issues_found: 0, unchecked: 0, not_applicable: 0 });
}

function ResultDashboard({ result }: { result: CheckResult }) {
  const isExcel = isExcelResult(result);
  const TypeIcon = isExcel ? FileSpreadsheet : FileText;
  const [onlyIssues, setOnlyIssues] = useState(false);
  const applicableChecks = getApplicableChecks(result);
  const summary = summarizeChecks(applicableChecks);
  const visible = onlyIssues ? applicableChecks.filter(c => c.status === "issues_found") : applicableChecks;
  const [selectedId, setSelectedId] = useState(applicableChecks.find(c => c.status === "issues_found")?.id ?? applicableChecks[0]?.id);
  const selected = visible.find(c => c.id === selectedId) ?? visible[0];
  const findings = selected ? result.findings.filter(f => selected.finding_codes.includes(f.code)) : [];
  return <div className="result-stack">
    <section className={`result-hero ${result.valid ? "valid" : "invalid"}`}><div className="result-file"><div className={isExcel ? "excel" : "csv"}><TypeIcon /></div><span>{result.valid ? "チェック完了" : "確認が必要"}<strong>{result.filename}</strong><small>{result.source_url ? `取得元: ${result.source_url}` : "アップロードされたファイル"}{result.encoding ? ` / 文字コード: ${result.encoding}` : ""}</small></span></div><div className="metrics"><Metric label="問題なし" value={summary.passed} tone="green" /><Metric label="指摘あり" value={summary.issues_found} tone="red" /><Metric label="チェック不可" value={summary.unchecked} tone="amber" /><Metric label="対象外" value={summary.not_applicable} tone="slate" /></div></section>
    <section className="panel results-panel"><div className="results-toolbar"><div><h2>チェック項目</h2><p>{applicableChecks.length}項目の検査結果</p></div><label className="filter-check"><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} />指摘ありのみ表示</label></div>
      <div className="checks-grid"><div className="check-list">{visible.length ? visible.map(check => <CheckRow key={check.id} check={check} active={selected?.id === check.id} onClick={() => setSelectedId(check.id)} />) : <div className="no-issues"><CheckCircle2 />指摘のある項目はありません</div>}</div><CheckDetail check={selected} findings={findings} sheetPreviews={result.sheet_previews ?? []} /></div>
    </section>
    <details className="json-panel"><summary><Braces />検査結果のJSONを表示</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function CheckRow({ check, active, onClick }: { check: CheckItem; active: boolean; onClick: () => void }) {
  const [number, ...title] = check.label.split(" ");
  const Icon = check.status === "passed" ? CheckCircle2 : check.status === "issues_found" ? XCircle : check.status === "unchecked" ? CircleHelp : Info;
  return <button className={`check-row ${check.status} ${active ? "active" : ""}`} onClick={onClick}><Icon /><span><small>{number}</small><strong>{title.join(" ")}</strong></span><em>{statusText[check.status]}{check.finding_count ? ` ${check.finding_count}` : ""}</em><ChevronRight /></button>;
}

function CheckDetail({ check, findings, sheetPreviews }: { check?: CheckItem; findings: Finding[]; sheetPreviews: ExcelSheetPreview[] }) {
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0);
  useEffect(() => { setSelectedFindingIndex(0); }, [check?.id]);
  if (!check) return <aside className="check-detail"><CircleHelp /><h3>表示する項目がありません</h3></aside>;
  const findingIds = new Map(findings.map((finding, index) => [finding, `F-${String(index + 1).padStart(3, "0")}`]));
  const previewFindings = findings.filter(finding => finding.preview);
  const selectedFinding = previewFindings[selectedFindingIndex] ?? previewFindings[0];
  const findingGroups = Array.from(findings.reduce((groups, finding) => {
    const key = `${finding.severity}\u0000${finding.message}`;
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
    return groups;
  }, new Map<string, Finding[]>()).values());
  return <aside className={`check-detail ${check.status}`}><div className="detail-heading"><span>{check.id.replace("estat-", "チェック項目 ")}</span><b>{statusText[check.status]}</b></div><h3>{check.label.split(" ").slice(1).join(" ")}</h3>
    {findings.length ? <div className={`finding-detail-layout ${selectedFinding ? "has-preview" : ""}`}><div className="finding-list">{findingGroups.map((group, groupIndex) => {
      const representative = group[0];
      const selected = group.includes(selectedFinding);
      return <article className={selected ? "selected" : ""} key={`${representative.message}-${groupIndex}`}><header><span className={representative.severity}><AlertTriangle />{representative.severity === "error" ? "要修正" : "要確認"}</span>{group.length > 1 ? <small>{group.length}箇所</small> : null}</header><p>{representative.message}</p><div className="finding-locations">{group.map((finding, index) => {
        const previewIndex = previewFindings.indexOf(finding);
        const selectable = previewIndex >= 0;
        const location = [finding.sheet ? `シート: ${finding.sheet}` : null, finding.row ? `${finding.row}行${finding.column ? ` ${finding.column}列` : ""}` : null].filter(Boolean).join(" / ") || "位置情報なし";
        const findingId = findingIds.get(finding);
        return selectable ? <button type="button" className={selectedFinding === finding ? "active" : ""} key={`${finding.code}-${index}`} onClick={() => setSelectedFindingIndex(previewIndex)}><b>{findingId}</b>{location}</button> : <span key={`${finding.code}-${index}`}><b>{findingId}</b>{location}</span>;
      })}</div></article>;
    })}</div>{selectedFinding?.preview ? <ExcelPreviewTable preview={selectedFinding.preview} fullPreview={sheetPreviews.find(item => item.sheet === selectedFinding.sheet)} annotations={findings.filter(finding => finding.sheet === selectedFinding.sheet && finding.row != null).map(finding => ({ finding, id: findingIds.get(finding)! }))} /> : null}</div>
      : <div className="detail-empty"><CheckCircle2 /><p>{check.status === "passed" ? "この項目に指摘はありません。" : check.status === "unchecked" ? "この項目はチェックできませんでした。" : "このファイル形式では対象外です。"}</p></div>}
  </aside>;
}

function ExcelPreviewTable({ preview, fullPreview, annotations }: { preview: ExcelPreview; fullPreview?: ExcelSheetPreview; annotations: { finding: Finding; id: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = fullPreview?.columns ?? preview.columns;
  const rows = fullPreview?.rows ?? preview.rows;
  const startRow = fullPreview ? 1 : preview.start_row;
  const startColumn = fullPreview ? 1 : preview.start_column;
  const mergeAnchors = new Map<string, NonNullable<ExcelSheetPreview["merged_ranges"]>[number]>();
  const mergedCoveredCells = new Set<string>();
  for (const range of fullPreview?.merged_ranges ?? []) {
    mergeAnchors.set(`${range.start_row}:${range.start_column}`, range);
    for (let row = range.start_row; row <= range.end_row; row += 1) {
      for (let column = range.start_column; column <= range.end_column; column += 1) {
        if (row !== range.start_row || column !== range.start_column) mergedCoveredCells.add(`${row}:${column}`);
      }
    }
  }
  const columnWidths = columns.map((column, columnIndex) => {
    const values = [column, ...rows.map(row => row[columnIndex] ?? "")];
    const longestLine = Math.max(...values.flatMap(value => String(value).split(/\r?\n/)).map(line =>
      Array.from(line).reduce((length, character) => length + (/^[\x00-\x7F]$/.test(character) ? 1 : 2), 0)
    ), 1);
    return Math.min(320, Math.max(72, longestLine * 7 + 22));
  });
  const tableWidth = 34 + columnWidths.reduce((total, width) => total + width, 0);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = requestAnimationFrame(() => {
      const column = preview.focus_column ?? 1;
      const target = container.querySelector<HTMLElement>(`[data-row="${preview.focus_row}"][data-column="${column}"]`);
      if (!target) return;
      const stickyHeaderHeight = 28;
      const stickyRowWidth = 34;
      const padding = 16;
      const availableHeight = container.clientHeight - stickyHeaderHeight;
      const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetLeftInContent = container.scrollLeft + targetRect.left - containerRect.left;
      const targetTopInContent = container.scrollTop + targetRect.top - containerRect.top;
      const desiredLeft = targetLeftInContent - stickyRowWidth - padding;
      const desiredTop = targetTopInContent - stickyHeaderHeight - (availableHeight - targetRect.height) / 2;
      container.scrollTo({
        top: Math.min(maxTop, Math.max(0, desiredTop)),
        left: Math.min(maxLeft, Math.max(0, desiredLeft)),
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [preview.focus_row, preview.focus_column, fullPreview?.sheet]);
  return <div className="excel-preview full"><div className="excel-preview-label"><span><FileSpreadsheet />Excel全体プレビュー</span><small>{rows.length}行 × {columns.length}列</small></div><div className="excel-preview-scroll" ref={scrollRef}><table style={{ width: tableWidth }}><colgroup><col style={{ width: 34 }} />{columnWidths.map((width, index) => <col style={{ width }} key={columns[index]} />)}</colgroup><thead><tr><th /><>{columns.map(column => <th key={column}>{column}</th>)}</></tr></thead><tbody>{rows.map((row, rowOffset) => {
    const rowNumber = startRow + rowOffset;
    return <tr key={rowNumber}><th>{rowNumber}</th>{row.map((value, columnOffset) => {
      const columnNumber = startColumn + columnOffset;
      const cellKey = `${rowNumber}:${columnNumber}`;
      if (mergedCoveredCells.has(cellKey)) return null;
      const mergedRange = mergeAnchors.get(cellKey);
      const containsFocus = mergedRange
        ? preview.focus_row >= mergedRange.start_row && preview.focus_row <= mergedRange.end_row && (preview.focus_column == null || (preview.focus_column >= mergedRange.start_column && preview.focus_column <= mergedRange.end_column))
        : rowNumber === preview.focus_row && (preview.focus_column == null || columnNumber === preview.focus_column);
      const cellAnnotations = annotations.filter(({ finding }) => mergedRange
        ? finding.row != null && finding.row >= mergedRange.start_row && finding.row <= mergedRange.end_row && (finding.column == null || (finding.column >= mergedRange.start_column && finding.column <= mergedRange.end_column))
        : finding.row === rowNumber && (finding.column == null ? columnNumber === 1 : finding.column === columnNumber));
      return <td className={`${containsFocus ? "focused" : ""} ${cellAnnotations.length ? "annotated" : ""} ${mergedRange ? "merged" : ""}`} key={columnNumber} data-row={rowNumber} data-column={columnNumber} rowSpan={mergedRange ? mergedRange.end_row - mergedRange.start_row + 1 : undefined} colSpan={mergedRange ? mergedRange.end_column - mergedRange.start_column + 1 : undefined} title={value}><span>{value}</span>{cellAnnotations.length ? <span className="cell-finding-ids">{cellAnnotations.map(({ id }) => <b key={id}>{id}</b>)}</span> : null}</td>;
    })}</tr>;
  })}</tbody></table></div></div>;
}

function CheckResultList({ records, activeResult, onOpen, onDelete, onOpenCheck }: { records: HistoryRecord[]; activeResult: CheckResult | null; onOpen: (r: HistoryRecord) => void; onDelete: (r: HistoryRecord) => void; onOpenCheck: () => void }) {
  return <aside className="panel review-history">
    <div className="review-history-heading"><div><FileCheck2 /><strong>チェック結果一覧</strong></div><span>{records.length}件</span></div>
    <button className="result-list-check-button" onClick={onOpenCheck}><UploadCloud />新しいチェック</button>
    {records.length ? <div className="review-history-list">{records.map(record => {
      const summary = summarizeChecks(getApplicableChecks(record.result));
      const active = record.result === activeResult || Boolean(
        activeResult && record.result.path === activeResult.path && record.result.filename === activeResult.filename
      );
      const isExcel = isExcelResult(record.result);
      const fromEstat = Boolean(record.sourceUrl);
      const TypeIcon = isExcel ? FileSpreadsheet : FileText;
      return <div className={`review-history-item ${active ? "active" : ""}`} key={record.id}>
        <button className="review-history-open" onClick={() => onOpen(record)}>
          <span className={`result-type-icon ${isExcel ? "excel" : "csv"}`} aria-label={isExcel ? "Excel" : "CSV"} title={isExcel ? "Excel" : "CSV"}><TypeIcon /></span>
          <span><span className="result-title-line"><strong>{record.filename}</strong>{active ? <span className="selected-result-badge"><CheckCircle2 />選択中</span> : null}</span><small><span className="result-checked-at">チェック日時: {new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(record.checkedAt))}</span><span className={`result-source-badge ${fromEstat ? "estat" : "upload"}`}>{fromEstat ? "e-Stat取得" : "ファイルアップロード"}</span></small></span>
          <span className="result-list-summary">
            <span className="passed">問題なし <b>{summary.passed}</b></span>
            <span className="issues">指摘あり <b>{summary.issues_found}</b></span>
            <span className="unchecked">チェック不可 <b>{summary.unchecked}</b></span>
          </span>
        </button>
        <button className="icon-button danger" aria-label={`${record.filename}を削除`} onClick={() => onDelete(record)}><Trash2 /></button>
      </div>;
    })}</div> : <div className="empty-history"><Clock3 /><h2>チェック結果はまだありません</h2><p>「新しいチェック」を実行すると、ここに表示されます。</p></div>}
  </aside>;
}

export default App;
