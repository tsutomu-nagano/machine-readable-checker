const form = document.querySelector("#check-form");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const emptyResult = document.querySelector("#empty-result");
const summary = document.querySelector("#summary");
const checks = document.querySelector("#checks");
const checkDetail = document.querySelector("#check-detail");
const apiJson = document.querySelector("#api-json");
const apiJsonToggle = document.querySelector("#api-json-toggle");
const issuesOnlyToggle = document.querySelector("#issues-only-toggle");
const sourceInputs = document.querySelectorAll("input[name='source']");
const sourcePanels = document.querySelectorAll("[data-source-panel]");
const fileInput = document.querySelector("#file");
const urlInput = document.querySelector("#url");
let currentCheckItems = [];
let selectedCheckItemId = "";
let showOnlyIssues = false;

const statusLabels = {
  passed: "問題なし",
  issues_found: "指摘あり",
  not_applicable: "対象外"
};

const severityLabels = {
  error: "要修正",
  warning: "要確認"
};

const severityIcons = {
  error: "!",
  warning: "?"
};

const estatCheckItems = [
  {
    id: "estat-2-2",
    number: "チェック項目２－２",
    title: "数値データは数値属性とし、文字列を含まないこと",
    codes: ["decorated-number"],
    sourceCheckIds: ["numbers"]
  },
  {
    id: "estat-2-3",
    number: "チェック項目２－３",
    title: "セルの結合をしていないか",
    codes: ["merged-cells"],
    sourceCheckIds: ["xlsx-merged-cells"]
  },
  {
    id: "estat-2-4",
    number: "チェック項目２－４",
    title: "スペースや改行等で体裁を整えていないか",
    codes: ["layout-whitespace"],
    sourceCheckIds: ["layout"]
  },
  {
    id: "estat-2-5",
    number: "チェック項目２－５",
    title: "項目名等を省略していないか",
    codes: ["missing-header", "duplicate-header"],
    sourceCheckIds: ["headers"]
  },
  {
    id: "estat-2-6",
    number: "チェック項目２－６",
    title: "数式を使用している場合は、数値データに修正しているか",
    codes: ["formulas"],
    sourceCheckIds: ["xlsx-formulas"]
  },
  {
    id: "estat-2-7",
    number: "チェック項目２－７",
    title: "図形・画像等のオブジェクトを使用していないか",
    codes: ["xlsx-object"],
    sourceCheckIds: ["xlsx-objects"]
  },
  {
    id: "estat-2-9",
    number: "チェック項目２－９",
    title: "機種依存文字を使用していないか",
    codes: ["dependent-character"],
    sourceCheckIds: ["characters"]
  },
  {
    id: "estat-2-10",
    number: "チェック項目２－１０",
    title: "西暦表記又は和暦に西暦の併記がされているか",
    codes: ["era-only-date"],
    sourceCheckIds: ["dates"]
  },
  {
    id: "estat-4-5",
    number: "チェック項目４－５",
    title: "１行１データで表現されているか",
    codes: ["inconsistent-columns"],
    sourceCheckIds: ["table-structure"]
  },
  {
    id: "estat-4-13",
    number: "チェック項目４－１３",
    title: "データが分断されていないか",
    codes: ["leading-empty-rows", "split-table"],
    sourceCheckIds: ["table-structure"]
  },
  {
    id: "file-format",
    number: "その他",
    title: "ファイル形式・読み取り",
    codes: ["unsupported-format", "invalid-xlsx", "empty-workbook", "empty-table", "legacy-xls"],
    sourceCheckIds: ["file-format"]
  }
];

function selectedSource() {
  return document.querySelector("input[name='source']:checked").value;
}

function syncSourcePanels() {
  const source = selectedSource();
  sourcePanels.forEach((panel) => {
    panel.hidden = panel.dataset.sourcePanel !== source;
  });
  fileInput.disabled = source !== "file";
  urlInput.disabled = source !== "url";
  if (source === "file") {
    urlInput.value = "";
  } else {
    fileInput.value = "";
  }
}

sourceInputs.forEach((input) => input.addEventListener("change", syncSourcePanels));
syncSourcePanels();

apiJsonToggle.addEventListener("click", () => {
  const willShow = apiJson.hidden;
  apiJson.hidden = !willShow;
  apiJsonToggle.textContent = willShow ? "JSONを隠す" : "API JSON";
});

