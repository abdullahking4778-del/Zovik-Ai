import { NextRequest, NextResponse } from "next/server";
import { verifyUserRequest } from "@/lib/serverUserAuth";
import { removeDeletedUserTombstone } from "@/lib/deletedUsers";

export async function POST(req: NextRequest) {
  try {
    const verified = await verifyUserRequest(req);
    if (!verified.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (verified.uid || verified.email) {
      removeDeletedUserTombstone(verified.uid, verified.email);
    }

    return NextResponse.json({ success: true, message: "User account fresh status initialized." });
  } catch (err: unknown) {
    console.error("[UnmarkDeleted POST Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
