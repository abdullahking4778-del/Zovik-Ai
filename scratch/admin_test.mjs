import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log("🚀 Starting Zovik AI Admin End-to-End API Test...\n");

  const baseUrl = "http://localhost:3000";
  let adminToken = "";

  // 1. Test Admin Login
  console.log("Step 1: Testing Admin Login...");
  try {
    const res = await fetch(`${baseUrl}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "#Abdullah786099#" })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    adminToken = data.token;
    console.log("✅ Admin Login Successful! Token received.\n");
  } catch (err) {
    console.error("❌ Admin Login Failed:", err.message);
    return;
  }

  const authHeaders = { "Authorization": `Bearer ${adminToken}` };

  // 2. Test Avatar Image Upload
  console.log("Step 2: Testing Avatar Image Upload...");
  let uploadedAvatarUrl = "";
  try {
    const imagePath = "C:/Users/ABDULLAH HOME/Documents/Zovik Ai/public/characters/zovik_01.jpg";
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBlob = new Blob([imageBuffer], { type: "image/jpeg" });
    
    const formData = new FormData();
    formData.append("file", imageBlob, "zovik_01.jpg");
    formData.append("type", "image");

    const res = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    uploadedAvatarUrl = data.url;
    console.log(`✅ Avatar Upload Successful! URL: ${uploadedAvatarUrl}\n`);
  } catch (err) {
    console.error("❌ Avatar Upload Failed:", err.message);
    return;
  }

  // 3. Test Intro Video Upload
  console.log("Step 3: Testing Intro Video Upload...");
  let uploadedVideoUrl = "";
  try {
    const videoPath = "C:/Users/ABDULLAH HOME/Documents/Zovik Ai/public/videos/companions/alexander-sterling.mp4";
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
    
    const formData = new FormData();
    formData.append("file", videoBlob, "alexander-sterling.mp4");
    formData.append("type", "video");

    const res = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    uploadedVideoUrl = data.url;
    console.log(`✅ Video Upload Successful! URL: ${uploadedVideoUrl}\n`);
  } catch (err) {
    console.error("❌ Video Upload Failed:", err.message);
    return;
  }

  // 4. Test Companion Creation
  console.log("Step 4: Testing Companion Creation...");
  try {
    const companionData = {
      name: "API Test Companion",
      age: 24,
      gender: "female",
      style: "realistic",
      category: "Trending",
      badge: "NEW",
      tagline: "I am a test companion created via API",
      desc: "Testing end to end flow for companion creation.",
      voice: "Warm Whisper",
      tags: "Test, QA",
      greeting: "Hello from the API Test!",
      image: uploadedAvatarUrl,
      videoUrl: uploadedVideoUrl,
      isVipOnly: false
    };

    const res = await fetch(`${baseUrl}/api/admin/characters`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(companionData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Creation failed");
    console.log(`✅ Companion Creation Successful! Created ID: ${data.character.id}\n`);
  } catch (err) {
    console.error("❌ Companion Creation Failed:", err.message);
    return;
  }

  // 5. Check Payments API
  console.log("Step 5: Testing Subscriptions Queue Fetch...");
  try {
    const res = await fetch(`${baseUrl}/api/subscriptions`, {
      method: "GET",
      headers: authHeaders
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Fetch failed");
    console.log(`✅ Subscriptions Fetch Successful! Total requests: ${data.payments?.length || 0}\n`);
  } catch (err) {
    console.error("❌ Subscriptions Fetch Failed:", err.message);
  }

  console.log("🎉 All automated API tests completed successfully!");
}

runTests();
