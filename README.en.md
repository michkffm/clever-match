# TanzMatch

[Deutsch](README.md) | **English**

[Live app](https://tanzmatch-web.onrender.com/)

TanzMatch is a full-stack app for finding dance partners through profiles, matching, and chat. The frontend and backend run on Render, with data stored in MongoDB Atlas.

![TanzMatch – desktop sign-in page](docs/tanzmatch-desktop.png)

## Features

- Registration, sign-in, and individual guest access
- Profile editing and dance partner discovery
- Likes, mutual matches, and chat
- Events and event registration
- Private profiles and user blocking
- German and English interface, light and dark themes
- Keyboard navigation, visible focus indicators, larger text, and reduced motion

## Mobile view

<img src="docs/tanzmatch-mobile.png" alt="TanzMatch – sign-in page on a smartphone" width="390">

The screenshots show the published German sign-in page at the time they were captured. The interface continues to evolve.

## Development status

TanzMatch remains free. Password reset through Resend and notification improvements are still in progress. There are no paid subscriptions. Some advanced screens still contain incomplete features or translations. Existing frontend lint issues are being addressed separately. A complete WCAG conformance assessment has not been performed.

## Run locally

Requirements: Node.js 22, npm, and an accessible MongoDB database.

```bash
git clone https://github.com/michkffm/tanzmatch.git
cd tanzmatch
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run build -w packages/types
npm run dev:all
```

Before starting, enter your MongoDB URI and a random JWT secret of at least 32 characters in `backend/.env`. Never commit real credentials.

Frontend: `http://localhost:5173` · API: `http://localhost:5000/api`

## Check and build

```bash
npm run type-check
npm run lint
npm run test:e2e
npm run build
npm run start:backend
```

The production build compiles the shared types first, followed by the frontend and backend. Browser checks start a local frontend test server. `npm run lint` currently reports existing frontend issues.

## Technologies and structure

| Area | Technologies / directory |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand · `frontend/` |
| Backend | Node.js, Express, Mongoose, WebSocket · `backend/` |
| Database | MongoDB Atlas |
| Shared types | TypeScript · `packages/types/` |
| Browser checks | Playwright · `e2e/` |
| Deployment | Render Blueprint · `render.yaml` |

## Configuration and deployment

Required variables are documented without secret values in `backend/.env.example` and `frontend/.env.example`. `render.yaml` defines the API and static frontend.

- `MONGODB_URI`: MongoDB connection; store it as a secret on Render
- `JWT_SECRET`: random signing key for session tokens
- `CORS_ORIGIN`: allowed frontend origin
- `VITE_API_HOST` or `VITE_API_URL`: backend address used by the frontend
- `CLOUDINARY_URL`: required for profile photo uploads
- `ENABLE_DEMO_SEED`: only for explicitly enabled local demo data

Password reset stays disabled until an email delivery service has been configured securely. Secrets are stored only locally or in the hosting service.

## Security and privacy

Public profiles do not expose email addresses or exact coordinates. Access tokens are short-lived and held only in browser memory. Chat access requires an active mutual match. Local `.env` files, dependencies, and build output are excluded from Git.

## Author

Michael Koch · [GitHub](https://github.com/michkffm) · [Portfolio](https://michael-koch-portfolio.vercel.app/)
