import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Braces, CheckCircle2, ChevronRight, CircleHelp, Clock3, Copy, Download, FileCheck2,
  ExternalLink, FileSpreadsheet, FileText, Info, LoaderCircle, Trash2, UploadCloud, X, XCircle
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
  const [aboutOpen, setAboutOpen] = useState(false);
  return <><header className="topbar">
    <div className="header-brand"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="machine readability checker" /><span>統計表の品質を、すばやく確かめる</span><button type="button" className="header-about-button" onClick={() => setAboutOpen(true)}><Info />このアプリについて</button></div>
    <div className="header-actions"><a className="header-api-link" href="/docs" target="_blank" rel="noreferrer"><Braces />API仕様</a><span className="service-status"><i />サービス稼働中</span></div>
  </header>{aboutOpen ? <AboutDialog onClose={() => setAboutOpen(false)} /> : null}</>;
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="about-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
      <header><div><Info /><h2 id="about-dialog-title">このアプリケーションについて</h2></div><button type="button" aria-label="閉じる" onClick={onClose}><X /></button></header>
      <div className="about-dialog-content"><p>機械判読可能性チェッカーは、CSV・TSV・Excel形式の統計表が、機械で処理しやすい構成になっているかを確認するためのツールです。</p><p>ファイル形式、項目名、セル結合、数値表現、データの分断などを検査し、修正や確認が必要な箇所を表形式のプレビューとともに表示します。</p><div className="about-dialog-reference"><strong>チェック項目の参考資料</strong><p>チェック内容の詳細は、e-Statの資料をご確認ください。</p><a href="https://www.e-stat.go.jp/estat/html/machine-readable-stats-format.pdf" target="_blank" rel="noreferrer"><ExternalLink />機械判読可能な統計データの表記方法（PDF）</a></div><small>チェック結果は判定を支援するものであり、データの品質や正確性を保証するものではありません。</small></div>
    </section>
  </div>;
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
  if (result) return <ResultReview key={`${result.path}-${result.filename}`} result={result} records={records} onOpen={onOpen} onDelete={onDelete} onOpenCheck={onOpenCheck} />;
  return <div className="page-stack">
    <div className="review-layout">
      <CheckResultList records={records} activeResult={result} onOpen={onOpen} onDelete={onDelete} onOpenCheck={onOpenCheck} />
      <EmptyResult />
    </div>
  </div>;
}

function ResultReview({ result, records, onOpen, onDelete, onOpenCheck }: { result: CheckResult; records: HistoryRecord[]; onOpen: (r: HistoryRecord) => void; onDelete: (r: HistoryRecord) => void; onOpenCheck: () => void }) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const applicableChecks = getApplicableChecks(result);
  const visibleChecks = onlyIssues ? applicableChecks.filter(check => check.status === "issues_found") : applicableChecks;
  const [selectedId, setSelectedId] = useState(applicableChecks.find(check => check.status === "issues_found")?.id ?? applicableChecks[0]?.id);
  const selected = applicableChecks.find(check => check.id === selectedId);
  const findings = selected ? result.findings.filter(finding => selected.finding_codes.includes(finding.code)) : [];
  const openCheckDetail = (id: string) => { setSelectedId(id); setDrawerOpen(true); };
  return <div className="page-stack">
    <div className="review-layout">
      <CheckResultList records={records} activeResult={result} onOpen={onOpen} onDelete={onDelete} onOpenCheck={onOpenCheck} />
      <ResultDashboard result={result} applicableChecks={applicableChecks} visibleChecks={visibleChecks} selected={drawerOpen ? selected : undefined} onlyIssues={onlyIssues} onOnlyIssuesChange={setOnlyIssues} onCheckSelect={openCheckDetail} />
    </div>
    {drawerOpen && selected ? <CheckDetailDrawer result={result} check={selected} findings={findings} onClose={() => setDrawerOpen(false)} /> : null}
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

