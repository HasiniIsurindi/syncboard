# Deploying SyncBoard

SyncBoard has two independently deployable pieces. Deploy the backend
first, since the frontend needs its live URL.

Why two separate services? The backend holds long-lived WebSocket
connections (Socket.IO), which needs a server that stays running —
that rules out purely serverless platforms like Vercel for it. The
frontend is a normal Next.js app, which Vercel is built for.

---

## 1. Push to GitHub

```bash
cd syncboard
git init
git add .
git commit -m "Initial commit: SyncBoard"
git branch -M main
git remote add origin https://github.com/<your-username>/syncboard.git
git push -u origin main
```

---

## 2. Deploy the backend (Render)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo, and set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free is fine to start
3. Add environment variables:
   - `CLIENT_URL` → you'll fill this in after step 3 (your Vercel URL)
   - `PORT` → Render sets this automatically, you can leave it out
4. Deploy. Note the URL Render gives you, e.g.
   `https://syncboard-server.onrender.com`

   > Railway works the same way if you prefer it — root directory
   > `server`, build `npm install`, start `npm start`.

   > **Free tier note:** Render's free web services spin down after
   > inactivity and take ~30–50s to wake up on the next request. Fine
   > for a portfolio demo; upgrade to a paid instance if you want it
   > always warm.

---

## 3. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import the same GitHub repo, and set:
   - **Root Directory:** `client`
   - Framework preset: Next.js (auto-detected)
3. Add an environment variable:
   - `NEXT_PUBLIC_SERVER_URL` → your Render backend URL from step 2,
     e.g. `https://syncboard-server.onrender.com`
4. Deploy. Vercel gives you a URL like `https://syncboard.vercel.app`

---

## 4. Connect the two

Go back to Render, open your backend service's environment variables,
and set:

```
CLIENT_URL=https://syncboard.vercel.app
```

(This is what the backend uses for CORS — it only accepts Socket.IO
connections from this origin.) Redeploy the backend for it to take
effect.

---

## 5. Add a custom domain

**On Vercel (for the frontend, e.g. `syncboard.yourdomain.com`):**
1. Project → Settings → Domains → add your domain
2. Vercel shows you a DNS record (usually a `CNAME` to `cname.vercel-dns.com`)
3. Add that record at your domain registrar (Namecheap, GoDaddy, etc.)
4. Wait for DNS to propagate (~minutes to a few hours)

**On Render (optional, for a custom API subdomain like `api.yourdomain.com`):**
1. Service → Settings → Custom Domain → add it
2. Add the `CNAME` record Render gives you at your registrar
3. Update `NEXT_PUBLIC_SERVER_URL` on Vercel to the new domain, and
   `CLIENT_URL` on Render to your final frontend domain

---

## 6. Verify it's live

Open your domain in two different browsers (or one normal + one
incognito window), join the same room code, and draw in one — it
should appear in the other within a fraction of a second.

## Troubleshooting

- **Drawing doesn't sync / console shows CORS errors** — double check
  `CLIENT_URL` on the backend exactly matches your frontend's URL
  (including `https://`, no trailing slash).
- **Socket won't connect at all** — confirm `NEXT_PUBLIC_SERVER_URL` on
  Vercel points at the backend and that you redeployed the frontend
  after adding/changing it (env vars only apply on the next build).
- **Works locally but not live** — Render's free tier sleeps when idle;
  the first request after a while will be slow while it wakes up.
