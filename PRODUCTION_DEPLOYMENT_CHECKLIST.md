# 🚀 ZOVIK AI — Production Deployment Checklist (Vercel & Custom Domain)

Is document me live deployment aur custom domain setup ka complete step-by-step checklist maujood hai taake aapka Zovik AI platform live internet par zero errors ke sath chale.

---

## 📋 1. Vercel Deployment (Step-by-Step)

### Step 1.1: GitHub Repository
1. Apne local codebase ko GitHub par push karein:
   ```bash
   git add .
   git commit -m "feat: complete platform polish and zero-bug production build"
   git push origin main
   ```

### Step 1.2: Vercel Project Import
1. [vercel.com](https://vercel.com) par login karein.
2. **"Add New Project"** select karein aur apna GitHub repo select karein.
3. Framework Preset: **Next.js** (auto-detected).
4. Build Command: `npm run build` (package.json me already optimized hai).

---

## 🔑 2. Required Production Environment Variables (.env)

Vercel ke **Project Settings -> Environment Variables** me yeh zaroori keys add karein:

| Variable Name | Description | Example / Required Value |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq Cloud AI Engine Primary API Key | `gsk_...` |
| `GROQ_API_KEYS` | *(Optional)* Multiple Groq Keys (Comma-separated for auto-rotation & 429 failover) | `gsk_key1,gsk_key2,gsk_key3` |
| `GROQ_API_KEY_2`, `_3` | *(Optional)* Additional backup keys (Auto-rotated round-robin) | `gsk_...` |
| `GROQ_MODEL` | Primary AI LLM Model | `llama3-70b-8192` |
| `GROQ_FALLBACK_MODEL` | Fallback AI LLM Model | `openai/gpt-oss-120b` |
| `ADMIN_PASSWORD` | Owner Control Room Master Password | `#Abdullah786099#` |
| `ADMIN_JWT_SECRET` | 32+ char Cryptographic Secret for Admin JWT | `zovik_admin_sec_8a7f9c2d1e4b5678_hash_key_99` |
| `USER_SESSION_SECRET`| 32+ char Secret for User Session Signing | `zovik_user_sec_99f3a1e7b2c45d6e8f0a1b2c3d4e5f6` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Cloud Database URL | `https://zipdptvuybmsvvcwdwkd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | `eyJhbGciOiJIUz...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Database Read/Write) | `eyJhbGciOiJIUz...` |

*(Note: Real API keys aapke local `.env.local` me already active aur tested hain).*

---

## 🌐 3. Custom Domain Setup (e.g. `zovik.ai` ya `zovikai.com`)

1. Vercel dashboard me apne project me jayein: **Settings -> Domains**.
2. Apna domain enter karein (maslan: `zovik.ai`).
3. Apne Domain Registrar (Namecheap, GoDaddy, Cloudflare, etc.) ke DNS Management me jakar yeh records add karein:
   - **Type A Record:**
     - Host / Name: `@`
     - Value: `76.76.21.21`
   - **Type CNAME Record (for www):**
     - Host / Name: `www`
     - Value: `cname.vercel-dns.com`
4. 5 se 10 minute me SSL Certificate (HTTPS) automatically activate ho jayega.

---

## 🛡️ 4. Post-Deployment Verification Checklist

- [ ] **Landing Page (`/`):** Logo sleek 36px icon size me ho, Hero cards aur Featured Companions 100% responsive render hon.
- [ ] **App Portal (`/app`):** Companions filter, chat modal, photos unblur, shorts reels smoothly stream hon.
- [ ] **AI Chat & Voice Notes:** Har companion ke message ke sath **"Play Voice Note 🎧"** audio note button natural voice me play kare.
- [ ] **Admin Control Room (`/admin`):** Master password se login ho, 3 categorized folders (Finance, Content, Platform) visible hon.
- [ ] **Coin Approval Alert:** Admin jab payment slip approve kare to user screen par animated celebration toast: *"🎉 Mubarak! X Coins aapke wallet me add ho gaye!"* pop up kare.
- [ ] **"My AI" Delete:** User apne custom companion ko 1-click se remove kar sake.
