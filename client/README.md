# Linko Frontend (React + Vite)

## Local development

```bash
npm install
npm run dev
```

By default, the app calls the API at `http://localhost:3000/api`.
To point to a hosted backend, set `VITE_API_URL`.

Create `.env` based on `.env.example`:

```
VITE_API_URL=https://your-backend-on-render.onrender.com/api
```

## Deploy on Vercel

1. Import this repository in Vercel.
2. Project settings → Environment Variables:
   - `VITE_API_URL = https://<your-render-backend>/api`
3. Build command: default (Vercel auto-detects Vite)
4. Output: auto (Vercel handles Vite)

After the first deploy, copy your Vercel URL and add it on the backend as `FRONTEND_ORIGIN`.

## Tech

- React 19, Vite 7, React Router
- Axios base URL is configured in `src/api/http.js` using `VITE_API_URL` with localhost fallback.
