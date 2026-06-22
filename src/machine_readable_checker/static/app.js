const form = document.querySelector("#check-form");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const summary = document.querySelector("#summary");
const findings = document.querySelector("#findings");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "検査しています…";
  result.hidden = true;
  try {
    const response = await fetch("/api/check", { method: "POST", body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "検査に失敗しました。");
    status.textContent = "完了しました。";
    summary.textContent = `${data.filename}: ${data.valid ? "エラーなし" : "要確認"}`;
    findings.replaceChildren(...data.findings.map((finding) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${finding.severity}</td><td>${finding.row ? `${finding.row} 行 ${finding.column || ""} 列` : ""}</td><td>${finding.message}</td>`;
      return row;
    }));
    if (!data.findings.length) findings.innerHTML = "<tr><td colspan=\"3\">指摘はありません。</td></tr>";
    result.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
});
