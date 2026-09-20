import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Braces, CheckCircle2, ChevronRight, CircleHelp, Clock3,
  FileCheck2, FileSpreadsheet, History, Info, LoaderCircle, Menu, ShieldCheck,
  Trash2, UploadCloud, XCircle
} from "lucide-react";
import { checkFile, checkUrl } from "@/lib/api";
import { historyStore } from "@/lib/history-store";
import type { CheckItem, CheckResult, Finding, HistoryRecord } from "@/types";

type View = "check" | "results";
type Source = "file" | "url";

const statusText = { passed: "問題なし", issues_found: "指摘あり", unchecked: "チェック不可", not_applicable: "対象外" };

function App() {
  const [view, setView] = useState<View>("check");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refreshHistory = async () => setHistory(await historyStore.list());
  useEffect(() => { refreshHistory().catch(() => setNotice("履歴を読み込めませんでした。")); }, []);

  const runCheck = async (source: Source, file: File | null, url: string) => {
    setBusy(true); setNotice("");
    try {
      const next = source === "file" ? await checkFile(file!) : await checkUrl(url);
      setResult(next);
      await historyStore.save(next);
      await refreshHistory();
      setNotice("チェックが完了し、履歴に保存しました。");
      setView("results");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "検査に失敗しました。");
    } finally { setBusy(false); }
  };

  const openHistory = (record: HistoryRecord) => { setResult(record.result); setView("results"); setNotice("保存済みの結果を表示しています。"); };
  const removeHistory = async (record: HistoryRecord) => {
    if (!confirm(`「${record.filename}」の履歴を削除しますか？`)) return;
    await historyStore.delete(record.id); await refreshHistory();
  };

  return <div className="app-shell">
    <Sidebar view={view} setView={setView} historyCount={history.length} />
    <div className="main-column">
      <Header />
      <main className="page-container">
        {view === "check"
          ? <CheckPage busy={busy} notice={notice} records={history} onCheck={runCheck} onOpen={openHistory} onDelete={removeHistory} />
          : <ResultsPage result={result} />}
      </main>
    </div>
  </div>;
}

function Sidebar({ view, setView, historyCount }: { view: View; setView: (v: View) => void; historyCount: number }) {
  return <aside className="sidebar">
    <div className="brand"><img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="machine readability checker" /></div>
    <p className="nav-caption">ワークスペース</p>
    <nav>
      <button className={view === "check" ? "active" : ""} onClick={() => setView("check")}><UploadCloud /><span>チェック実行<small>新規チェック・履歴</small></span><b>{historyCount}</b></button>
      <button className={view === "results" ? "active" : ""} onClick={() => setView("results")}><FileCheck2 /><span>内容確認<small>検査結果を確認</small></span><ChevronRight /></button>
    </nav>
    <div className="sidebar-note"><ShieldCheck /><div><strong>ブラウザ内に保存</strong><p>元ファイルは保存されません</p></div></div>
    <a className="api-link" href="/docs" target="_blank" rel="noreferrer"><Braces />API仕様</a>
  </aside>;
}

function Header() {
  return <header className="topbar"><div><button className="mobile-menu" aria-label="メニュー"><Menu /></button><div><strong>機械判読可能性チェッカー</strong><span>統計表の品質を、すばやく確かめる</span></div></div><span className="service-status"><i />サービス稼働中</span></header>;
}

function CheckPage({ busy, notice, records, onCheck, onOpen, onDelete }: { busy: boolean; notice: string; records: HistoryRecord[]; onCheck: (s: Source, f: File | null, u: string) => void; onOpen: (r: HistoryRecord) => void; onDelete: (r: HistoryRecord) => void }) {
  return <div className="page-stack">
    <PageHeading eyebrow="CHECK WORKSPACE" title="チェック実行" description="CSV、TSV、Excelファイルまたはe-Stat URLを指定して検査します。" />
    <CheckForm busy={busy} notice={notice} onSubmit={onCheck} />
    <HistorySection records={records} onOpen={onOpen} onDelete={onDelete} />
  </div>;
}

