import type { CheckResult, HistoryRecord } from "@/types";

const DB_NAME = "machine-readable-checker";
const STORE = "check-results";

function request<T>(value: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

function complete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

const database = new Promise<IDBDatabase>((resolve, reject) => {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => {
    if (!open.result.objectStoreNames.contains(STORE)) {
      const store = open.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("checkedAt", "checkedAt");
    }
  };
  open.onsuccess = () => resolve(open.result);
  open.onerror = () => reject(open.error);
});

export const historyStore = {
  async save(result: CheckResult) {
    const db = await database;
    const record: HistoryRecord = {
      id: crypto.randomUUID(), userId: null, checkedAt: new Date().toISOString(),
      filename: result.filename, sourceUrl: result.source_url ?? null,
      valid: result.valid, summary: result.summary, schemaVersion: 1, result
    };
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await complete(tx);
    return record;
  },
  async list() {
    const db = await database;
    const tx = db.transaction(STORE, "readonly");
    return (await request<HistoryRecord[]>(tx.objectStore(STORE).index("checkedAt").getAll())).reverse();
  },
  async delete(id: string) {
    const db = await database;
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await complete(tx);
  }
};
