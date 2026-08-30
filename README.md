# Learnix — LMS (Learning Management System)

A full-stack LMS with 4 roles (Student, Instructor, Content Manager, Admin), built with **Next.js** (frontend) and **Strapi v5** (backend).

- **Live app:** https://lms-project-eosin-delta.vercel.app
- **Backend API:** https://lms-project-production-b5dc.up.railway.app

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS — deployed on **Vercel**
- **Backend:** Strapi 5 (Node.js), REST API — deployed on **Railway**
- **Database:** SQLite (dev) / configured via Strapi's database layer

## Features Completed

**Auth & Roles**
- Register / login (JWT-based), 4 roles: Student, Instructor, Content Manager, Admin
- New accounts always get the default role from the server — role can only be changed by an Admin, never by the client
- Idle-timeout auto logout (30 min of inactivity)

**Student**
- Browse published courses, enroll in a course
- View enrolled lessons (content locked until enrolled)
- Mark lessons complete, track per-course progress %
- Take a quiz per lesson, auto-graded, one attempt only, review answers after submitting

**Instructor**
- Create/edit/delete/publish/unpublish courses and lessons (scoped to own courses only)
- Add quiz questions to a lesson
- View enrolled students' progress for own courses

**Content Manager**
- Same course/lesson/quiz management as Instructor, across all courses
- Create/edit/publish/unpublish blog posts

**Admin**
- Everything above, plus:
- Admin panel: platform stats (courses/lessons/enrollments/blog posts, users per role)
- View all users, change a user's role, delete a user account (cannot change own role or delete own account)

**Security**
- Every write/read action is authorized on the backend (not just hidden in the UI) — role checked from the authenticated session on every request
- Draft content (unpublished courses/lessons/blog posts) is only visible to Admin/Content Manager or the owning Instructor
- Quiz correct answers are stripped from every response sent to a Student before they submit

## Run It Locally

Requires **Node.js 20+** and npm.

### 1. Backend (Strapi)

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and replace every `tobemodified` value with your own random strings (used for `APP_KEYS`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`).

```bash
npm run develop
```

Backend runs at `http://localhost:1337`. On first run, create your Strapi Admin account at `http://localhost:1337/admin`.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3000` and talks to the backend via `NEXT_PUBLIC_STRAPI_API_URL` (defaults to `http://localhost:1337`).

### 3. First-time setup

- Register a user from the app (`/register`) — it becomes a **Student** by default.
- To test other roles, log in to the Strapi Admin panel (`/admin`) and change that user's role under **Content Manager → Users**, or use the app's own Admin panel once one account is promoted to Admin.

## Deployment Notes

- Frontend (Vercel) needs `NEXT_PUBLIC_STRAPI_API_URL` set to the deployed backend URL.
- Backend (Railway) needs `APP_KEYS`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY` (unique secrets, not the example values), and `CORS_ORIGIN` set to the deployed frontend URL.