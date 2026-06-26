# Paper Plane Procurement System - Production Deployment Guide

This guide describes how to configure, run, and self-host the full-stack **Vendor Purchase Order & Payment Management System** for Paper Plane Gifting.

---

## 1. Reorganized Folder Structure

The project has been reorganized into a neat full-stack structure for high security, clarity, and independent deployability:

```text
├── backend/                     # Express.js REST API Backend
│   ├── config/                  # DB configuration (MySQL & AlaSQL fallbacks)
│   ├── controllers/             # Request handlers (PO, vendors, auth, reports)
│   ├── middleware/              # Auth validator & Global error handlers
│   ├── routes/                  # API routing declarations
│   ├── services/                # Background update notifications
│   ├── app.js                   # Express app declaration
│   ├── server.js                # Server start routine & Vite middleware mount
│   └── package.json             # Backend stand-alone packages list
│
├── database/                    # SQL Database Initializer Files
│   ├── schema.sql               # Core DDL tables schema statements
│   └── seed.sql                 # Default demo seeding transaction
│
├── docs/                        # Complete System Documentation
│   ├── DEPLOYMENT.md            # [This File] Production Deployment Guide
│   ├── TEST_CASES.md            # Quality-assurance user journey validation suite
│   ├── TEST_CASES_DAY13.md      # Additional operational test matrices
│   └── postman_collection.json  # Postman testing files for rapid API verification
│
├── frontend/                    # Vite + React Client Application
│   └── src/
│       ├── assets/              # Static vectors and branding (SaaS logo)
│       ├── components/          # Reusable view cards, status pills & modals
│       ├── pages/               # Functional modules (Vendors, POs, Payments, etc.)
│       ├── services/            # Axios instance connecting API endpoints
│       ├── App.jsx              # App shell, configuration and custom routes
│       ├── index.css            # Tailwind global CSS setup
│       └── main.jsx             # React DOM launcher
│
├── public/                      # Static client assets (Favicons & Web App Manifest)
├── .env.example                 # Standard blueprint environment file
├── vercel.json                  # Automated configuration for Vercel frontend routing
├── render.yaml                  # Infrastructure-as-code configuration for Render hosting
├── vite.config.js               # Vite configurations with import aliases
└── package.json                 # Monorepo/Root package configurations, build & dev commands
```

---

## 2. Environment Variables Configuration (`.env`)

Create a `.env` file in the project's root folder (or register these keys in your hosting provider's panel):

```env
# Database Credentials (e.g., Aiven MySQL or Amazon RDS)
DB_HOST=your-mysql-hostname.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-secure-mysql-password
DB_NAME=vendor_po_management
DB_SSL=true

# Authentication Security keys
JWT_SECRET=PaperPlane_ProductionSecretKey_2026!

# Nodemailer alerts (automatically logs emails to the console if SMTP configurations are left blank)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME="Paper Plane Procurement Alerts"
SMTP_FROM_EMAIL=no-reply@paperplane.com
```

---

## 3. Database Architecture (Aiven MySQL Integration)

Our Express engine (`/backend/config/db.js`) is designed with dual-engine flexibility:
1. **Production Mode (MySQL)**: Connects to your managed MySQL database (such as Aiven MySQL) with connection pooling and secure SSL handshakes. On boot, the server parses and executes migration tables automatically.
2. **Local Sandbox Fallback (AlaSQL + Disk-persisted state)**: If no database configurations are registered, the system initializes an in-memory SQL compilation database (`AlaSQL`) and automatically outputs a persistent cache file `database_persisted.json` inside the root tree to prevent user data loss during preview sessions.

### Default Seed Account
Upon initial boot, the user table automatically registers the primary administrative user:
- **Email**: `edharanagasaimanohar@gmail.com`
- **Default Password**: `PaperPlane@2026`

*(Important: Change your password under Settings immediately after logging in for high security.)*

---

## 4. Multi-Platform Deployment Guides

### A. Deploying the Backend on Render
Using our pre-configured `render.yaml` file, deploying on Render is seamless:

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the **Render Dashboard** and select **Blueprints**.
3. Link your Git repository and click **Connect**.
4. Render will read `render.yaml` and discover your backend service.
5. In the Render environment configuration page:
   - Provide your Production values for `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET`.
6. Click **Deploy**. The backend service will build, initialize database schemas, and expose a global web service URL (e.g. `https://paper-plane-backend.onrender.com`).

---

### B. Deploying the Frontend on Vercel
Vercel is optimization-built for React/Vite SPAs. Deploying with our custom rule schema:

1. Sign in to your **Vercel Dashboard** and click **Add New > Project**.
2. Select your git repository.
3. In the framework configurations, Vercel automatically detects **Vite**.
4. In **Root Directory**, keep it as `/` (root) since we build using our workspace layout.
5. Set the **Build Command** to: `npm run build`
6. Set the **Output Directory** to: `dist`
7. Add the environment variables:
   - `NODE_ENV=production`
8. Under root `/vercel.json` we have configured the redirect rewrites. Change the backend URL proxy rule (if needed) or rely on dynamic proxy configurations.
9. Click **Deploy**. Your React application will compile, deploy onto edge content networks, and serve routes without 404 navigation errors.

---

## 5. Development and Production Launch Commands

### Local Development Mode
```bash
npm install
npm run dev
```
Runs Express server and Vite Hot Module Middleware concurrently on port 3000.

### Production Build & Launch
```bash
npm run build
npm start
```
1. **Frontend Compilation**: Builds React components into optimized, compressed static code at `dist/`.
2. **Backend Bundling**: Compiles complex server code into a single, self-contained CommonJS file (`dist/server.cjs`) using `esbuild`. 
3. **Execution**: Starts the production system utilizing Node fast execution.
