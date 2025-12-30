## Summary of Issues Found
- Admin login fails because backend `users` routes still read from the local Prisma DB, while admin dashboards now read from Supabase. This mismatch blocks admin authentication (api/src/routes/users.js:82).
- Dashboard and availability pages throw “error loading dashboard data” when Supabase env variables/tables are missing; backend expects Supabase but it’s not fully provisioned.
- Admin UI alignment is inconsistent; page content width and containers need consistent max-width and centered layout (admin.html structure and CSS).
- Data shape mismatches (camelCase vs snake_case) between frontend admin.js and Supabase responses cause empty tables or broken render paths (api/admin.js:186–210, 347–389, 432–456).
- Supabase tables are not created; schema must be applied (api/supabase-schema.sql).

## Plan
### 1) Supabase Setup
- Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `api/.env`.
- Apply schema in Supabase SQL editor using `api/supabase-schema.sql` to create `users`, `drivers`, `availability`, `bookings`.
- Run migration script to upsert existing Prisma/SQLite data into Supabase: `npm run supabase:migrate`.
- Verify tables contain data (counts and a few sample rows).

### 2) Admin Login Fix (Backend)
- Switch `api/src/routes/users.js` to read from Supabase for login and registration:
  - On login, fetch user by `email` from Supabase, compare bcrypt password, issue JWT.
  - Ensure an admin user exists in Supabase (`admin@raipurtaxi.com`). If missing, seed it securely.
- Keep JWT verification logic unchanged; only change user persistence layer.

### 3) Admin Dashboard and Availability (Backend)
- Confirm `api/src/routes/admin.js` reads counts, revenue, recent bookings, and trends from Supabase consistently.
- Confirm availability endpoints read/write from Supabase with date-range queries; standardize ISO handling to midnight boundaries.

### 4) Frontend Admin (Data Normalization)
- Normalize `api/admin.js` to map Supabase snake_case → UI camelCase:
  - bookings: `pickup_date`, `pickup_time`, `booking_number`, `price`, `status`.
  - drivers: `vehicle_no`, `status` → `isAvailable`.
  - availability: `morning_available`, `evening_available`.
- Add defensive parsing for API responses (`data.bookings` vs array).
- Ensure actions for Confirm/Cancel call the updated endpoints and update the table state.

### 5) UI Alignment & UX
- Apply consistent layout rules:
  - Center main content, `max-width: 1200px`, padding.
  - Fix login card layout; ensure it’s centered with consistent spacing.
  - Ensure tables have responsive headers and action button groups.
- Availability page:
  - Keep per-row “Open/Close Morning/Evening” actions.
  - Add a bulk update form (date range + toggles) to speed admin ops.

### 6) Diagnostics & Error Handling
- Add `/api/diagnostics` endpoint returning:
  - Supabase env status, reachable check, list of tables.
- Improve admin.js error displays with inline alerts and retry buttons for dashboard and availability loads.

### 7) Testing
- Create test scripts to verify:
  - Admin login success and JWT issuance.
  - Dashboard loads with counts.
  - Availability toggle updates Supabase and reflects in UI.
  - Booking creation updates availability and appears in admin list.

### 8) Security & Policies
- Review Supabase RLS policies:
  - Allow public read for availability and bookings if needed.
  - Restrict writes to service role.
- Ensure admin routes use the service role key only server-side; never expose in frontend.

### 9) Rollout
- Implement changes, restart backend, verify dashboards and availability.
- Document updated credentials and endpoints.

## Deliverables
- Working admin login via Supabase
- Aligned admin UI (login, dashboard, availability, reports skeleton)
- Supabase schema applied and data migrated
- Robust error handling and diagnostics
- Tests demonstrating end-to-end flow

## Confirmation
Would you like me to proceed with implementing this plan now (Supabase setup, backend login switch, UI fixes, and tests)?