function ResultDashboard({ result, applicableChecks, visibleChecks, selected, onlyIssues, onOnlyIssuesChange, onCheckSelect }: { result: CheckResult; applicableChecks: CheckItem[]; visibleChecks: CheckItem[]; selected?: CheckItem; onlyIssues: boolean; onOnlyIssuesChange: (value: boolean) => void; onCheckSelect: (id: string) => void }) {
  const summary = summarizeChecks(applicableChecks);
  return <div className="result-stack">
    <section className="panel results-panel"><ResultContextHeader result={result} summary={summary} checkCount={applicableChecks.length} />
      <div className="results-toolbar"><div><h2>チェック項目</h2><p>項目を選択すると指摘内容を表示します</p></div><label className="filter-check"><input type="checkbox" checked={onlyIssues} onChange={event => onOnlyIssuesChange(event.target.checked)} />指摘ありのみ表示</label></div>
      <div className="detail-check-list">{visibleChecks.length ? visibleChecks.map(check => <CheckRow key={check.id} check={check} active={selected?.id === check.id} onClick={() => onCheckSelect(check.id)} />) : <div className="no-issues"><CheckCircle2 />指摘のある項目はありません</div>}</div>
    </section>
  </div>;
}

function CheckDetailDrawer({ result, check, findings, onClose }: { result: CheckResult; check: CheckItem; findings: Finding[]; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="detail-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-drawer-title">
      <div className="detail-drawer-heading"><div><span>CHECK DETAIL</span><h2 id="detail-drawer-title">指摘一覧</h2></div><button type="button" aria-label="閉じる" onClick={onClose}><X /></button></div>
      <div className="detail-drawer-body"><CheckDetail check={check} findings={findings} sheetPreviews={result.sheet_previews ?? []} previewFormat={isExcelResult(result) ? "excel" : "csv"} /></div>
    </aside>
  </div>;
}

function ResultContextHeader({ result, summary, checkCount }: { result: CheckResult; summary: CheckResult["summary"]; checkCount: number }) {
  const isExcel = isExcelResult(result);
  const TypeIcon = isExcel ? FileSpreadsheet : FileText;
  const [fileInformationOpen, setFileInformationOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const fileInformationRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!fileInformationOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!fileInformationRef.current?.contains(target)) setFileInformationOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFileInformationOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [fileInformationOpen]);
  return <header className="result-context-header">
    <div className="result-context-main">
      <span className={`result-context-icon ${isExcel ? "excel" : "csv"}`}><TypeIcon /></span>
      <div className="result-context-title"><strong title={result.filename}>{result.filename}</strong></div>
    </div>
    <div className="result-context-summary" aria-label="チェック結果の集計">
      <span className="result-context-check-count">{checkCount}項目の検査結果</span>
      <Metric label="問題なし" value={summary.passed} tone="green" />
      <Metric label="指摘あり" value={summary.issues_found} tone="red" />
      <Metric label="チェック不可" value={summary.unchecked} tone="amber" />
    </div>
    <div className="result-context-actions">
      <button type="button" className="json-dialog-trigger" onClick={() => { setJsonOpen(true); setFileInformationOpen(false); }}><Braces />JSON</button>
      <details ref={fileInformationRef} className="file-information" open={fileInformationOpen} onToggle={event => { const open = event.currentTarget.open; setFileInformationOpen(open); if (open) setJsonOpen(false); }}><summary><Info />ファイル情報</summary><div><dl><dt>ファイル名</dt><dd>{result.filename}</dd><dt>取得方法</dt><dd>{result.source_url ? "e-Stat取得" : "ファイルアップロード"}</dd>{result.source_url ? <><dt>取得元URL</dt><dd><a href={result.source_url} target="_blank" rel="noreferrer">{result.source_url}</a></dd></> : null}{result.encoding ? <><dt>文字コード</dt><dd>{result.encoding}</dd></> : null}</dl></div></details>
    </div>
    {jsonOpen ? <JsonDialog result={result} onClose={() => setJsonOpen(false)} /> : null}
  </header>;
}

function JsonDialog({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result, null, 2);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const copyJson = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.filename.replace(/\.[^.]+$/, "")}-check-result.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="json-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="json-dialog" role="dialog" aria-modal="true" aria-labelledby="json-dialog-title">
      <header><div className="json-dialog-title"><Braces /><h2 id="json-dialog-title">検査結果のJSON</h2></div><div className="json-dialog-actions"><button type="button" onClick={copyJson}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? "コピー済み" : "全体をコピー"}</button><button type="button" onClick={downloadJson}><Download />ダウンロード</button><button type="button" className="json-dialog-close" aria-label="閉じる" onClick={onClose}><X /></button></div></header>
      <pre>{json}</pre>
    </section>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <span className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></span>; }
