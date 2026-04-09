<div align="center">
  <img src="logo.png" alt="TrustPay Logo" height="150" />
</div>

# TrustPay — India's Payment Trust Layer
A production-ready Indian fintech platform where users generate cryptographic QR payment proofs and merchants verify them instantly — eliminating fake payment scams.

---

## 🗂 Project Structure

```
/Anti gravity
  /frontend          ← React + Vite + Tailwind CSS
    /src
      /components
      /pages
      /utils
        api.js       ← all backend API calls
  /backend           ← Node.js + Express + MongoDB
    /models
      User.js
      Payment.js
      FamilyAlert.js
    /routes
      auth.js
      payments.js
      analytics.js
      family.js
    server.js
    seed.js          ← auto-seeds demo data on first run
    .env             ← YOUR secrets (not committed)
  .env.example       ← template for others
  .gitignore
  README.md
```

---

## ⚙️ Setup — Step by Step

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_FRIEND/REPO_NAME.git
cd REPO_NAME
```

---

### 2. Set up MongoDB Atlas (Free Tier)

> Skip this if you have a local MongoDB running.

1. Go to **https://cloud.mongodb.com** and create a free account
2. Click **"Build a Cluster"** → choose **Free (M0 Sandbox)** → pick any region → Create
3. Wait ~2 minutes for the cluster to provision
4. Click **"Database Access"** → **Add New Database User**
   - Username: `trustpay` | Password: choose a strong one | Role: **Read and write to any database**
5. Click **"Network Access"** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm
6. Click **"Connect"** → **Connect your application** → copy the connection string

It looks like:
```
mongodb+srv://trustpay:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with your real password and add `trustpay` as the database name:
```
mongodb+srv://trustpay:YOURPASSWORD@cluster0.abcde.mongodb.net/trustpay?retryWrites=true&w=majority
```

---

### 3. Configure the backend `.env`

```bash
cd backend
cp ../.env.example .env
```

Open `backend/.env` and paste your connection string:

```
MONGO_URI=mongodb+srv://trustpay:YOURPASSWORD@cluster0.abcde.mongodb.net/trustpay?retryWrites=true&w=majority
PORT=5000
```

---

### 4. Install backend dependencies

```bash
cd backend
npm install
```

---

### 5. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

### 6. Run the backend

```bash
cd backend
node server.js
```

You should see:
```
✅ Connected to MongoDB
🌱 Seeded 10 demo payments into MongoDB.
🚀 TrustPay backend running → http://localhost:5000
```

> On the **second run**, seeding is skipped since data already exists.

---

### 7. Run the frontend

Open a **second terminal**:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🎯 Features

| Feature | Description |
|---|---|
| **Auth** | Sign up as Customer or Merchant — stored in MongoDB |
| **QR Proof** | User generates a payment proof — saved as `Payment` in DB |
| **QR Scan** | Merchant scans the proof — status updated to `verified` in DB |
| **Smart Match** | Merchant verifies by amount + 60-second window |
| **Analytics** | Rich dashboard with bar chart, status breakdown, PDF report |
| **Scam Checker** | Keyword-based SMS scanner |
| **Safe Mode** | Elderly users — payments > ₹2,000 require family approval |
| **Family Portal** | Open `/family` on another device — approve/reject in real time |
| **Dark Mode** | Persisted to `localStorage` |

---

## 🔗 Key Routes

### Frontend
| URL | Page |
|---|---|
| `http://localhost:5173/` | Dashboard (User / Merchant) |
| `http://localhost:5173/safe` | Safe Mode (User only) |
| `http://localhost:5173/analytics` | Analytics (Merchant only) |
| `http://localhost:5173/family` | Family portal (no login needed) |

### Backend API
| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/payments` | Get all payments |
| POST | `/api/payments/generate-qr` | Generate QR proof |
| POST | `/api/payments/scan-qr` | Verify QR |
| POST | `/api/payments/match` | Smart match |
| POST | `/api/payments/scam-check` | Scam keyword check |
| GET | `/api/analytics` | Metrics + chart data |
| POST | `/api/family/request` | Submit family approval |
| GET | `/api/family/pending` | Get pending alert |
| POST | `/api/family/approve` | Approve payment |
| POST | `/api/family/reject` | Reject payment |
| GET | `/api/health` | Server health check |

---

## 🛠 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express, Mongoose, dotenv, qrcode
- **Database**: MongoDB (Atlas or local)
