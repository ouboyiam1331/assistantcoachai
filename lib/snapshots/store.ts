type SnapshotRecord<T> = {
  key: string;
  createdAt: string;
  expiresAt: number;
  payload: T;
};

const snapshotStore = new Map<string, SnapshotRecord<unknown>>();

export const snapshotTtlMs = {
  teamMeta: 1000 * 60 * 60 * 24 * 7,
  teamStats: 1000 * 60 * 60 * 18,
  schedule: 1000 * 60 * 60 * 12,
  game: 1000 * 60 * 60 * 6,
  analysis: 1000 * 60 * 30,
  homepage: 1000 * 60 * 60 * 24 * 8,
} as const;

export function getSnapshot<T>(key: string): T | null {
  const row = snapshotStore.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    snapshotStore.delete(key);
    return null;
  }
  return row.payload as T;
}

export function setSnapshot<T>(key: string, payload: T, ttlMs: number) {
  snapshotStore.set(key, {
    key,
    payload,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + ttlMs,
  });
}

export function getSnapshotStats() {
  let active = 0;
  let expired = 0;
  const now = Date.now();
  for (const row of snapshotStore.values()) {
    if (row.expiresAt > now) active += 1;
    else expired += 1;
  }
  return {
    active,
    expired,
    total: snapshotStore.size,
  };
}

export function listSnapshots(prefixes?: string[]) {
  const now = Date.now();
  const normalizedPrefixes = Array.isArray(prefixes)
    ? prefixes.filter((prefix) => prefix.length > 0)
    : null;
  const rows: Array<SnapshotRecord<unknown>> = [];

  for (const row of snapshotStore.values()) {
    if (row.expiresAt <= now) continue;
    if (
      normalizedPrefixes &&
      !normalizedPrefixes.some((prefix) => row.key.startsWith(prefix))
    ) {
      continue;
    }
    rows.push(row);
  }

  rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return rows;
}
