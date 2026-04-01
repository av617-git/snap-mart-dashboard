# 🏗️ Developer Handoff: Safety & Exclusion Checklist

Follow this checklist before zipping or sharing your project directory with a developer. This ensures you do not accidentally leak sensitive financial data or administrative credentials.

## 1. 📂 Directories to EXCLUDE
These folders are either too large to share (and can be regenerated) or contain messy/sensitive archives.

- [ ] **`node_modules/`** (Delete this from both the root and `petrola-dashboard/` before zipping. The developer will run `npm install`).
- [ ] **`dist/`** or **`build/`** (These are temporary production builds).
- [ ] **`_archive/`** (Contains legacy scripts with hardcoded Supabase keys).
- [ ] **`__pycache__/`** (Python compiled files).
- [ ] **`.git/`** (If you are sending a ZIP file instead of a repository link).

## 2. 🔐 Security & Credentials (SCREENS)
Ensure these files or their contents are **NEVER** shared:

- [ ] **`.env.local`** (Located in `petrola-dashboard/`). This contains your specific Supabase URL and keys.
- [ ] **Supabase Service Role Key**: If you have a `.env` file with a `SERVICE_ROLE_KEY`, delete it or scrub the key. This key bypasses all security rules. 
- [ ] **Gemini / OpenAI API Keys**: Remove any `GEMINI_API_KEY` from your environment files.

> [!CAUTION]
> **Supabase Anon Key**: The `sb_publishable_...` key is safe to share as it is meant for the frontend, but the developer should ideally be instructed to provide their own if they are setting up a separate dev environment.

## 3. 🤖 Automation (Pipedream/Make.com)
The `.blueprint.json` files contain metadata about your specific automation accounts.

- [ ] **Connections**: Inform the developer that the `__IMTCONN__` (Connection IDs) in the blueprints will **fail** on their machine. They must create their own connections to Google Drive and Supabase.
- [ ] **PII**: If the blueprints contain your real email address, you may want to scrub those strings before sharing.

## 4. 📊 Data Verification
- [ ] **SQL Seed Data**: The `seed_daily_financial_logs.sql` file currently contains **mock test data** (Day 1, 2, 3). It is safe to share. 
- [ ] **Raw PDFs**: Ensure you do not have any real store financial PDFs sitting in the `Daily Sheets` or `_archive` folders.

---

### Recommended Tool: `.gitignore`
I have added a `.gitignore` to your project root. If you use `git` to share the repo, these files will be automatically excluded.
