# Deployment Guide — Safe Anon Chat

## Prerequisites

- Node.js 18+
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- Firestore database enabled
- Anonymous authentication enabled
- Gemini API key from [aistudio.google.com](https://aistudio.google.com)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same as above |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same as above |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same as above |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same as above |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same as above |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Same as above (optional) |
| `GEMINI_API_KEY` | Google AI Studio → API Keys |

> [!CAUTION]
> `GEMINI_API_KEY` must **NOT** have the `NEXT_PUBLIC_` prefix. It runs server-side only.

---

## Firebase Setup

### 1. Enable Services

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Firestore + Hosting)
firebase init
```

### 2. Enable Anonymous Auth

Firebase Console → Authentication → Sign-in method → Anonymous → Enable

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 4. Create Admin User

In Firestore, manually create a document at `/admins/{your-uid}` with any field (e.g., `role: "admin"`). This grants access to the admin dashboard and report management.

### 5. Create Firestore Indexes

The matchmaking system requires a composite index. Create it in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|---|---|---|
| `matchQueue` | `status` ASC, `createdAt` ASC | Composite |
| `reports` | `status` ASC, `createdAt` DESC | Composite |

---

## Option A: Deploy to Vercel (Recommended)

Vercel has native Next.js support with zero config — this is the easiest path.

### Steps

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables on Vercel

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add all variables from `.env.example`
3. Make sure `GEMINI_API_KEY` is added (it will be available to API routes server-side)

### Production Deploy

```bash
vercel --prod
```

> [!TIP]
> Vercel automatically handles the `/api/moderate` route as a serverless function — no additional config needed.

---

## Option B: Deploy to Firebase Hosting

Firebase Hosting serves static files. Since this app has an API route (`/api/moderate`), you need either:

- **Static export** (API route won't work — moderation disabled), or
- **Cloud Functions** adapter (full support)

### Static Export (Simple, no API route)

1. Add to `next.config.mjs`:
   ```js
   output: "export",
   ```

2. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

> [!WARNING]
> Static export disables the `/api/moderate` route. Messages will pass through unmoderated (fail-open behavior).

### With Cloud Functions (Full Support)

For full Next.js support on Firebase, use the official adapter:

```bash
npm install @firebase/next
firebase experiments:enable webframeworks
firebase init hosting  # Select "Web framework" when prompted
firebase deploy
```

This deploys API routes as Cloud Functions automatically.

---

## Production Checklist

### Before Deploy

- [ ] All environment variables set in `.env.local` (or hosting provider)
- [ ] `GEMINI_API_KEY` is set and valid
- [ ] Firebase Anonymous Auth enabled
- [ ] Firestore database created
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Required Firestore indexes created
- [ ] Admin user document created in `/admins/{uid}`
- [ ] `npm run build` passes with zero errors

### Security

- [ ] `GEMINI_API_KEY` is NOT prefixed with `NEXT_PUBLIC_`
- [ ] Firestore rules are deployed (not in test mode)
- [ ] Security headers active in `next.config.mjs`
- [ ] `console.log` stripped in production build
- [ ] No sensitive data in client-side code

### Performance

- [ ] Production build size is reasonable (check `npm run build` output)
- [ ] Images use AVIF/WebP formats
- [ ] Static assets have long cache TTLs
- [ ] Firebase SDK tree-shaking via `optimizePackageImports`

### After Deploy

- [ ] Test anonymous login flow
- [ ] Test chat matching (open 2 browser tabs)
- [ ] Test message moderation (send a test violation)
- [ ] Test report and block features
- [ ] Test admin dashboard at `/admin`
- [ ] Verify banned users can't start chats
- [ ] Check browser console for errors
- [ ] Test on mobile viewport

---

## Useful Commands

```bash
# Development
npm run dev

# Production build (local test)
npm run build && npm start

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy to Vercel
vercel --prod

# Deploy to Firebase
firebase deploy --only hosting
```
