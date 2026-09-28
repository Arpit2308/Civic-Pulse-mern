# CivicPulse Backend API Documentation

Backend service for **CivicPulse**, built with Node.js, Express 5, MongoDB / Mongoose 9, JWT authentication, and CommonJS modules.

---

## 1. User Roles & RBAC (Role-Based Access Control)

CivicPulse supports four distinct user roles:

| Role | Description | Capabilities |
| :--- | :--- | :--- |
| `citizen` | Default public citizen user | Report issues, upvote issues, submit and view own consumer complaints. |
| `worker` | Municipal field service worker | View assigned civic issues, resolve assigned issues by uploading proof photos. |
| `dept_admin` | Department administrator | View issues & stats, assign workers, update issue status & priority. |
| `super_admin` | Global platform administrator | Full system access: promote user roles, provision workers, manage all issues/complaints. |

### Role Security Guarantee
- **Public Registration (`POST /api/auth/register`)**: Always forces `role: 'citizen'`. Any `role` field submitted in the request body is strictly ignored.
- **Worker Provisioning (`POST /api/admin/workers`)**: Accessible exclusively to `super_admin`.
- **Role Promotion (`PATCH /api/auth/users/:id/role`)**: Accessible exclusively to `super_admin`.

---

## 2. Department Model & Mapping Logic

Civic issues and municipal staff are organized under the following `department` enum:
- `Roads & Potholes`
- `Sanitation & Garbage`
- `Street Lighting`
- `Water Supply`
- `General` *(Non-null fallback catch-all)*

### Automatic Category-to-Department Mapping
When an issue is reported via `POST /api/issues`, its `category` is automatically mapped to a designated department:

| Issue Category | Mapped Department |
| :--- | :--- |
| `Roads`, `Roads & Potholes` | `Roads & Potholes` |
| `Garbage`, `Sanitation & Garbage` | `Sanitation & Garbage` |
| `Street Lighting`, `Lighting`, `Electricity` | `Street Lighting` |
| `Water`, `Water Supply` | `Water Supply` |
| `Other` (or unmapped categories) | **`General`** |

> **Note:** The department is guaranteed to be a valid non-null string. The `General` department serves as the default catch-all for uncategorized or "Other" issues.

---

## 3. Civic Issue Lifecycle & Audit History

### Initial Creation
Every new issue is initialized with:
- `status`: `'Reported'`
- `statusHistory`: Contains an initial entry recording creation:
  ```json
  {
    "status": "Reported",
    "changedBy": "<userId>",
    "changedAt": "<timestamp>",
    "comment": "Issue reported"
  }
  ```

### Worker Assignment Workflow
- Endpoint: `PATCH /api/issues/:id/assign`
- Access: `dept_admin`, `super_admin`
- Payload: `{ "workerId": "<userId>", "comment": "Optional assignment note" }`
- **Behavior**:
  - Validates that the target user exists and has `role === 'worker'`.
  - Sets `assignedWorker = workerId`.
  - Appends an assignment record to `statusHistory`.
  - **Does NOT auto-transition status**: The issue's current status (e.g. `'Reported'`) is preserved.

### Status Update Workflow
- Endpoint: `PUT /api/issues/:id/status`
- Access: `dept_admin`, `super_admin`
- Payload: `{ "status": "In Progress" | "Resolved" | "Rejected", "priority": "Low" | "Medium" | "High", "comment": "Note" }`
- **Behavior**: Appends a new status entry to `statusHistory` whenever status changes.

### Resolution Workflow with Proof Photo
- Endpoint: `PUT /api/issues/:id/resolve`
- Access: `worker`, `dept_admin`, `super_admin`
- Content-Type: `multipart/form-data`
- Fields:
  - `proofImage` (File, required/optional): JPEG, PNG, WEBP up to 5MB. Verified using both extension and magic-byte inspection (prevents spoofed binary payloads).
  - `notes` or `comment` (String): Resolution explanation notes.
- **Behavior**:
  - Sets `status = 'Resolved'`.
  - Populates `resolutionDetails`:
    ```json
    {
      "resolvedAt": "2026-09-27T...",
      "resolvedBy": "<userId>",
      "proofImageUrl": "/uploads/proof-12345.png",
      "notes": "Pothole asphalt patched and sealed"
    }
    ```
  - Appends `status: 'Resolved'` entry to `statusHistory`.

---

## 4. Complete API Reference

### Authentication & User Management

#### 1. Register Citizen
- **Method / Path:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "user": {
      "id": "67a...",
      "name": "Jane Citizen",
      "email": "jane@example.com",
      "role": "citizen"
    },
    "token": "eyJhbGci..."
  }
  ```

#### 2. Login
- **Method / Path:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "67a...",
      "name": "Jane Citizen",
      "email": "jane@example.com",
      "role": "citizen",
      "department": null
    },
    "token": "eyJhbGci..."
  }
  ```

#### 3. Update User Role & Department (Super Admin Only)
- **Method / Path:** `PATCH /api/auth/users/:id/role`
- **Access:** `super_admin`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "role": "worker",
    "department": "Roads & Potholes"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "User role updated successfully",
    "user": {
      "id": "67a...",
      "name": "Jane Citizen",
      "email": "jane@example.com",
      "role": "worker",
      "department": "Roads & Potholes"
    }
  }
  ```

---

### Admin Worker Provisioning

#### 4. Create Worker Directly
- **Method / Path:** `POST /api/admin/workers`
- **Access:** `super_admin`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "John Worker",
    "email": "worker@example.com",
    "password": "Password123",
    "department": "Sanitation & Garbage",
    "phone": "9876543210",
    "pincode": "560001"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Worker created successfully",
    "user": {
      "id": "67a...",
      "name": "John Worker",
      "email": "worker@example.com",
      "role": "worker",
      "department": "Sanitation & Garbage"
    }
  }
  ```

