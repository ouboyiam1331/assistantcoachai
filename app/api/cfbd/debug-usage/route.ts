import { NextResponse } from "next/server";
import { getCfbdUsageSnapshot } from "@/lib/cfbd/http";
import { SNAPSHOT_COLLECTIONS } from "@/lib/snapshots/collections";
import { getSnapshotStats, snapshotTtlMs } from "@/lib/snapshots/store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    snapshotCollections: SNAPSHOT_COLLECTIONS,
    snapshotTtlMs,
    snapshotStats: getSnapshotStats(),
    ...getCfbdUsageSnapshot(),
  });
}
