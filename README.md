# Smart Campus Complaint Management System (Campus Care)

React + Vite + Tailwind v4 frontend, Node/Express + MongoDB (Mongoose) backend, JWT + bcrypt auth, Gemini AI with rule-based fallback.

## Folder structure
```
server/  server.js (API + auth + RBAC)  models.js (7 collections)  ai.js (Gemini + fallback)  seed.js  .env.example
client/  src/App.jsx (layout, routing)  api.js  ui.jsx  pages/{Auth,Home,Complaints,Manage}.jsx
```

## Setup (Node 18+, MongoDB running locally or Atlas)
```
cd server && cp .env.example .env     # set MONGO_URI and a long JWT_SECRET; GEMINI_API_KEY is optional
npm install && npm run seed && npm run dev      # API on :5000

cd client && npm install && npm run dev         # app on http://localhost:5173
```

## Deployment
The Vite `/api` proxy is for local development only. To host both parts on Vercel, create two Vercel projects from this repository:

1. Keep the frontend project rooted at `client`.
2. Create a backend project rooted at `server`. Vercel detects the Express app in `server.js`.
3. Configure the backend project's `MONGO_URI` with a reachable MongoDB Atlas URI, `JWT_SECRET` with a private random value, and `CLIENT_URL` with the exact frontend origin (for example, `https://smart-olive-five.vercel.app`).
4. After the backend deploys, set `VITE_API_BASE_URL` in the frontend project to the backend URL ending in `/api` (for example, `https://your-api.vercel.app/api`) and redeploy the frontend.

Vercel's function filesystem is temporary, so uploaded complaint images need object storage for reliable production persistence.

## Sample logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | Admin@123 |
| Staff | ravi@campus.edu / meena@campus.edu | Staff@123 |
| Student | student@campus.edu (or register) | Student@123 |

## REST API (all except /auth require `Authorization: Bearer <token>`)
- POST /api/auth/register (student) · POST /api/auth/login {email,password,role} · GET/PUT /api/me
- POST /api/complaints (student, multipart `images`) · GET /api/complaints?q&category&status&priority&from&to · GET/PATCH/DELETE /api/complaints/:id · POST /api/complaints/:id/feedback
- GET /api/notifications · PATCH /api/notifications/read · GET /api/stats
- Admin: GET /api/admin/report?period=daily|weekly|monthly · GET /api/staff · GET/POST/PATCH/DELETE /api/admin/users/:type(/:id)
- POST /api/ai/chat (student)

## Testing walkthrough
1. Student: register, open New complaint, submit "Projector in Room 204 not working since yesterday, exam tomorrow" with a photo. Expect a CMP-… ID, category/priority detected, "submitted" notification.
2. Submit a near-identical complaint from a second student account: the admin sees a "possible duplicate" flag.
3. Admin: open it, assign to Ravi, set remarks, save. Student gets a notification.
4. Staff (Ravi): open task, set In Progress, then add remarks + before/after photos and mark Resolved.
5. Student: rate the resolved complaint. Admin: check Overview charts and Reports (CSV export).
6. Negative tests: wrong password, short description, student opening /reports (redirected), 6 MB image (rejected).

## Notes
- Without GEMINI_API_KEY, or if Gemini fails or times out, classification/priority/sentiment/summary/recommendations and the chatbot use the built-in rule engine.
- `bcryptjs` is used (same algorithm as bcrypt, no native build step).
- Notifications are in-app (polled every 30 s). Email delivery is not included.
- Uploaded images are stored in server/uploads; swap multer storage for S3/Cloudinary in production.
