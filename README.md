# EchoHive

A social feed-style React app built with Vite and Supabase for campus discussion, reactions, bookmarks, reposts, comments, and admin tools.

## Project Structure

- `EchoHive.jsx` - Main React application UI and client-side logic at the repository root.
- `supabaseClient.js` - Supabase integration helper for authentication and database actions.
- `echohive_schema.sql` - Supabase/PostgreSQL schema for tables, row-level security, triggers, and functions.
- `SETUP.md` - Deployment and local setup guide for Supabase and the frontend.
- `app/` - Vite-based React project containing the frontend sources and config.
  - `app/package.json` - frontend dependencies and build scripts.
  - `app/src/` - React source files and project assets.

## Tech Stack

- React 19
- Vite
- Supabase
- Tailwind CSS
- Lucide React icons
- ESLint

## Getting Started

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Add environment variables

Create an `.env.local` file inside `app/` with:

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

### 3. Run the app locally

```bash
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Supabase Setup

Use `echohive_schema.sql` in your Supabase project SQL editor to create the required database schema.

Then configure Auth redirect URLs and environment variables as described in `SETUP.md`.

## Notes

- The frontend should use only the publishable Supabase key.
- Keep any `sb_secret_...` key private and never commit it to source control.
- The app is designed for campus community features and may include mocked UI state until wired to live backend services.

## Useful Commands

From the `app/` directory:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## License

This repository does not include a license file. Add one if you want to make the project open source.