issuesOnlyToggle.addEventListener("click", () => {
  showOnlyIssues = !showOnlyIssues;
  issuesOnlyToggle.setAttribute("aria-pressed", String(showOnlyIssues));
  issuesOnlyToggle.classList.toggle("is-active", showOnlyIssues);
  renderVisibleCheckItems();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "検査しています…";
  result.hidden = true;
  emptyResult.hidden = false;
  try {
    const source = selectedSource();
    const formData = new FormData(form);
    const file = fileInput.files[0];
    const url = urlInput.value.trim();
    if (source === "file" && !file) {
      throw new Error("検査するファイルを指定してください。");
    }
    if (source === "url" && !url) {
      throw new Error("e-Stat の file-download URL を指定してください。");
    }
    const response = source === "url"
      ? await fetch("/api/check-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        })
      : await fetch("/api/check", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "検査に失敗しました。");
    status.textContent = "完了しました。";
    renderSummary(data);
    renderCheckItems(data.checks, data.findings);
    renderApiJson(data);
    emptyResult.hidden = true;
    result.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
});

function renderSummary(data) {
  summary.className = `summary-card ${data.valid ? "summary-valid" : "summary-invalid"}`;
  summary.replaceChildren(
    element("div", { className: "summary-main" }, [
      element("span", { className: "summary-badge" }, data.valid ? "エラーなし" : "要確認"),
      element("h2", {}, data.filename),
      element("p", {}, data.source_url ? `取得元: ${data.source_url}` : "アップロードされたファイルを検査しました。")
    ]),
    element("dl", { className: "summary-metrics" }, [
      metric("問題なし", data.summary.passed),
      metric("指摘あり", data.summary.issues_found),
      metric("対象外", data.summary.not_applicable)
    ])
  );
}

function renderCheckItems(sourceChecks, allFindings) {
  const sourceChecksById = new Map(sourceChecks.map((check) => [check.id, check]));
  currentCheckItems = estatCheckItems.map((item) => {
    const relatedFindings = allFindings.filter((finding) => item.codes.includes(finding.code));
    const sourceStatuses = item.sourceCheckIds
      .map((id) => sourceChecksById.get(id)?.status)
      .filter(Boolean);
    const status = relatedFindings.length
      ? "issues_found"
      : sourceStatuses.length && sourceStatuses.every((sourceStatus) => sourceStatus === "not_applicable")
        ? "not_applicable"
        : "passed";
    const detail = status === "issues_found" ? `指摘あり ${relatedFindings.length}件` : statusLabels[status];
    return { ...item, relatedFindings, status, detail };
  });
  selectedCheckItemId = currentCheckItems.find((item) => item.status === "issues_found")?.id ?? currentCheckItems[0]?.id ?? "";
  renderVisibleCheckItems();
}

function renderVisibleCheckItems() {
  const visibleCheckItems = showOnlyIssues
    ? currentCheckItems.filter((item) => item.status === "issues_found")
    : currentCheckItems;
  const selectedItem = visibleCheckItems.find((item) => item.id === selectedCheckItemId) ?? visibleCheckItems[0];

  if (!visibleCheckItems.length) {
    checks.replaceChildren(
      element("div", { className: "empty-state" }, [
        element("strong", {}, "問題ありのチェック項目はありません。"),
        element("p", {}, "表示対象をすべてに戻すと、問題なしや対象外の項目を確認できます。")
      ])
    );
    renderEmptyCheckDetail();
    return;
  }

  selectedCheckItemId = selectedItem.id;

  checks.replaceChildren(...visibleCheckItems.map((item) => {
    const card = element("article", {
      className: `check-card check-${item.status}${item.id === selectedItem.id ? " selected" : ""}`,
      role: "button",
      tabIndex: "0",
      ariaPressed: item.id === selectedItem.id ? "true" : "false"
    }, [
      element("div", { className: "check-card-header" }, [
        element("div", {}, [
          element("span", { className: "check-number" }, item.number),
          element("h3", {}, item.title),
          element("p", {}, item.codes.join(", "))
        ]),
        element("span", { className: "status-pill" }, item.detail)
      ])
    ]);
    card.addEventListener("click", () => selectCheckItem(card, item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCheckItem(card, item);
      }
    });
    return card;
  }));
  renderCheckDetail(selectedItem);
}

function renderApiJson(data) {
  apiJson.textContent = JSON.stringify(data, null, 2);
  apiJson.hidden = true;
  apiJsonToggle.textContent = "API JSON";
}

function renderCheckItemSituation(status, relatedFindings) {
  if (status === "passed") {
    return element("p", { className: "check-situation check-situation-ok" }, "この検査項目では指摘はありません。");
  }
  if (status === "not_applicable") {
    return element("p", { className: "check-situation" }, "このファイル形式では対象外です。");
  }
  const errorCount = relatedFindings.filter((finding) => finding.severity === "error").length;
  const warningCount = relatedFindings.filter((finding) => finding.severity === "warning").length;
  const messages = Array.from(new Set(relatedFindings.map((finding) => finding.message)));
  return element("div", { className: "check-situation" }, [
    element("div", { className: "check-counts" }, [
      severityBadge("error", `要修正 ${errorCount}`),
      severityBadge("warning", `要確認 ${warningCount}`)
    ]),
    element("ul", { className: "check-issue-list" }, messages.map((message) => element("li", {}, message)))
  ]);
}

function selectCheckItem(card, item) {
  selectedCheckItemId = item.id;
  checks.querySelectorAll(".check-card").forEach((checkCard) => {
    checkCard.classList.remove("selected");
    checkCard.setAttribute("aria-pressed", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-pressed", "true");
  renderCheckDetail(item);
}

function renderEmptyCheckDetail() {
  checkDetail.className = "check-detail";
  checkDetail.replaceChildren(
    element("div", { className: "empty-state" }, [
      element("strong", {}, "表示できるチェック項目がありません。"),
      element("p", {}, "指摘ありのみ表示が有効で、指摘が見つかっていない状態です。")
    ])
  );
}

function renderCheckDetail(item) {
  const errorCount = item.relatedFindings.filter((finding) => finding.severity === "error").length;
  const warningCount = item.relatedFindings.filter((finding) => finding.severity === "warning").length;
  checkDetail.className = `check-detail check-${item.status}`;
  checkDetail.replaceChildren(
    element("div", { className: "check-detail-heading" }, [
      element("div", {}, [
        element("span", { className: "check-number" }, item.number),
        element("h3", {}, item.title)
      ]),
      element("span", { className: "status-pill" }, item.detail)
    ]),
    element("div", { className: "check-counts" }, [
      severityBadge("error", `要修正 ${errorCount}`),
      severityBadge("warning", `要確認 ${warningCount}`)
    ]),
    renderSelectedFindings(item)
  );
}

function renderSelectedFindings(item) {
  if (item.status === "not_applicable") {
    return element("div", { className: "empty-state" }, [
      element("strong", {}, "このファイル形式では対象外です。"),
      element("p", {}, "該当する検出指摘はありません。")
    ]);
  }
  if (!item.relatedFindings.length) {
    return element("div", { className: "empty-state" }, [
      element("strong", {}, "この検査項目では指摘はありません。"),
      element("p", {}, "カードをクリックすると、そのチェック項目に紐づく指摘がここに表示されます。")
    ]);
  }
  return element("div", { className: "selected-findings" }, item.relatedFindings.map((finding) => renderFindingCard(finding)));
}

function renderFindingCard(finding) {
  const location = finding.row ? `${finding.row} 行${finding.column ? ` ${finding.column} 列` : ""}` : "場所指定なし";
  const metaItems = [
    severityBadge(finding.severity, severityLabels[finding.severity] ?? finding.severity),
    element("span", {}, location)
  ];
  if (finding.value) metaItems.push(element("span", {}, `セル値: ${finding.value}`));
  return element("article", { className: "finding-card" }, [
    element("div", { className: "finding-meta" }, metaItems),
    element("h3", {}, finding.message)
  ]);
}

function severityBadge(severity, label) {
  return element("span", { className: `severity-badge severity-${severity}` }, [
    element("span", { className: "severity-icon" }, severityIcons[severity] ?? "i"),
    element("span", {}, label)
  ]);
}

function metric(label, value) {
  const className = {
    "問題なし": "metric-passed",
    "指摘あり": "metric-issues_found",
    "対象外": "metric-not_applicable"
  }[label] ?? "";
  return element("div", { className }, [
    element("dt", {}, label),
    element("dd", {}, String(value))
  ]);
}

function element(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.type) node.type = options.type;
  if (options.role) node.setAttribute("role", options.role);
  if ("tabIndex" in options) node.tabIndex = Number(options.tabIndex);
  if (options.ariaPressed) node.setAttribute("aria-pressed", options.ariaPressed);
  if (typeof options.hidden === "boolean") node.hidden = options.hidden;
  const childItems = Array.isArray(children) ? children : [children];
  childItems.forEach((child) => {
    node.append(child instanceof Node ? child : document.createTextNode(child));
  });
  return node;
}
