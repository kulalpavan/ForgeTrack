# ForgeTrack Deployment Guide

ForgeTrack is ready for production. Follow these steps to deploy your application.

## 1. Environment Variables
Create a `.env` file in the `backend/` directory with the following keys:
- `MONGO_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A long, random string for token security.
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `NODE_ENV`: Set to `production`.
- `PORT`: (Optional) Defaults to 5000.

## 2. Build the Frontend
Navigate to the `frontend/` directory and run:
```bash
npm install
npm run build
```
This will create a `dist/` folder. The backend is configured to serve these files automatically when `NODE_ENV=production`.

## 3. Start the Backend
Navigate to the `backend/` directory and run:
```bash
npm install
npm start
```

## 4. Deployment Platforms
- **Heroku/Render/Railway**: Connect your repository, set the root directory to `backend`, and add a build command that runs `npm install && cd ../frontend && npm install && npm run build`.
- **VPS (Ubuntu/Nginx)**: Use `pm2` to manage the Node.js process and Nginx as a reverse proxy to port 5000.

---
**Production Optimizations Included:**
- Dynamic API routing (Relative paths).
- Single-server serving (Backend serves Frontend).
- SPA Routing support (Catch-all route).
- Removed debug logs and dev-only routes.
- Security-hardened auth flow.
