# Nexmate

Admin portal with Microsoft Entra ID authentication, role-based access control, and settings for users, roles, and departments.

## Stack

- Next.js 16 (App Router)
- NextAuth v5 + Microsoft Entra ID
- MongoDB
- Tailwind CSS v4 + shadcn/ui

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Fill in `.env.local`:

- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
- `MONGODB_URI`, `MONGODB_DATABASE`

3. Install dependencies and seed the database:

```bash
npm install
npm run db:init
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login`.

## First admin user

Users are created automatically on first Microsoft Entra sign-in. To grant admin access, assign the **System Admin** role to your user in MongoDB (`user_roles` collection) after signing in once, or seed a `user_roles` row linking your user id to role id `1`.

## Features

- **Login** — Microsoft Entra ID OAuth
- **Dashboard** — Welcome page with quick links to settings
- **Settings** — Users, roles, and departments management
