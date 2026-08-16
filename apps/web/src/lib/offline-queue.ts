import { api, ApiRequestError } from "./api.js";
import {
  completePath,
  completeQuest,
  isDayClosedError,
  newClientId,
  skipPath,
  skipQuest,
} from "../features/system-window/today-client.js";
import type {
  QuestEffort,
  QuestMutationResult,
  SkipReason,
} from "../features/system-window/types.js";

export const OUTBOX_DB = "arise-outbox";
export const OUTBOX_STORE = "items";
export const OUTBOX_VERSION = 1;
export const HEALTH_MANUAL_PATH = "/api/v1/health/manual";

export type OutboxComplete = {
  id: string;
  kind: "complete";
  createdAt: number;
  questId: string;
  effort: QuestEffort;
  clientId: string;
};

export type OutboxSkip = {
  id: string;
  kind: "skip";
  createdAt: number;
  questId: string;
  reason: SkipReason;
};

export type ManualSampleBody = {
  metric: string;
  value: number;
  unit: string;
  startAt: string;
  endAt: string;
  clientId?: string;
  consent?: true;
};

export type OutboxManualSample = {
  id: string;
  kind: "manual_sample";
  createdAt: number;
  body: ManualSampleBody;
};

export type OutboxItem = OutboxComplete | OutboxSkip | OutboxManualSample;

export type OutboxStore = {
  list(): Promise<OutboxItem[]>;
  put(item: OutboxItem): Promise<void>;
  delete(id: string): Promise<void>;
};

export type QuestOrQueue =
  | { kind: "ok"; result: QuestMutationResult }
  | { kind: "queued" };

export type DrainResult = {
  sent: number;
  dropped: number;
  remaining: number;
};

let drainLock: Promise<DrainResult> | null = null;
let timeSeq = 0;

function nextCreatedAt(): number {
  const now = Date.now();
  timeSeq = now <= timeSeq ? timeSeq + 1 : now;
  return timeSeq;
}

export function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiRequestError) return false;
  return err instanceof TypeError || (err instanceof Error && /failed to fetch|network|offline/i.test(err.message));
}

export function outboxActionForError(err: unknown): "drop" | "retry" {
  return isDayClosedError(err) ? "drop" : "retry";
}

