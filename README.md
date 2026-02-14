# Anonymous Chat App

A safe, anonymous chat application built with Next.js, Firebase, and Gemini AI.

## 🚀 Deploy to Vercel

This project is optimized for deployment on [Vercel](https://vercel.com).

### Prerequisites

1.  **Firebase Project:** You need a Firebase project with Authentication (Anonymous + Email/Pass) and Firestore enabled.
2.  **Gemini API Key:** Get a free API key from [Google AI Studio](https://aistudio.google.com/).

### Deployment Steps

1.  **Push to GitHub:** Push this repository to your GitHub account.
2.  **Import to Vercel:**
    *   Go to [Vercel Dashboard](https://vercel.com/new).
    *   Import your repository.
3.  **Environment Variables:**
    Add the following variables in the Vercel Project Settings (copy from your `.env.local`):

    ```env
    # Firebase Configuration (Required)
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...

    # AI Moderation (Required for Safe Mode)
    GEMINI_API_KEY=...

    # Admin Access (Optional)
    NEXT_PUBLIC_ADMIN_UIDS=uid1,uid2
    ```

4.  **Deploy:** Click "Deploy". Vercel will detect Next.js and build the application automatically.

## Features

*   **Anonymous Chat:** One-click automated matchmaking.
*   **Safe Mode:** Real-time AI moderation using Gemini Flash.
*   **Persistent Accounts:** Optional username/password login to save friends.
*   **Admin Dashboard:** Ban users, view reports, and monitor stats.
*   **PWA Ready:** Mobile-responsive design.
