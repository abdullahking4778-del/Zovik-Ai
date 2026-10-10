import { NextRequest, NextResponse } from "next/server";
import { GET as shortsGET, POST as shortsPOST, DELETE as shortsDELETE } from "@/app/api/shorts/route";

export async function GET(req: NextRequest) {
  return shortsGET();
}

export async function POST(req: NextRequest) {
  return shortsPOST(req);
}

export async function DELETE(req: NextRequest) {
  return shortsDELETE(req);
}