function CheckRow({ check, active, onClick }: { check: CheckItem; active: boolean; onClick: () => void }) {
  const [number, ...title] = check.label.split(" ");
  const Icon = check.status === "passed" ? CheckCircle2 : check.status === "issues_found" ? XCircle : check.status === "unchecked" ? CircleHelp : Info;
  return <button className={`check-row ${check.status} ${active ? "active" : ""}`} onClick={onClick}><Icon /><span><small>{number}</small><strong>{title.join(" ")}</strong></span><em>{statusText[check.status]}{check.finding_count ? ` ${check.finding_count}` : ""}</em><ChevronRight /></button>;
}

function CheckDetail({ check, findings, sheetPreviews, previewFormat }: { check?: CheckItem; findings: Finding[]; sheetPreviews: ExcelSheetPreview[]; previewFormat: "excel" | "csv" }) {
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
      return <article className={`${representative.severity} ${selected ? "selected" : ""}`} key={`${representative.message}-${groupIndex}`}><header><span className={representative.severity}><AlertTriangle />{representative.severity === "error" ? "要修正" : "要確認"}</span>{group.length > 1 ? <small>{group.length}箇所</small> : null}</header><p>{representative.message}</p><div className="finding-locations">{group.map((finding, index) => {
        const previewIndex = previewFindings.indexOf(finding);
        const selectable = previewIndex >= 0;
        const location = [finding.sheet ? `シート: ${finding.sheet}` : null, finding.row ? `${finding.row}行${finding.column ? ` ${finding.column}列` : ""}` : null].filter(Boolean).join(" / ") || "位置情報なし";
        const findingId = findingIds.get(finding);
        return selectable ? <button type="button" className={selectedFinding === finding ? "active" : ""} key={`${finding.code}-${index}`} onClick={() => setSelectedFindingIndex(previewIndex)}><b>{findingId}</b>{location}</button> : <span key={`${finding.code}-${index}`}><b>{findingId}</b>{location}</span>;
      })}</div></article>;
    })}</div>{selectedFinding?.preview ? <ExcelPreviewTable preview={selectedFinding.preview} fullPreview={sheetPreviews.find(item => item.sheet === (selectedFinding.sheet ?? ""))} annotations={findings.filter(finding => finding.sheet === selectedFinding.sheet && finding.row != null).map(finding => ({ finding, id: findingIds.get(finding)! }))} format={previewFormat} focusSeverity={selectedFinding.severity} /> : null}</div>
      : <div className="detail-empty"><CheckCircle2 /><p>{check.status === "passed" ? "この項目に指摘はありません。" : check.status === "unchecked" ? "この項目はチェックできませんでした。" : "このファイル形式では対象外です。"}</p></div>}
  </aside>;
}

function ExcelPreviewTable({ preview, fullPreview, annotations, format, focusSeverity }: { preview: ExcelPreview; fullPreview?: ExcelSheetPreview; annotations: { finding: Finding; id: string }[]; format: "excel" | "csv"; focusSeverity: Finding["severity"] }) {
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
  const PreviewIcon = format === "excel" ? FileSpreadsheet : FileText;
  return <div className="excel-preview full"><div className="excel-preview-label"><span><PreviewIcon />{format === "excel" ? "Excel" : "CSV"}全体プレビュー</span><small>{rows.length}行 × {columns.length}列</small></div><div className="excel-preview-scroll" ref={scrollRef}><table style={{ width: tableWidth }}><colgroup><col style={{ width: 34 }} />{columnWidths.map((width, index) => <col style={{ width }} key={columns[index]} />)}</colgroup><thead><tr><th /><>{columns.map(column => <th key={column}>{column}</th>)}</></tr></thead><tbody>{rows.map((row, rowOffset) => {
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
      const annotationSeverity = cellAnnotations.some(({ finding }) => finding.severity === "error") ? "error" : "warning";
      return <td className={`${containsFocus ? `focused ${focusSeverity}` : ""} ${cellAnnotations.length ? `annotated ${annotationSeverity}` : ""} ${mergedRange ? "merged" : ""}`} key={columnNumber} data-row={rowNumber} data-column={columnNumber} rowSpan={mergedRange ? mergedRange.end_row - mergedRange.start_row + 1 : undefined} colSpan={mergedRange ? mergedRange.end_column - mergedRange.start_column + 1 : undefined} title={value}><span>{value}</span>{cellAnnotations.length ? <span className="cell-finding-ids">{cellAnnotations.map(({ finding, id }) => <b className={finding.severity} key={id}>{id}</b>)}</span> : null}</td>;
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
