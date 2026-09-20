import type { CheckResult } from "@/types";

async function parse(response: Response): Promise<CheckResult> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "検査に失敗しました。");
  return payload;
}

export async function checkFile(file: File): Promise<CheckResult> {
  const body = new FormData();
  body.append("file", file);
  return parse(await fetch("/api/check", { method: "POST", body }));
}

export async function checkUrl(url: string): Promise<CheckResult> {
  return parse(await fetch("/api/check-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  }));
}
