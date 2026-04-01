# DEVELOPER HANDOFF: Petrola Dashboard (Snap Mart Ops)

**Date Compiled:** March 2026
**Project Status:** Paused Active Development / Handoff to Senior Full-Stack
**Objective:** End-to-end automated financial reconciliation. Scanned physical paper reports (Till, Loomis, EBT, Hisably, AGK) are routed via Pipedream OCR -> Supabase -> React Dashboard.

---

## 🔒 SECURITY & PRIVACY NOTICE (READ FIRST)

Before zipping or sharing this codebase, PLEASE check the companion document [handoff_exclusion_guide.md](file:///c:/Users/varel/OneDrive/Documents/Antigravity/Snap%20Mart%20Ops%20App/handoff_exclusion_guide.md). 

### Identity & Access (IAM)
- **Supabase Service Role Key**: Never provide the Service Role Key to a developer unless they are performing sensitive database migrations. Use the **Anon Key** with RLS (Row Level Security) instead.
- **Gemini API Keys**: The developer must provide their own Gemini/OpenAI credentials for automation testing.
- **Environment Variables**: The developer is responsible for translating the keys in `.env.example` into their own `.env.local` to avoid leaking production credentials.

### Data Protection
- **Personal Information (PII)**: Do not share raw store reports (PDFs, JPGs) as they contain real financial totals and employee identifiers.
- **Financial Integrity**: Ensure the developer tests against **Mock Data** (provided in `seed_daily_financial_logs.sql`) rather than real store records until a secure staging environment is established.

---

## 1. Project Overview & Tech Stack

The Petrola Dashboard eliminates manual spreadsheet data entry by using AI OCR pipelines to digitize daily convenience store financial records. The backend acts as the definitive source of truth, mathematically validating data accuracy before serving it to the frontend via a "wide-table" architecture.

### Core Stack
*   **Frontend Framework:** React 18, Vite 5
*   **Routing:** React Router DOM (v6.21)
*   **Styling & UI:** TailwindCSS 3.4, Lucide React (Icons), Recharts (Charts)
*   **State & Notifications:** `react-hot-toast` (Installed, pending full implementation)
*   **Database / BaaS:** Supabase (PostgreSQL), `@supabase/supabase-js v2.39.0`
*   **Automation/Ingestion:** Pipedream (Watching Google Drive) & Gemini/OpenAI Vision APIs.

---

## 2. Database Schema & Supabase State

We recently migrated from a highly fragmented, legacy Entity-Attribute-Value (EAV) design to a hardened **Wide-Table** architecture to prevent data gaps. 

**Core Master Table:** `daily_financial_logs`
*   **Primary Key:** `date` (`DATE` type)
*   **Currency Safety:** All financial input points are strictly typed as `NUMERIC(10,2)` with a `DEFAULT 0.00` to guarantee API ingestion stability.

### Postgres Generated Columns (Server-Side Math)
We explicitly offloaded all mathematical variance calculations from the frontend JavaScript to Supabase using `GENERATED ALWAYS AS (...) STORED` columns. This prevents floating-point UI errors.

*   `daily_over_short` = `s1_over_short` + `s2_over_short`
*   `overnight_handover_diff` = `curr_s1_start_balance` - `prev_s2_end_count`
*   `shift_handover_diff` = `s2_start_balance` - `s1_end_count`
*   `s1_deposit_diff` = `s1_till_drops` - `s1_titan_deposits`
*   `s2_deposit_diff` = `s2_till_drops` - `s2_titan_deposits`
*   `ebt_rec_diff` = `ebt_settlement_batch` - (`s1_ebt_sales` + `s2_ebt_sales`)
*   `instant_sales_diff` = `lottery_tickets_books` - `total_sales_hisably`
*   `cashing_diff` = `terminal_cashing_all` - `prizes_paid_books`
*   `net_sales_diff` = `total_sr50_net_sales` - `machine_sales_books`

### 🚨 Critical Supabase State Notice (RLS & Auth)
Currently, the application is utilizing the `VITE_SUPABASE_ANON_KEY` for rapid prototyping UI display. 
**Action Required:** Row Level Security (RLS) is presently either disabled or loosely configured on the public tables. You must lock down the authentication roles before moving to production. *Crucial:* Ensure your RLS policies do not accidentally block the Pipedream Ingestion pipeline; Pipedream should be supplied with the `Service Role` key or execute over a secure authenticated webhook.

---

## 3. Frontend Architecture & Exhaustive Route Mapping

The React frontend operates inside the `petrola-dashboard` workspace. It acts primarily as a clean, read-only presentation layer of the Supabase generated data. Below is the comprehensive mapping of every single active page, route, and its core operational logic.

### 1. Master Dashboard (`/` -> `src/pages/Dashboard.jsx`)
The executive "God View" summarizing cross-module alerts.
*   **Live Fuel Inventory KPI:** Fetches from `tank_readings` and computes a Predictive Depletion Model to warn if a tank will run out of fuel within 3 hours (Critical) or 6 hours (Caution).
*   **Lottery Alerts KPI:** Queries `instant_ticket_audit` to scan for "Missing" or "Stolen" book statuses, surfacing immediate theft alerts to the general manager.
*   **EDI Tracking Panel:** Fetches from `edi_links`. Monitors electronic data interchange invoices from vendors (J Polep, Coremark). Supports batch downloading Google Drive files via hidden anchor link DOM generation (Note: *needs refactoring for stability*).
*   **Cashier Schedule Calendar:** An embedded Google Calendar agenda `<iframe>` visualizing shift patterns.

### 2. Daily Summary Ledger (`/daily-summary` -> `src/pages/DailySummary.jsx`)
The core source of truth for financial reconciliation.
*   **Data Source:** Fetches exclusively from the new, flattened `daily_financial_logs` wide-table.
*   **Logic:** For a given date, it renders an expandable ledger card showing 10 distinct variance computations (Over/Short, Drops Diff, EBT Batch Var, etc.) dynamically colored RED/GREEN based on discrepancies. 
*   **The "Net Position":** Aggregates all mathematical generated column flaws into a single final "Total Missing Cash" metric to judge the daily performance.
*   **Fallback:** *Currently ships with a hard-coded 3-day payload fallback representing "A Perfect Day", "Shortages", and "Lottery Discrepancies" to guard against dead API connects during this handoff.*

### 3. Cash Operations (`/cash` -> `src/pages/CashOperations.jsx`)
Isolates physical cash handling metrics across 3 Tabs. 
*   **Till Reports Tab:** Queries `automated_till_reports` mapped by Shift. Compares S1/S2 start/end counts and raw drawer payouts against cashier IDs.
*   **Loomis Armored Drops Tab:** Queries `automated_loomis_data`. Validates what Loomis/Titan receipt physically collected from the smart safe versus what the store system claimed was dropped. Organized into collapsible Year/Month accordions.
*   **EBT Settlements Tab:** Aggregates EBT safe drop lines from physical Till receipts and compares them against the grand total on the actual EBT Batch Settlement receipt (`automated_ebt_settlements`) to catch batch omission errors.

### 4. Lottery & Scratch Ticket Audit (`/lottery` -> `src/pages/LotteryAudit.jsx`)
Deep analysis of scratch ticket theft and draw game terminal variances across 3 Tabs.
*   **Ticket Activations Tab:** Performs an inner join/mapping in JavaScript between State Lottery `automated_ticket_activations` and physical in-store `automated_hisably_activations`. Any Game/Book ID active at the State Level but NOT scanned locally triggers a bright red "⚠️ MISSING / STOLEN" alert.
*   **Instant Ticket Audit Tab:** Pulls 8,000+ cached rows from Hisably raw sales. Multiplies total tickets sold by the ticket price, and compares against register scans (`instant_ticket_audit`) to catch unaccounted scratched inventory.
*   **Draw Games Summary Tab:** Queries `automated_agk_summary` against the State's specific "SR 50" / "SR 51" terminal reports, dynamically breaking down the variance of Terminal 400 vs Terminal 401.

### 5. Fuel Management Ops (`/fuel` -> `src/pages/FuelManagement.jsx`)
Monitors literal underground tank capacities and supply chain across 4 Tabs.
*   **Tank Inventory Tab:** Queries `tank_readings` (Regular/Super/Diesel). Uses the `lib/fuelUtils.js` module to calculate burn rates (gallons/hour) based on the differential between consecutive readings and predicts exact run-out times based on a 10,000-gallon capacity / 400-gallon dead-pump tolerance.
*   **Deliveries & BOL Tab:** A simple ledger querying `fuel_bol` (Bills of Lading), tying dropped volume to specific delivery documents.
*   **Price Quotes Tab:** Renders an interactive Recharts `<LineChart>` graphing historical supplier quotes (`fuel_quotes`) grouped by Grade (NL, SUP, DSL) so management can algorithmically buy the lowest dip.
*   **Invoices Tab:** Queries `fuel_invoices`. Billed Gallons * Price = Total Cost. Contains a mutation toggle for Admins to mark an invoice as `[x] Reconciled`. 

### 6. Raw Data Browser (`/data-browser` -> `src/pages/DataBrowser.jsx`)
*   **Purpose:** A developer/admin utility view. It essentially renders raw, unstyled JSON payloads or un-grouped tabular data straight from Supabase schemas for debugging Pipedream extraction anomalies without needing direct database access.

### 7. Legacy Daily Report (`/daily-report` -> `src/pages/DailyReport.jsx`)
*   **Purpose:** The original prototype view prior to the `daily-summary` wide-table refactor. Mostly kept as an archival reference component showcasing older EAV/Grouped data fetching patterns.

---

## 4. Automation & Data Ingestion (Pipedream API Flow)

*   **Frontend Fetching:** Interacts with the backend purely via the standard Supabase JavaScript Client (`src/lib/supabase.js`).
*   **Pipedream OCR Expectation:** 
    1. A paper report (e.g., Till Receipt) is dropped into the Google Drive Watch folder.
    2. Pipedream automatically triggers and sends the file to the Gemini/OpenAI Vision API.
    3. The AI extracts a strictly typed JSON payload. **Important:** It is instructed to strip all `$` symbols and commas so numeric casting does not crash the database.
    4. Pipedream executes an `UPSERT` on the `daily_financial_logs` master table keyed to the `date`.
    5. *Data Safety:* The UPSERT mutation only includes payloads the specific paper report has data for, intentionally leaving other columns undefined so it does not overwrite previously saved S1 data when an S2 report is processed.

---

## 5. Outstanding Bugs & Pending Polish (The 'To-Do' List)

As captured in our exhaustive Production Readiness Review, there are three architectural polish items mandatory for launch:

1.  **Missing Top-Level React Error Boundary:**
    Many asynchronous `fetch` closures (especially inside `CashOperations` and `LotteryAudit` `useEffect` blocks) lack holistic error capturing, meaning network drops fail silently. You must wrap routes in a global React Error Boundary and wire up the existing `react-hot-toast` library to visibly alert the user in the UI upon mutation failures.
2.  **Fragile File Download Strategy (EDI/Drive Links):**
    Inside `Dashboard.jsx`, there is a function `handleBatchDownload()` that relies on generating synthetic hidden anchor links (`document.createElement('a')`) and pushing `a.click()` to trick the browser into mass-downloading Google Drive PDFs. This pattern is easily blocked by modern popup blockers/mobile devices. Refactor to use stable `Blob` streams or native Browser API routing.
3.  **Lack of Optimistic UI Updates on Mutations:**
    Currently, updating a toggle (like the Invoice Reconciled checkbox in `FuelManagement.jsx`) waits for the full round-trip Supabase backend resolution. To make the dashboard feel production-grade, immediately mutate the local React state array when the user takes action, rolling back visually *only* if the background `Promise` strictly throws an error.
