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
  unchecked: "チェック不可",
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
    id: "estat-1",
    number: "チェック項目１",
    title: "ファイル形式は Excel か CSV となっているか",
    codes: ["unsupported-format", "invalid-xlsx", "empty-workbook", "legacy-xls"],
    sourceCheckIds: ["estat-1"]
  },
  {
    id: "estat-2-1",
    number: "チェック項目２－１",
    title: "１セル１データとなっているか",
    codes: [],
    sourceCheckIds: ["estat-2-1"]
  },
  {
    id: "estat-2-2",
    number: "チェック項目２－２",
    title: "数値データは数値属性とし、文字列を含まないこと",
    codes: ["decorated-number"],
    sourceCheckIds: ["estat-2-2"]
  },
  {
    id: "estat-2-3",
    number: "チェック項目２－３",
    title: "セルの結合をしていないか",
    codes: ["merged-cells"],
    sourceCheckIds: ["estat-2-3"]
  },
  {
    id: "estat-2-4",
    number: "チェック項目２－４",
    title: "スペースや改行等で体裁を整えていないか",
    codes: ["layout-whitespace"],
    sourceCheckIds: ["estat-2-4"]
  },
  {
    id: "estat-2-5",
    number: "チェック項目２－５",
    title: "項目名等を省略していないか",
    codes: ["missing-header", "duplicate-header"],
    sourceCheckIds: ["estat-2-5"]
  },
  {
    id: "estat-2-6",
    number: "チェック項目２－６",
    title: "数式を使用している場合は、数値データに修正しているか",
    codes: ["formulas"],
    sourceCheckIds: ["estat-2-6"]
  },
  {
    id: "estat-2-7",
    number: "チェック項目２－７",
    title: "オブジェクトを使用していないか",
    codes: ["xlsx-object"],
    sourceCheckIds: ["estat-2-7"]
  },
  {
    id: "estat-2-8",
    number: "チェック項目２－８",
    title: "データの単位を記載しているか",
    codes: ["missing-unit"],
    sourceCheckIds: ["estat-2-8"]
  },
  {
    id: "estat-2-9",
    number: "チェック項目２－９",
    title: "機種依存文字を使用していないか",
    codes: ["dependent-character"],
    sourceCheckIds: ["estat-2-9"]
  },
  {
    id: "estat-2-10",
    number: "チェック項目２－１０",
    title: "e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか",
    codes: ["era-only-date"],
    sourceCheckIds: ["estat-2-10"]
  },
  {
    id: "estat-2-11",
    number: "チェック項目２－１１",
    title: "地域コード又は地域名称が表記されているか",
    codes: ["area-abbreviation"],
    sourceCheckIds: ["estat-2-11"]
  },
  {
    id: "estat-2-12",
    number: "チェック項目２－１２",
    title: "数値データの同一列内に特殊記号（秘匿等）が含まれる場合",
    codes: ["ambiguous-empty-value"],
    sourceCheckIds: ["estat-2-12"]
  },
  {
    id: "estat-3-1",
    number: "チェック項目３－１",
    title: "データが分断されていないか",
    codes: ["leading-empty-rows", "split-table"],
    sourceCheckIds: ["estat-3-1"]
  },
  {
    id: "estat-3-2",
    number: "チェック項目３－２",
    title: "１シートに複数の表が掲載されていないか",
    codes: ["multiple-table-sets"],
    sourceCheckIds: ["estat-3-2"]
  },
  {
    id: "estat-4-1",
    number: "チェック項目４－１",
    title: "変数行から始まり、次行からデータ入力がされているか",
    codes: ["empty-table", "leading-empty-rows"],
    sourceCheckIds: ["estat-4-1"]
  },
  {
    id: "estat-4-2",
    number: "チェック項目４－２",
    title: "１フィールド１データとなっているか",
    codes: ["layout-whitespace"],
    sourceCheckIds: ["estat-4-2"]
  },
  {
    id: "estat-4-3",
    number: "チェック項目４－３",
    title: "数値データは数値属性とし、文字列を含まないこと",
    codes: ["decorated-number"],
    sourceCheckIds: ["estat-4-3"]
  },
  {
    id: "estat-4-4",
    number: "チェック項目４－４",
    title: "スペースを使っていないか",
    codes: ["layout-whitespace"],
    sourceCheckIds: ["estat-4-4"]
  },
  {
    id: "estat-4-5",
    number: "チェック項目４－５",
    title: "１行１データで表現されているか",
    codes: ["inconsistent-columns"],
    sourceCheckIds: ["estat-4-5"]
  },
  {
    id: "estat-4-6",
    number: "チェック項目４－６",
    title: "項目名等を省略していないか",
    codes: ["missing-header", "duplicate-header"],
    sourceCheckIds: ["estat-4-6"]
  },
  {
    id: "estat-4-7",
    number: "チェック項目４－７",
    title: "データの単位を記載しているか",
    codes: ["missing-unit"],
    sourceCheckIds: ["estat-4-7"]
  },
  {
    id: "estat-4-8",
    number: "チェック項目４－８",
    title: "機種依存文字を使用していないか",
    codes: ["dependent-character"],
    sourceCheckIds: ["estat-4-8"]
  },
  {
    id: "estat-4-9",
    number: "チェック項目４－９",
    title: "e-Stat の時間軸コードの表記、西暦表記又は和暦に西暦の併記がされているか",
    codes: ["era-only-date"],
    sourceCheckIds: ["estat-4-9"]
  },
  {
    id: "estat-4-10",
    number: "チェック項目４－１０",
    title: "地域コード又は地域名称が表記されているか",
    codes: ["area-abbreviation"],
    sourceCheckIds: ["estat-4-10"]
  },
  {
    id: "estat-4-11",
    number: "チェック項目４－１１",
    title: "数値データの同一列内に特殊記号（秘匿等）が含まれる場合",
    codes: ["ambiguous-empty-value"],
    sourceCheckIds: ["estat-4-11"]
  },
  {
    id: "estat-4-12",
    number: "チェック項目４－１２",
    title: "各フィールドの値をダブルコーテーション（“）で囲んでいるか",
    codes: [],
    sourceCheckIds: ["estat-4-12"]
  },
  {
    id: "estat-4-13",
    number: "チェック項目４－１３",
    title: "データが分断されていないか",
    codes: ["leading-empty-rows", "split-table"],
    sourceCheckIds: ["estat-4-13"]
  },
  {
    id: "estat-4-14",
    number: "チェック項目４－１４",
    title: "１ファイル内に変数とデータのセットが複数掲載されていないか",
    codes: ["multiple-table-sets"],
    sourceCheckIds: ["estat-4-14"]
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
    const data = await parseResponse(response);
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

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { detail: text || "検査に失敗しました。" };
}

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
      metric("チェック不可", data.summary.unchecked ?? 0),
      metric("対象外", data.summary.not_applicable)
    ])
  );
}

