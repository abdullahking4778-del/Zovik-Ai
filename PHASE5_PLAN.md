# Zovik AI – Phase 5: Commercial Polish & Admin Power Plan

**Budget:** strictly **$0 / 0 PKR** (Zero external paid services, 100% native Node.js / Next.js)  
**Target Platform:** Zovik AI (`C:\Users\ABDULLAH HOME\Documents\Zovik Ai`)

---

## Requirements & Implementation Checklist

1. **Brand Identity:** Concept 1 (Cyber Neon Squircle) selected by user for official Favicon, PWA App Icon, and Shorts Profile Avatar.
2. **Fake Likes & Fake Views Removal:**
   - Remove views badge (`187.0K views`, `64.4K views`) across Shorts player and Admin CMS.
   - Remove fake like counter digits; maintain clean interactive heart toggle.
3. **Admin Master Password Changer:**
   - Add `POST /api/admin/change-password` endpoint.
   - Interactive password form in Admin AI Engine tab updating `.env.local` immediately.
4. **Direct 1-Click Native PWA Install:**
   - Service worker `public/sw.js` registered.
   - Global event capture for `beforeinstallprompt`.
   - Direct prompt trigger on "Get App" modal action.
5. **Direct PC/Mobile & ZIP File Upload Engine:**
   - API `POST /api/admin/upload` supporting `.mp4`, `.webm`, `.mov`, `.jpg`, `.png`, `.webp`, and `.zip` archives.
   - Drag & drop and file picker in Admin "Add Short Reel" and "Photo Galleries".
   - Zero-budget extraction via `adm-zip` and image optimization via `sharp`.
6. **Zovik Shorts Modern UX:**
   - Audio auto-ON by default with user mute toggle.
   - Direct chat button & bottom bar removed.
   - Official Zovik Neon Squircle avatar deployed.
   - Deep-linking share URL (`?reel=id`) with auto-opening on page mount.
   - Mouse wheel and mobile swipe vertical scrolling.
