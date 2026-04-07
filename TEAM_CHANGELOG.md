# ParkPerfect Team Changelog

This document summarizes the recent frontend and local-development updates so everyone on the team can run the project on their own machine.

## What Changed

### User frontend
- Added a React user login page at `/login`.
- Added protected user routes for `/map` and `/settings`.
- Added an in-memory auth context for user JWTs.
- Added a Leaflet-based live parking map.
- Added user parking actions:
  - `Park`
  - `Leave`
  - notification subscribe button UI
- Added user settings UI for:
  - name
  - email
  - password
  - plate
- Parking UI now blocks parking in multiple lots at once on the frontend.

### Admin frontend
- Fixed admin login so it uses the real backend route:
  - frontend now posts to `/api/panel/login/`
- Admin login still requires an account with `is_staff=True`.

### Local parking data
- Replaced the local parking-lot seed list with the current real lot names and coordinates.
- Updated `seed_parking_data.py` so it:
  - reads database settings from `.env`
  - resets parking lots and parking events before reseeding
  - generates 30 days of realistic history using the weekday/weekend occupancy curve already in the script

## Important Files

- User app entry/routing:
  - [App.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/App.jsx)
  - [main.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/main.jsx)
- User auth and API:
  - [AuthContext.js](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/AuthContext.js)
  - [api.js](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/api.js)
  - [ProtectedRoute.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/ProtectedRoute.jsx)
- User pages:
  - [LoginPage.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/pages/LoginPage.jsx)
  - [MapPage.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/pages/MapPage.jsx)
  - [SettingsPage.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/pages/SettingsPage.jsx)
- Shared user styling:
  - [user-app.css](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/user-app.css)
- Admin login/client:
  - [AdminLogin.jsx](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/pages/admin/AdminLogin.jsx)
  - [client.js](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect/src/api/client.js)
- Local seeding:
  - [seed_users.py](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/seed_users.py)
  - [seed_parking_data.py](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/seed_parking_data.py)

## Local Requirements

### Backend
- Python virtual environment
- PostgreSQL running locally
- A local database matching the values in `.env`

Current backend settings come from [.env](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/.env):

```env
DB_NAME=ParkPerfect
DB_USER=postgres
DB_PASSWORD=Disney.13
DB_HOST=localhost
DB_PORT=5432
DEBUG=True
```

If someone uses different local Postgres credentials, they need to update their own `.env`.

### Frontend
- Node installed
- dependencies installed in [park-perfect](C:/Users/ryanw/Random%20Coding%20Assignments/ParkPerfect/park-perfect)

## How To Run Locally

### 1. Start the backend

From the project root:

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect"
.\venv\Scripts\Activate.ps1
python manage.py runserver 8000
```

### 2. Start the frontend

In a second terminal:

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect\park-perfect"
npm install
npm run dev
```

The Vite frontend runs on `http://localhost:5173` by default.

## How To Seed Local Data

### Seed users first

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect"
.\venv\Scripts\Activate.ps1
python seed_users.py
```

### Seed parking history

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect"
.\venv\Scripts\Activate.ps1
python seed_parking_data.py
```

What `seed_parking_data.py` does now:
- deletes all existing parking events
- deletes all existing parking lots
- recreates the approved lot list
- generates 30 days of realistic parking events
- updates each lot’s current `availableSpaces`

Important:
- this is now a reset-and-reseed script
- rerunning it will replace the current local parking history

## Current Local Parking Lots

- Kelley Center
- Jogues Lot
- Bowman Lot
- Canisius Lot
- Bellarmine Lot
- Barnyard Lot
- Media Center Lot
- Faber Lot
- Mahan Lot
- Egan Lot
- Parking garage
- Mccorminck Lot

## Admin Login Notes

The backend admin login route is:

```text
/api/panel/login/
```

Admin users must have `is_staff=True`.

If someone does not have an admin account locally, they can create one with:

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect"
.\venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

Or they can promote an existing user in Django shell.

## Known Local Notes

- User JWTs are intentionally stored only in memory in the user frontend.
  Refreshing the page logs the user out.
- Admin auth still uses `localStorage` through the older admin client.
- The notification subscribe UI exists on the user map, but the backend route `/api/notifications/subscribe/` is not currently implemented in this repo.
- If the user map shows no updates, make sure Django is running on port `8000` and the frontend is opened from the current Vite server, not an older cached tab.

## Quick Verification

Frontend checks that passed locally:

```powershell
cd "C:\Users\ryanw\Random Coding Assignments\ParkPerfect\park-perfect"
npm run build
npx eslint src
```
