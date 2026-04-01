# Product Requirements Document (PRD): Daily Financial Summary Dashboard

## Overview
The Petrola Dashboard requires a "Daily Financial Operations Log" to reconcile cash reported vs. cash deposited, and lottery reported vs. lottery sold/paid out. The system relies on data extracted from various end-of-day physical paper reports (Till Reports, Loomis/Titan Deposits, EBT Settlement, AGK, Hisably, SR34, and SR50) via an automated Pipedream OCR pipeline. 

This document defines the Database Schema, Calculation Logic, and UI specifications required to complete this feature.

---

## 1. Database Schema & Math Logic (Supabase)
We will offload all financial calculations to Supabase using **Generated Columns** to prevent client-side JavaScript floating-point errors.

**Table Name:** `daily_financial_logs`
**Primary Key:** `date` (DATE)

### A. Raw Data Inputs (Injected by Pipedream)
These columns receive raw values parsed from the paper reports:

*   **Over / Short:**
    *   `s1_over_short` (NUMERIC)
    *   `s2_over_short` (NUMERIC)
*   **Handovers (Till Reports):**
    *   `prev_s2_end_count` (NUMERIC) - *From yesterday's S2 Ending Cash*
    *   `curr_s1_start_balance` (NUMERIC) - *S1 Till Beginning Balance*
    *   `s1_end_count` (NUMERIC) - *S1 Cashier Count of the Till*
    *   `s2_start_balance` (NUMERIC) - *S2 Till Beginning Balance*
*   **Safe Drops (Till vs. Loomis/Titan):**
    *   `s1_till_drops` (NUMERIC) - *S1 Cashier Safe Drops (Cash line)*
    *   `s1_titan_deposits` (NUMERIC) - *S1 Loomis/Titan Actual Drop*
    *   `s2_till_drops` (NUMERIC) - *S2 Cashier Safe Drops (Cash line)*
    *   `s2_titan_deposits` (NUMERIC) - *S2 Loomis/Titan Actual Drop*
*   **EBT Batch:**
    *   `s1_ebt_sales` (NUMERIC) - *S1 System Safe Drops (EBT line)*
    *   `s2_ebt_sales` (NUMERIC) - *S2 System Safe Drops (EBT line)*
    *   `ebt_settlement_batch` (NUMERIC) - *EBT Batch Out Receipt*
*   **Lottery & Cashing:**
    *   `lottery_tickets_books` (NUMERIC) - *AGK Sales Data*
    *   `total_sales_hisably` (NUMERIC) - *Hisably End of Shift Scans*
    *   `terminal_cashing_all` (NUMERIC) - *SR34 & SR50 Cashing Fields*
    *   `prizes_paid_books` (NUMERIC) - *AGK Daily Report Prizes Paid*
    *   `total_sr50_net_sales` (NUMERIC) - *SR50 Net Sales*
    *   `machine_sales_books` (NUMERIC) - *AGK Lottery Machine Sales*

### B. Generated Columns (Calculated Math)
Supabase will automatically calculate these columns upon row insert/update:

1.  `daily_over_short` = `s1_over_short` + `s2_over_short`
2.  `overnight_handover_diff` = `curr_s1_start_balance` - `prev_s2_end_count` (Expressed as absolute diff if required)
3.  `shift_handover_diff` = `s2_start_balance` - `s1_end_count`
4.  `s1_deposit_diff` = `s1_till_drops` - `s1_titan_deposits`
5.  `s2_deposit_diff` = `s2_till_drops` - `s2_titan_deposits`
6.  `total_till_ebt` = `s1_ebt_sales` + `s2_ebt_sales`
7.  `ebt_rec_diff` = `ebt_settlement_batch` - `total_till_ebt`
8.  `instant_sales_diff` = `lottery_tickets_books` - `total_sales_hisably`
9.  `cashing_diff` = `terminal_cashing_all` - `prizes_paid_books`
10. `net_sales_diff` = `total_sr50_net_sales` - `machine_sales_books`

---

## 2. Automation Pipeline Expectations (Pipedream)
*   **Upsert Logic:** Because reports arrive at different times of the day, Pipedream must use an `UPSERT` operation based on the `date` column. It should only update the specific columns it has data for, without overwriting existing data for that day with `NULL`s.
*   **Data Types:** Pipedream OpenAI extraction prompts must strictly strip out `$` symbols and commas (e.g., return `5111.92` instead of `$5,111.92`) to prevent Supabase type-casting errors on `NUMERIC` columns.

---

## 3. User Interface & Component Architecture
The UI will match the provided visual mockups (3-column layout with top KPI header).

### Features & Styling Requirements:
*   **KPI Header Row:** Displays core variance numbers (`OV/Short`, `Drops Diff`, `Handovers`, `EBT Diff`, `Lottery Diff`, `Net Position`).
*   **Dynamic Color Coding:** Any variance or difference column should dynamically style its text:
    *   Positive numbers (or zero depending on the metric) = Green
    *   Negative numbers / discrepancies = Red / Alert Orange
*   **Document Links:** Include stubbed/disabled buttons (e.g., "Till Reports", "EBT Settlement") designed to eventually link to the raw scanned files hosted in Supabase Storage.
*   **State Management:** Include standard Loading state (Spinner) and Empty state (if no data exists for the selected date).

---

## 4. Implementation Phases (For Antigravity AI)

*   **Phase 1: Database Setup**
    *   Write and execute the `.sql` migration to create the `daily_financial_logs` table with all Raw Input fields and Generated Columns (using proper `NUMERIC(10,2)` types).
*   **Phase 2: Data Fetching Layer**
    *   Create a Supabase service function (`getDailyFinancialLog(date)`) to fetch the row for a given date.
*   **Phase 3: UI Component Integration**
    *   Bind the fetched data to the existing `Dashboard.jsx` (or `FinancialOperationsLog.jsx`) component layout.
    *   Implement the dynamic red/green text color logic for the difference calculations.   