export function newOutboxId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `outbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function memoryOutboxStore(seed: OutboxItem[] = []): OutboxStore {
  const items = new Map(seed.map((item) => [item.id, item]));
  return {
    async list() {
      return [...items.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    },
    async put(item) {
      items.set(item.id, item);
    },
    async delete(id) {
      items.delete(id);
    },
  };
}

export const indexedDbOutboxStore: OutboxStore = {
  async list() {
    const db = await openOutboxDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(OUTBOX_STORE, "readonly").objectStore(OUTBOX_STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as OutboxItem[]).slice();
        rows.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  },
  async put(item) {
    const db = await openOutboxDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(OUTBOX_STORE, "readwrite").objectStore(OUTBOX_STORE).put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async delete(id) {
    const db = await openOutboxDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(OUTBOX_STORE, "readwrite").objectStore(OUTBOX_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};

function defaultStore(): OutboxStore {
  return typeof indexedDB === "undefined" ? memoryOutboxStore() : indexedDbOutboxStore;
}

function openOutboxDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, OUTBOX_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: OutboxItem, store?: OutboxStore): Promise<void> {
  await (store ?? defaultStore()).put(item);
}

export async function enqueueComplete(
  questId: string,
  effort: QuestEffort,
  clientId: string = newClientId(),
  store?: OutboxStore,
): Promise<OutboxComplete> {
  const item: OutboxComplete = {
    id: newOutboxId(),
    kind: "complete",
    createdAt: nextCreatedAt(),
    questId,
    effort,
    clientId,
  };
  await enqueue(item, store);
  return item;
}

export async function enqueueSkip(
  questId: string,
  reason: SkipReason,
  store?: OutboxStore,
): Promise<OutboxSkip> {
  const item: OutboxSkip = {
    id: newOutboxId(),
    kind: "skip",
    createdAt: nextCreatedAt(),
    questId,
    reason,
  };
  await enqueue(item, store);
  return item;
}

export async function enqueueManualSample(
  body: ManualSampleBody,
  store?: OutboxStore,
): Promise<OutboxManualSample> {
  const item: OutboxManualSample = {
    id: newOutboxId(),
    kind: "manual_sample",
    createdAt: nextCreatedAt(),
    body,
  };
  await enqueue(item, store);
  return item;
}

export async function postOutboxItem(item: OutboxItem): Promise<unknown> {
  if (item.kind === "complete") {
    return api(completePath(item.questId), {
      method: "POST",
      body: JSON.stringify({ clientId: item.clientId, effort: item.effort }),
    });
  }
  if (item.kind === "skip") {
    return api(skipPath(item.questId), {
      method: "POST",
      body: JSON.stringify({ reason: item.reason }),
    });
  }
  return api(HEALTH_MANUAL_PATH, {
    method: "POST",
    body: JSON.stringify(item.body),
  });
}

export async function drainOutbox(opts: {
  store?: OutboxStore;
  post?: (item: OutboxItem) => Promise<unknown>;
  onDayClosed?: () => void;
} = {}): Promise<DrainResult> {
  if (drainLock) return drainLock;
  drainLock = runDrain(opts).finally(() => {
    drainLock = null;
  });
  return drainLock;
}

async function runDrain(opts: {
  store?: OutboxStore;
  post?: (item: OutboxItem) => Promise<unknown>;
  onDayClosed?: () => void;
}): Promise<DrainResult> {
  const store = opts.store ?? defaultStore();
  const post = opts.post ?? postOutboxItem;
  const items = await store.list();
  let sent = 0;
  let dropped = 0;

  for (const item of items) {
    try {
      await post(item);
      await store.delete(item.id);
      sent += 1;
    } catch (err) {
      if (outboxActionForError(err) === "drop") {
        await store.delete(item.id);
        dropped += 1;
        opts.onDayClosed?.();
        continue;
      }
      break;
    }
  }

  const remaining = (await store.list()).length;
  return { sent, dropped, remaining };
}

export function startOutboxDrain(opts: {
  store?: OutboxStore;
  post?: (item: OutboxItem) => Promise<unknown>;
  onDayClosed?: () => void;
  onDrained?: (result: DrainResult) => void;
} = {}): () => void {
  let cancelled = false;

  const run = () => {
    if (cancelled || !isBrowserOnline()) return;
    void drainOutbox(opts).then((result) => {
      if (!cancelled && (result.sent > 0 || result.dropped > 0)) {
        opts.onDrained?.(result);
      }
    });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", run);
  }
  run();

  return () => {
    cancelled = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", run);
    }
  };
}

export async function completeQuestOrQueue(
  questId: string,
  effort: QuestEffort,
  clientId: string = newClientId(),
  opts: { store?: OutboxStore; online?: boolean } = {},
): Promise<QuestOrQueue> {
  const online = opts.online ?? isBrowserOnline();
  if (!online) {
    await enqueueComplete(questId, effort, clientId, opts.store);
    return { kind: "queued" };
  }
  try {
    const result = await completeQuest(questId, effort, clientId);
    return { kind: "ok", result };
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueComplete(questId, effort, clientId, opts.store);
      return { kind: "queued" };
    }
    throw err;
  }
}

export async function skipQuestOrQueue(
  questId: string,
  reason: SkipReason,
  opts: { store?: OutboxStore; online?: boolean } = {},
): Promise<QuestOrQueue> {
  const online = opts.online ?? isBrowserOnline();
  if (!online) {
    await enqueueSkip(questId, reason, opts.store);
    return { kind: "queued" };
  }
  try {
    const result = await skipQuest(questId, reason);
    return { kind: "ok", result };
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueSkip(questId, reason, opts.store);
      return { kind: "queued" };
    }
    throw err;
  }
}
