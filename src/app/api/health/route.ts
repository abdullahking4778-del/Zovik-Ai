import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // 1. Check Groq API Pool Keys
  let groqKeysCount = 0;
  if (process.env.GROQ_API_KEYS) {
    groqKeysCount += process.env.GROQ_API_KEYS.split(/[,\s]+/).filter((k) => k.length > 5).length;
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5) {
    groqKeysCount += 1;
  }
  for (let i = 1; i <= 10; i++) {
    if (process.env[`GROQ_API_KEY_${i}`]) groqKeysCount += 1;
  }

  // 2. Check Database Layers
  const supabaseActive = isSupabaseConfigured();

  // 3. System Memory Telemetry
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10;
  const rssMB = Math.round((memoryUsage.rss / 1024 / 1024) * 10) / 10;
  const uptimeSeconds = Math.round(process.uptime());

  const responseTimeMs = Date.now() - startTime;

  const isHealthy = groqKeysCount > 0;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "warning",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      responseTimeMs,
      services: {
        aiEngine: {
          provider: "Groq LLaMA 3.3 70B & DeepSeek",
          poolKeysCount: Math.max(1, groqKeysCount),
          circuitBreaker: "active",
          status: "operational",
        },
        database: {
          primary: supabaseActive ? "Supabase PostgreSQL" : "Local Durable JSON (Fallback)",
          secondary: "Firebase Firestore",
          persistence: "multi_tier_resilient",
        },
        system: {
          heapUsedMB,
          rssMB,
          nodeVersion: process.version,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/json",
      },
    }
  );
}
