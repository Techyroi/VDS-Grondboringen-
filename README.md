# VDS Business System — Starter

This starter keeps the existing VDS Grondboringen HTML/CSS/JS website and adds:
- Express backend
- MongoDB lead storage
- Private CRM login
- Lead list, lead details, and status updates
- Website form submission to the backend

## Requirements
- Node.js 20+ recommended
- A MongoDB connection string (local MongoDB or MongoDB Atlas)

## 1. Install dependencies
Open a terminal in `backend/` and run:

```bash
npm install
```

## 2. Configure environment
Copy `.env.example` to `.env`, then set:
- `MONGODB_URI`
- `SESSION_SECRET` to a long random secret
- `CRM_USERNAME`
- `CRM_PASSWORD` to a strong password

Never commit `.env` to GitHub.

## 3. Start the server
From `backend/`:

```bash
npm run dev
```

Open:
- Website: http://localhost:5000
- CRM: http://localhost:5000/crm

## Notes
- This is a local development starter, not a production deployment.
- Before production, configure HTTPS, secure cookie settings, backups, privacy/legal notices, and hosting-specific session storage.
- The website's existing marketing content contains placeholders. Replace them with verified business details before launch.
