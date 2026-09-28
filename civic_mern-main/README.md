# CivicPulse (Civic MERN Application)

CivicPulse is a full-stack MERN application empowering citizens to report local civic issues (potholes, sanitation, street lighting) and submit consumer & food safety violations in their area.

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Axios, React Router v7, Lucide React
- **Backend:** Node.js, Express 5, MongoDB / Mongoose, JWT, bcryptjs, Helmet, Express-Rate-Limit, Express-Validator, CORS

---

## Project Structure

```text
├── backend/
│   ├── controllers/      # Route controllers (auth, issue, complaint)
│   ├── middleware/       # Auth, validation, async handler, error handling
│   ├── models/           # Mongoose schemas (User, CivicIssue, ConsumerComplaint)
│   ├── routes/           # Express route definitions
│   ├── .env.example      # Environment variable template
│   └── server.js         # Express app entry point
├── frontend/
│   ├── src/
│   │   ├── api/          # Shared Axios client configuration
│   │   ├── components/   # UI components (Navbar, etc.)
│   │   └── pages/        # Application views (Issues, Complaints, Login, Register)
│   ├── index.html
│   └── vite.config.js
└── README.md
```

---

## Prerequisites

- **Node.js** (v18.0.0 or higher recommended)
- **MongoDB** (Local instance or MongoDB Atlas cluster URI)

---

## Environment Variables Configuration

Create a `.env` file in the `backend/` directory using the template below.

> **Important:** Never commit production credentials to version control. Use placeholders when sharing configuration.

### `backend/.env`

```env
# Server Port
PORT=5000

# MongoDB Connection String (Atlas or Local)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/civicpulse?retryWrites=true&w=majority

# Secret key for signing JSON Web Tokens
JWT_SECRET=your_jwt_secret_key_here

# Allowed Frontend Origins for CORS (comma-separated if multiple)
CORS_ORIGIN=http://localhost:5173
```

---

## Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start server
node server.js
```

The backend server runs on `http://localhost:5000` (or specified `PORT`).  
When running successfully, the console will log:
```text
MongoDB Connected Successfully!
Server running on port 5000
```

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application runs on `http://localhost:5173`.

---

## Key Backend Features & Security

- **Input Validation (`express-validator`):** Strict field-level validation and sanitization for all `POST` and `PUT` endpoints (`/api/auth/register`, `/api/auth/login`, `/api/issues`, `/api/issues/:id/upvote`, `/api/complaints`).
- **Security Headers (`helmet`):** Configures HTTP security response headers to safeguard against common web vulnerabilities.
- **Brute Force Protection (`express-rate-limit`):** Limits repeated requests to authentication endpoints (`/api/auth/*`).
- **Environment-Driven CORS:** Restricts incoming requests to origins declared in `CORS_ORIGIN` (defaults to `http://localhost:5173`).
- **Centralized Error Handling:** All async controllers are wrapped with an `asyncHandler` helper that guarantees unhandled rejections pass to the global error middleware alongside custom 404 route handling.
- **Health Check Endpoint:** `GET /api/health` returns `{ "status": "ok", "db": <readyState> }`.

---

## API Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System and database health status |
| `POST` | `/api/auth/register` | Public | Register a new user (strictly defaults role to citizen) |
| `POST` | `/api/auth/login` | Public | Login and obtain JWT token |
| `PATCH` | `/api/auth/users/:id/role` | `super_admin` | Promote/change user role and assign department |
| `POST` | `/api/admin/workers` | `super_admin` | Provision municipal field worker directly |
| `GET` | `/api/issues` | Public | List civic issues (filters: `pincode`, `category`, `status`, `department`, `assignedWorker`) |
| `POST` | `/api/issues` | Authenticated | Report a new civic issue (auto-maps category to department) |
| `PUT` | `/api/issues/:id/upvote` | Authenticated | Upvote a reported civic issue |
| `PUT` | `/api/issues/:id/status` | `dept_admin`, `super_admin` | Update issue status and priority with audit history |
| `PATCH` | `/api/issues/:id/assign` | `dept_admin`, `super_admin` | Assign worker to issue (appends to statusHistory) |
| `PUT` | `/api/issues/:id/resolve` | `worker`, `dept_admin`, `super_admin` | Resolve issue with uploaded proof photo |
| `GET` | `/api/issues/stats` | `dept_admin`, `super_admin` | Civic issues metrics aggregation |
| `GET` | `/api/complaints` | Authenticated | View consumer / food safety complaints |
| `POST` | `/api/complaints` | Authenticated | Submit a consumer safety violation report |
| `PUT` | `/api/complaints/:id/status` | `dept_admin`, `super_admin` | Update consumer complaint status |
| `GET` | `/api/complaints/stats` | `dept_admin`, `super_admin` | Consumer complaints metrics aggregation |
