# Zovik AI

Zovik AI is an AI Companion & Social Application built with Next.js (App Router), React, Tailwind CSS, Firebase, and Supabase.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v20 or newer
- **npm**: v10 or newer

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env.local
```
Fill in the values in `.env.local` with your local development or staging keys. Never commit `.env.local` to GitHub.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on `http://localhost:3000` |
| `npm run build` | Builds the production bundle |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs TypeScript static type checking (`tsc --noEmit`) |
| `npm run type-check`| Runs TypeScript static type checking (`tsc --noEmit`) |
| `npm run test` | Runs the full automated security & reliability verification suite |
| `npm run test:unit` | Runs fast, isolated in-memory unit tests |
| `npm run test:integration` | Runs HTTP integration tests against the local server |

---

## ☁️ Deployment Configuration (e.g. Vercel)

When deploying to Vercel or any serverless cloud environment:

1. **Admin Master Password & Secret**:
   - `ADMIN_PASSWORD`: Master password for accessing the Admin Control Room (min 8 characters).
   - `ADMIN_JWT_SECRET`: Random cryptographic string (at least 24 characters) used for signing HttpOnly session cookies.

2. **Firebase Admin SDK (Server Operations)**:
   - For trusted server-side Firestore operations and token verification on Vercel, set:
     - `FIREBASE_PROJECT_ID`: Your Firebase project ID (e.g. `zovik-ai-f7331`).
     - `FIREBASE_CLIENT_EMAIL`: Service account email from Google Cloud / Firebase IAM.
     - `FIREBASE_PRIVATE_KEY`: Service account private key string (with newline escape characters).

3. **Supabase (Cloud Database)**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase client anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Server-only service role key for administrative operations.

4. **AI Generation Engine (Groq Cloud)**:
   - `GROQ_API_KEY`: API key for chat completion and voice LLM generation.

---

## 🔒 Security Architecture Notes

- **Password Storage**: Uses salted cryptographic hashes (`scryptSync` with 16-byte random salts). Plaintext passwords are never stored or returned by APIs.
- **Admin Sessions**: Managed using server-signed HttpOnly cookies with CSRF defense on state-changing requests.
- **Rate Limiting**: Defends against brute-force login attacks with automatic 15-minute lockout upon 5 failed attempts. Logout is exempt from throttling to ensure admins can always clear their session.
- **Account Deletion Safeguards**: User deletion records are permanently tombstoned in durable cloud storage. Normal logins cannot unmark administrator deletion blocks.