function renderCheckItems(sourceChecks, allFindings) {
  const sourceChecksById = new Map(sourceChecks.map((check) => [check.id, check]));
  currentCheckItems = estatCheckItems.flatMap((item) => {
    const applicableSourceChecks = item.sourceCheckIds
      .map((id) => sourceChecksById.get(id))
      .filter((check) => check && check.status !== "not_applicable");
    const relatedFindingCodes = new Set(applicableSourceChecks.flatMap((check) => check.finding_codes ?? []));
    const relatedFindings = allFindings.filter((finding) => relatedFindingCodes.has(finding.code));
    const sourceStatuses = item.sourceCheckIds
      .map((id) => sourceChecksById.get(id)?.status)
      .filter(Boolean);
    if (!relatedFindings.length && sourceStatuses.length && sourceStatuses.every((sourceStatus) => sourceStatus === "not_applicable")) {
      return [];
    }
    const status = relatedFindings.length
      ? "issues_found"
      : sourceStatuses.includes("unchecked")
        ? "unchecked"
      : sourceStatuses.length && sourceStatuses.every((sourceStatus) => sourceStatus === "not_applicable")
        ? "not_applicable"
        : "passed";
    const detail = status === "issues_found" ? `指摘あり ${relatedFindings.length}件` : statusLabels[status];
    return [{ ...item, relatedFindings, status, detail }];
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
  if (status === "unchecked") {
    return element("p", { className: "check-situation" }, "この検査項目はチェックができませんでした。");
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
  if (item.status === "unchecked") {
    return element("div", { className: "empty-state" }, [
      element("strong", {}, "チェックができませんでした。"),
      element("p", {}, "このファイル形式では、この検査項目を判定するための情報を取得できません。")
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
    ...(finding.sheet ? [element("span", {}, `シート: ${finding.sheet}`)] : []),
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
    "チェック不可": "metric-unchecked",
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
