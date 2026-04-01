# Snap Mart Operations: Full-Stack Reconciliation Dashboard

Welcome to the Snap Mart Operations repository. This project provides an end-to-end solution for reconciling physical retail financial records with a digital dashboard using AI-driven OCR pipelines.

## 📁 Repository Structure

- **`/automation`**: Contains the backend logic, SQL schemas, and automation blueprints.
    - `*.blueprint.json`: Make.com / Pipedream workflow exports.
    - `*.sql`: Database initialization and mock seed data.
- **`/dashboard`**: The React-based frontend dashboard.
    - Built with Vite, TailwindCSS, and Supabase.
- **`DEVELOPER_HANDOFF.md`**: Detailed technical onboarding and route mapping. **Read this first.**
- **`handoff_exclusion_guide.md`**: Security checklist for zipping/sharing the repo.

## 🚀 Getting Started

### 1. Database (Supabase)
1. Create a new Supabase project.
2. Run the `automation/create_daily_financial_logs.sql` script in the SQL Editor.
3. (Optional) Run `automation/seed_daily_financial_logs.sql` to populate the dashboard with test data.

### 2. Frontend (Dashboard)
1. Navigate to `/dashboard`.
2. Create a `.env.local` file based on `.env.example`.
3. Run `npm install` and `npm run dev`.

### 3. Automation (OCR Ingestion)
1. Import the blueprints in `/automation` into your automation platform (Pipedream/Make.com).
2. Update the connection strings to point to your Supabase and Google Drive instances.

## 🔒 Security Notice
Review the **Identity & Access (IAM)** section in `DEVELOPER_HANDOFF.md` before deploying to production. This repository uses Row Level Security (RLS) which must be correctly configured for your environment.
