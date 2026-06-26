# ✈️ Paper Plane — Vendor Directory & Procurement Pipeline

Paper Plane is a professional, high-density Web platform engineered to streamline procurement, sourcing contracts, and tracking workflows for customized gifting fulfillment. It facilitates end-to-end partner management—from vendor onboarding and status management to purchase order issuance, deliveries, and payment reconciliation.

The application operates on a full-stack Node.js (Express + Vite) architecture with a hybrid database module, seamlessly switching between a lightweight **SQLite** instance and a resilient **MySQL** cluster.

---

## 🛠️ Key Capabilities

*   **Dual-Engine Persistence:** Default, portable **SQLite** driver with transparent query-level fallbacks and direct connection pooling support for **MySQL** databases.
*   **Supplier & Contract Directory:** Onboard, update, and manage verified sourcing partners, categories, specific net payment terms, contact details, and status overrides.
*   **Full Purchase Order (PO) Lifecycles:** Issue custom POs with structural multi-item drafts, advance and final payment schedules, and automated status transitions.
*   **Delivery & Transit Handshakes:** Log exact delivery dates, structural quantity/received state handshakes, and receipt details with cascading updates to PO states.
*   **Payment Ledger & Reconcilement:** Record down-payments and closing disbursements with distinct tracking IDs and payment methods (Bank, Cash, UPI, Card, Cheque).
*   **Procurement KPI Panel:** High-contrast, dynamic dashboard metrics highlighting total contracts, outstanding balances, active PO metrics, and delivery statistics.

---

## 📡 Dynamic Database Configuration

The platform contains a built-in query converter (`server/db.js`) that automatically overrides SQL dialects to match your storage layer. To toggle systems, modify your local environment variables.

### Environment Parameters (`.env`)

Create a local `.env` file at the root directory or configure these properties directly inside your environment settings:

```env
# Server Port Mapping (Exposed globally to port 3000)
PORT=3000

# Database Mode ('sqlite' or 'mysql')
DB_TYPE="sqlite"

# MySQL Host & Credential Setup (Only requested when DB_TYPE="mysql")
DB_HOST="localhost"
DB_PORT=3306
DB_USER="root"
DB_PASSWORD="your_password"
DB_NAME="paper_plane_db"
DB_SSL="false"
```

---

## 🚀 Running the Project

### 1. Verification and Initial Setup
Install the system module dependencies inside your development workspace:
```bash
npm install
```

### 2. Launch Local Development
Launch the Express backend server alongside Vite's modern asset middleware:
```bash
npm run dev
```

### 3. Production Build and Start
Bundle the React/Tailwind client application code and build the single, lightweight server entry point:
```bash
npm run build
npm start
```

---

## 📁 Architectural Layout Description

*   `server.js`: Standard server launcher, serving static React bundles and proxying local application APIs routing.
*   `server/db.js`: Database initialize wrapper, containing raw SQLite and `mysql2` connections, table schemas, and SQL compiler filters.
*   `server/routes.js`: Full REST API suite (User access control, Vendor updates, PO calculations, payment reconcilers).
*   `src/pages/`: Modular visual interfaces including the core **Dashboard**, **Vendors**, **PurchaseOrders**, **Payments**, **Deliveries**, and authentication login components.