function ResultsPage({ result }: { result: CheckResult | null }) {
  return <div className="page-stack">
    <PageHeading eyebrow="CHECK RESULT" title="内容確認" description="実行または履歴から選択したチェック結果を確認します。" />
    {result ? <ResultDashboard key={`${result.path}-${result.filename}`} result={result} /> : <EmptyResult />}
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

function EmptyResult() { return <section className="empty-card"><div><FileCheck2 /></div><h2>チェック結果がここに表示されます</h2><p>ファイルまたはURLを指定し「チェックする」を押してください。</p></section>; }

function getApplicableChecks(result: CheckResult) {
  const isExcel = /\.xlsx?$/i.test(result.filename) || /\.xlsx?$/i.test(result.path);
  return isExcel ? result.checks.filter(check => !check.id.startsWith("estat-4-")) : result.checks;
}

function summarizeChecks(checks: CheckItem[]): CheckResult["summary"] {
  return checks.reduce<CheckResult["summary"]>((summary, check) => {
    summary[check.status] += 1;
    return summary;
  }, { passed: 0, issues_found: 0, unchecked: 0, not_applicable: 0 });
}

function ResultDashboard({ result }: { result: CheckResult }) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const applicableChecks = getApplicableChecks(result);
  const summary = summarizeChecks(applicableChecks);
  const visible = onlyIssues ? applicableChecks.filter(c => c.status === "issues_found") : applicableChecks;
  const [selectedId, setSelectedId] = useState(applicableChecks.find(c => c.status === "issues_found")?.id ?? applicableChecks[0]?.id);
  const selected = visible.find(c => c.id === selectedId) ?? visible[0];
  const findings = selected ? result.findings.filter(f => selected.finding_codes.includes(f.code)) : [];
  return <div className="result-stack">
    <section className={`result-hero ${result.valid ? "valid" : "invalid"}`}><div className="result-file"><div><FileSpreadsheet /></div><span>{result.valid ? "チェック完了" : "確認が必要"}<strong>{result.filename}</strong><small>{result.source_url ? `取得元: ${result.source_url}` : "アップロードされたファイル"}</small></span></div><div className="metrics"><Metric label="問題なし" value={summary.passed} tone="green" /><Metric label="指摘あり" value={summary.issues_found} tone="red" /><Metric label="チェック不可" value={summary.unchecked} tone="amber" /><Metric label="対象外" value={summary.not_applicable} tone="slate" /></div></section>
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
    {findings.length ? <div className="finding-list">{findings.map((finding, index) => <article key={`${finding.code}-${index}`}><header><span className={finding.severity}><AlertTriangle />{finding.severity === "error" ? "要修正" : "要確認"}</span>{finding.sheet ? <small>シート: {finding.sheet}</small> : null}</header><p>{finding.message}</p>{finding.row ? <small>{finding.row}行{finding.column ? ` ${finding.column}列` : ""}</small> : null}</article>)}</div>
      : <div className="detail-empty"><CheckCircle2 /><p>{check.status === "passed" ? "この項目に指摘はありません。" : check.status === "unchecked" ? "この項目はチェックできませんでした。" : "このファイル形式では対象外です。"}</p></div>}
  </aside>;
}

function HistorySection({ records, onOpen, onDelete }: { records: HistoryRecord[]; onOpen: (r: HistoryRecord) => void; onDelete: (r: HistoryRecord) => void }) {
  return <section className="panel history-panel"><div className="history-summary"><div><History /><span><strong>{records.length}</strong>件の履歴</span></div><small>元ファイルは保存されません</small></div>
      {records.length ? <div className="history-table"><div className="history-head"><span>ファイル名</span><span>実行日時</span><span>結果</span><span /></div>{records.map(record => <div className="history-row" key={record.id}><button className="history-file" onClick={() => onOpen(record)}><FileSpreadsheet /><span><strong>{record.filename}</strong><small>{record.sourceUrl ? "e-Stat URL" : "ファイルアップロード"}</small></span></button><time>{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.checkedAt))}</time><HistoryResultSummary result={record.result} /><button className="icon-button danger" aria-label={`${record.filename}を削除`} onClick={() => onDelete(record)}><Trash2 /></button></div>)}</div>
        : <div className="empty-history"><Clock3 /><h2>履歴はまだありません</h2><p>チェックを実行すると、結果がここに保存されます。</p></div>}
    </section>;
}

function HistoryResultSummary({ result }: { result: CheckResult }) {
  const summary = summarizeChecks(getApplicableChecks(result));
  return <div className="history-result-summary">
    <span className="passed">問題なし <b>{summary.passed}</b></span>
    <span className="issues">指摘あり <b>{summary.issues_found}</b></span>
    <span className="unchecked">チェック不可 <b>{summary.unchecked}</b></span>
    <span className="not-applicable">対象外 <b>{summary.not_applicable}</b></span>
  </div>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="page-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>; }

export default App;
