const form = document.querySelector("#check-form");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const summary = document.querySelector("#summary");
const findings = document.querySelector("#findings");
const checks = document.querySelector("#checks");

const statusLabels = {
  passed: "問題なし",
  issues_found: "指摘あり",
  not_applicable: "対象外"
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "検査しています…";
  result.hidden = true;
  try {
    const response = await fetch("/api/check", { method: "POST", body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "検査に失敗しました。");
    status.textContent = "完了しました。";
    summary.textContent = `${data.filename}: ${data.valid ? "エラーなし" : "要確認"}（問題なし ${data.summary.passed}、指摘あり ${data.summary.issues_found}、対象外 ${data.summary.not_applicable}）`;
    checks.replaceChildren(...data.checks.map((check) => {
      const item = document.createElement("li");
      item.className = `check check-${check.status}`;
      const detail = check.status === "issues_found" ? `: ${check.finding_count}件` : "";
      item.textContent = `${check.label} — ${statusLabels[check.status]}${detail}`;
      return item;
    }));
    findings.replaceChildren(...data.findings.map((finding) => {
      const row = document.createElement("tr");
      const cells = [
        finding.severity,
        finding.row ? `${finding.row} 行 ${finding.column || ""} 列` : "",
        finding.value ?? "",
        finding.message
      ];
      for (const value of cells) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }));
    if (!data.findings.length) findings.innerHTML = "<tr><td colspan=\"4\">指摘はありません。</td></tr>";
    result.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
});
