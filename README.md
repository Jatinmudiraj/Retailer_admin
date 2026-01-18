# RoyalIQ Retailer Admin

## Overview
Retailer administration panel for RoyalIQ, built with:
- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python) + SQLAlchemy

## Setup

### Backend
1. Navigate to `backend/`.
2. Create virtual env: `python -m venv venv`
3. Activate: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. Install: `pip install -r requirements.txt`
5. Ensure `.env` is configured (see `.env.example`).

### Frontend
1. Navigate to `frontend/`.
2. Install: `npm install`
3. Ensure `.env` matches backend configuration.

## Running the Project

You need two terminal windows.

### Terminal 1: Backend
```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9001
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

The frontend will verify authentication against the backend proxy at `http://localhost:9001`.
