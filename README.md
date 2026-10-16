# WorkSphere – HR Management System (HRMS)

## Overview

WorkSphere is a full-stack Human Resource Management System built to simplify employee administration and HR operations. It provides role-based access for employees, HR personnel, and administrators, with modules for attendance, leave management, payroll, analytics, and notifications.

## Features

- **Authentication & Authorization:** User registration, JWT login, password hashing, and role-based access control.
- **Employee Management:** Manage employee profiles and details.
- **Attendance Management:** Record attendance and view attendance history.
- **Leave Management:** Apply for leave, track requests, and approve or reject requests based on user permissions.
- **Payroll Management:** Manage salary records and view payroll details.
- **Dashboard & Analytics:** View HR statistics and management summaries.
- **Notifications:** View notifications and track read/unread status.
- **Admin Management:** View user accounts and manage user roles with administrator permissions.

## Technology Stack

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite
- JWT authentication

**Frontend**
- React
- Vite
- React Router
- Axios
- JavaScript
- CSS

## Project Structure

```text
WorkSphere/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── routes/
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.10 or later
- Node.js and npm
- Git

## Backend Setup

Open a terminal in the project root and run:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory using `.env.example` as a template. Configure your secret key and database URL before starting the application.

Start the backend:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend URL: http://127.0.0.1:8000

Interactive API documentation: http://127.0.0.1:8000/docs

Health check: http://127.0.0.1:8000/health

## Frontend Setup

Open another terminal from the project root:

```powershell
cd frontend
npm install
npm.cmd run dev
```

Frontend URL: http://localhost:5173

To create a production build:

```powershell
npm.cmd run build
```

To run lint checks:

```powershell
npm.cmd run lint
```

## User Roles

| Role | Access |
|---|---|
| EMPLOYEE | Employee-facing HR features permitted to the employee |
| HR | HR management operations permitted to HR users |
| ADMIN | Administrative user and role management |

Access to protected backend endpoints is enforced through authentication and role authorization.

## Security

- JWT-based authentication
- Hashed passwords
- Role-based authorization
- Request validation using Pydantic
- Environment-based configuration for sensitive settings
- Git ignore rules for local databases, virtual environments, and environment files

**Important:** Never commit real `.env` files, secret keys, passwords, or local database files to a public repository.

## Project Objective

This project demonstrates full-stack development with FastAPI and React, relational database integration, authentication, role-based authorization, and common HR business workflows.

## Author

Developed as a full-stack HR Management System project.