---

### Civic Issues Endpoints

#### 5. List Civic Issues (Public View with Filters)
- **Method / Path:** `GET /api/issues`
- **Access:** Public
- **Query Parameters:**
  - `pincode`: Filter by area pincode (e.g. `560001`)
  - `category`: Filter by category (e.g. `Roads & Potholes`)
  - `status`: Filter by status (`Reported`, `In Progress`, `Resolved`, `Rejected`)
  - `department`: Filter by department (e.g. `General`, `Roads & Potholes`)
  - `assignedWorker`: Filter by assigned worker ObjectId
- **Response (200 OK):** Array of populated issue objects (with `reportedBy` and `assignedWorker`).

#### 6. Create Civic Issue
- **Method / Path:** `POST /api/issues`
- **Access:** Authenticated (`citizen`, `dept_admin`, `super_admin`, `worker`)
- **Headers:** `Authorization: Bearer <token>`
- **Content-Type:** `multipart/form-data` or `application/json`
- **Fields / Body:**
  ```json
  {
    "title": "Broken storm drain",
    "description": "Drain cover missing near park entrance",
    "category": "Roads",
    "pincode": "560001",
    "address": "123 Main St",
    "image": "<File optional>"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "_id": "67b...",
    "title": "Broken storm drain",
    "description": "Drain cover missing near park entrance",
    "category": "Roads & Potholes",
    "department": "Roads & Potholes",
    "location": {
      "address": "123 Main St",
      "pincode": "560001"
    },
    "imageUrl": "/uploads/image-123.jpg",
    "status": "Reported",
    "priority": "Medium",
    "reportedBy": {
      "_id": "67a...",
      "name": "Jane Citizen",
      "email": "jane@example.com"
    },
    "assignedWorker": null,
    "statusHistory": [
      {
        "status": "Reported",
        "changedBy": "67a...",
        "changedAt": "2026-09-27T...",
        "comment": "Issue reported"
      }
    ],
    "resolutionDetails": {
      "resolvedAt": null,
      "resolvedBy": null,
      "proofImageUrl": "",
      "notes": ""
    },
    "upvotes": [],
    "createdAt": "2026-09-27T...",
    "updatedAt": "2026-09-27T..."
  }
  ```

#### 7. Upvote Issue
- **Method / Path:** `PUT /api/issues/:id/upvote`
- **Access:** Authenticated
- **Response (200 OK):**
  ```json
  {
    "message": "Upvoted successfully",
    "upvotes": 5
  }
  ```

#### 8. Update Issue Status & Priority
- **Method / Path:** `PUT /api/issues/:id/status`
- **Access:** `dept_admin`, `super_admin`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "status": "In Progress",
    "priority": "High",
    "comment": "Crew dispatched to inspect"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Issue status updated successfully",
    "issue": { "...updated issue document with populated statusHistory..." }
  }
  ```

#### 9. Assign Worker to Issue
- **Method / Path:** `PATCH /api/issues/:id/assign`
- **Access:** `dept_admin`, `super_admin`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "workerId": "67a...",
    "comment": "Assigning to Ward 4 road crew"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Worker assigned successfully",
    "issue": {
      "_id": "67b...",
      "title": "Broken storm drain",
      "status": "Reported",
      "assignedWorker": {
        "_id": "67a...",
        "name": "John Worker",
        "email": "worker@example.com",
        "role": "worker",
        "department": "Roads & Potholes"
      },
      "statusHistory": [
        {
          "status": "Reported",
          "comment": "Issue reported"
        },
        {
          "status": "Reported",
          "changedBy": { "name": "Admin User", "role": "dept_admin" },
          "comment": "Assigning to Ward 4 road crew"
        }
      ]
    }
  }
  ```

#### 10. Resolve Issue with Proof Photo
- **Method / Path:** `PUT /api/issues/:id/resolve`
- **Access:** `worker`, `dept_admin`, `super_admin`
- **Headers:** `Authorization: Bearer <token>`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `proofImage`: Image file (PNG, JPG, WEBP)
  - `notes`: String (e.g. `"Pothole asphalt patched and sealed"`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Issue resolved successfully",
    "issue": {
      "_id": "67b...",
      "status": "Resolved",
      "resolutionDetails": {
        "resolvedAt": "2026-09-27T...",
        "resolvedBy": {
          "_id": "67a...",
          "name": "John Worker",
          "email": "worker@example.com",
          "role": "worker"
        },
        "proofImageUrl": "/uploads/proof-12345.png",
        "notes": "Pothole asphalt patched and sealed"
      },
      "statusHistory": [
        { "status": "Reported", "comment": "Issue reported" },
        { "status": "Resolved", "comment": "Resolved: Pothole asphalt patched and sealed" }
      ]
    }
  }
  ```

#### 11. Issue Aggregation Statistics
- **Method / Path:** `GET /api/issues/stats`
- **Access:** `dept_admin`, `super_admin`
- **Response (200 OK):** Aggregated metrics by category, status, priority, and category-status combinations.

---

## 5. Consumer Complaints Endpoints (Unmodified)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/complaints` | Authenticated | File consumer complaint (supports proof image upload) |
| `GET` | `/api/complaints` | Authenticated | Citizens see own complaints; admins see all complaints |
| `PUT` | `/api/complaints/:id/status` | `dept_admin`, `super_admin` | Update complaint status (`Submitted`, `Under Review`, `Escalated`, `Resolved`, `Rejected`) |
| `GET` | `/api/complaints/stats` | `dept_admin`, `super_admin` | Complaint metrics aggregation |
