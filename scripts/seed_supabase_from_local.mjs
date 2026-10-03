import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) {
    const val = v.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[k.trim()] = val;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

async function seed() {
  console.log("Starting Supabase initial seed...");

  // 1. Seed Companions
  try {
    const charsRaw = fs.readFileSync("src/data/characters.json", "utf-8");
    const chars = JSON.parse(charsRaw);
    console.log(`Found ${chars.length} local companions to sync to Supabase...`);

    const companionRows = chars.map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline || c.bio || "",
      category: c.category || "General",
      gender: c.gender || "female",
      tier: c.tier || (c.isVip ? "vip" : "free"),
      avatar: c.avatar || "",
      image_url: c.avatar || "",
      gallery: c.gallery || [],
      intro_video: c.introVideo || null,
      is_vip: Boolean(c.isVip || c.tier === "vip"),
      is_custom: Boolean(c.isCustom),
    }));

    const { error: charErr } = await supabase
      .from("companions")
      .upsert(companionRows, { onConflict: "id" });

    if (charErr) {
      console.error("Error syncing companions:", charErr);
    } else {
      console.log(`Successfully synced ${companionRows.length} companions to Supabase 'companions' table!`);
    }
  } catch (err) {
    console.error("Companions sync failed:", err);
  }

  // 2. Seed Shorts / Reels
  try {
    const shortsRaw = fs.readFileSync("src/data/shorts.json", "utf-8");
    const shorts = JSON.parse(shortsRaw);
    console.log(`Found ${shorts.length} local shorts reels to sync to Supabase...`);

    const shortRows = shorts.map((s) => ({
      id: s.id,
      title: s.caption || s.characterName || "Reel",
      video_url: s.videoUrl,
      character_id: s.characterId || null,
      likes: s.likes || 120,
    }));

    const { error: shortErr } = await supabase
      .from("shorts_reels")
      .upsert(shortRows, { onConflict: "id" });

    if (shortErr) {
      console.error("Error syncing shorts:", shortErr);
    } else {
      console.log(`Successfully synced ${shortRows.length} shorts reels to Supabase 'shorts_reels' table!`);
    }
  } catch (err) {
    console.error("Shorts sync failed:", err);
  }

  // Verify counts
  const { count: cCount } = await supabase.from("companions").select("*", { count: "exact", head: true });
  const { count: sCount } = await supabase.from("shorts_reels").select("*", { count: "exact", head: true });
  console.log(`\nSupabase Cloud Database Status:`);
  console.log(`- Companions in DB: ${cCount}`);
  console.log(`- Shorts Reels in DB: ${sCount}`);
}

seed();
