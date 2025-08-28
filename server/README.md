# Linko Backend (Express + Prisma)

## Local development

```bash
npm install
npx prisma generate
npm run dev
```

Create `.env` from `.env.example` and set:
- DATABASE_URL
- JWT_SECRET
- CLOUDINARY_* (for uploads)
- FRONTEND_ORIGIN (e.g., https://your-frontend-on-vercel.vercel.app)

Health check: `GET /api/health`

## Deploy on Render
- Build Command: `npm ci && npx prisma generate`
- Start Command: `node src/server.js`
- Env vars: see `.env.example`
- Health check path: `/api/health`

CORS is dynamic in `src/server.js` and allows `http://localhost:5173` and `FRONTEND_ORIGIN`.
