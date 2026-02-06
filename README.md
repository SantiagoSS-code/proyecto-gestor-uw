# landingpagedesign21

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/santiagonicsanchez-8058s-projects/v0-landingpagedesign21)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/8Zj6WLxOOM5)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/santiagonicsanchez-8058s-projects/v0-landingpagedesign21](https://vercel.com/santiagonicsanchez-8058s-projects/v0-landingpagedesign21)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/8Zj6WLxOOM5](https://v0.app/chat/8Zj6WLxOOM5)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Backoffice (Platform Admin)

- UI lives at `/backoffice`.
- Access is restricted server-side in [app/backoffice/layout.tsx](app/backoffice/layout.tsx) using the `__session` cookie.
- Admin allowlist is configured via `PLATFORM_ADMIN_EMAILS` (comma-separated).

### Required env vars

- See [.env.example](.env.example) for Firebase client + Admin SDK env vars.

### Notes

- On login, the app calls `/api/auth/session` to store the Firebase ID token in an HTTP-only `__session` cookie.
- The cookie is short-lived (ID token TTL). If you want long-lived sessions, we can switch to Firebase session cookies.

## Local dev: fix `auth/user-not-found`

If you have `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, you are signing into the Auth *emulator* (not production). Any existing production users will appear as “user not found” until you create them in the emulator.

Two options:

1) Create users in the Emulator UI: `http://127.0.0.1:4000/auth`
2) Use the dev bootstrap endpoint (also seeds Firestore role + center docs):


	`curl -X POST http://localhost:3000/api/dev/bootstrap-user \
		-H 'content-type: application/json' \
		-H 'x-dev-bootstrap-token: YOUR_TOKEN' \
		-d '{"email":"santiagonicsanchez@gmail.com","password":"Courtly123!","role":"platform_admin"}'`


	`curl -X POST http://localhost:3000/api/dev/bootstrap-user \
		-H 'content-type: application/json' \
		-H 'x-dev-bootstrap-token: YOUR_TOKEN' \
		-d '{"email":"santisanchez301@gmail.com","password":"Courtly123!","role":"center_admin","centerName":"Santi Center"}'`
