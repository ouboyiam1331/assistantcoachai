import { NextResponse } from "next/server";
import { TGEM_CHANGELOG } from "@/lib/model/changelog";
import { TGEM_MODEL_VERSION } from "@/lib/model/version";

export async function GET() {
  return NextResponse.json({
    ok: true,
    modelVersion: TGEM_MODEL_VERSION,
    entries: TGEM_CHANGELOG,
  });
}

