import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle, Braces, CheckCircle2, ChevronRight, CircleHelp, Clock3, FileCheck2,
  FileSpreadsheet, FileText, Info, LoaderCircle, Trash2, UploadCloud, X, XCircle
} from "lucide-react";
import { checkFile, checkUrl } from "@/lib/api";
import { historyStore } from "@/lib/history-store";
import type { CheckItem, CheckResult, ExcelPreview, Finding, HistoryRecord } from "@/types";

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
      <div className="checks-grid"><div className="check-list">{visible.length ? visible.map(check => <CheckRow key={check.id} check={check} active={selected?.id === check.id} onClick={() => setSelectedId(check.id)} />) : <div className="no-issues"><CheckCircle2 />指摘のある項目はありません</div>}</div><CheckDetail check={selected} findings={findings} /></div>
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

function CheckDetail({ check, findings }: { check?: CheckItem; findings: Finding[] }) {
  if (!check) return <aside className="check-detail"><CircleHelp /><h3>表示する項目がありません</h3></aside>;
  return <aside className={`check-detail ${check.status}`}><div className="detail-heading"><span>{check.id.replace("estat-", "チェック項目 ")}</span><b>{statusText[check.status]}</b></div><h3>{check.label.split(" ").slice(1).join(" ")}</h3>
    {findings.length ? <div className="finding-list">{findings.map((finding, index) => <article key={`${finding.code}-${index}`}><header><span className={finding.severity}><AlertTriangle />{finding.severity === "error" ? "要修正" : "要確認"}</span>{finding.sheet ? <small>シート: {finding.sheet}</small> : null}</header><p>{finding.message}</p>{finding.row ? <small>{finding.row}行{finding.column ? ` ${finding.column}列` : ""}</small> : null}{finding.preview ? <ExcelPreviewTable preview={finding.preview} /> : null}</article>)}</div>
      : <div className="detail-empty"><CheckCircle2 /><p>{check.status === "passed" ? "この項目に指摘はありません。" : check.status === "unchecked" ? "この項目はチェックできませんでした。" : "このファイル形式では対象外です。"}</p></div>}
  </aside>;
}

function ExcelPreviewTable({ preview }: { preview: ExcelPreview }) {
  return <div className="excel-preview"><div className="excel-preview-label"><FileSpreadsheet />Excelプレビュー</div><div className="excel-preview-scroll"><table><thead><tr><th /><>{preview.columns.map(column => <th key={column}>{column}</th>)}</></tr></thead><tbody>{preview.rows.map((row, rowOffset) => {
    const rowNumber = preview.start_row + rowOffset;
    return <tr key={rowNumber}><th>{rowNumber}</th>{row.map((value, columnOffset) => {
      const columnNumber = preview.start_column + columnOffset;
      const focused = rowNumber === preview.focus_row && (preview.focus_column == null || columnNumber === preview.focus_column);
      return <td className={focused ? "focused" : ""} key={columnNumber} title={value}>{value}</td>;
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
