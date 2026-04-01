-- SEED DATA for daily_financial_logs
-- This script inserts 3 days of sample data to verify the Supabase generated column math logic.

-- Clear previous test data (optional, remove if you want to keep existing logs)
DELETE FROM daily_financial_logs WHERE date IN ('2026-03-01', '2026-03-02', '2026-03-03');

INSERT INTO daily_financial_logs (
    date,
    
    -- Cash Over/Short
    s1_over_short, s2_over_short,
    
    -- Handovers
    prev_s2_end_count, curr_s1_start_balance,
    s1_end_count, s2_start_balance,
    
    -- Deposits
    s1_till_drops, s1_titan_deposits,
    s2_till_drops, s2_titan_deposits,
    
    -- EBT
    s1_ebt_sales, s2_ebt_sales, ebt_settlement_batch,
    
    -- Lottery
    lottery_tickets_books, total_sales_hisably,
    terminal_cashing_all, prizes_paid_books,
    total_sr50_net_sales, machine_sales_books
) VALUES 
-- =========================================================
-- DAY 1: "The Perfect Day" - 0 Variances Across the Board
-- =========================================================
(
    '2026-03-01',
    0.00, 0.00,                         -- Over/short
    500.00, 500.00,                     -- Overnight Handover (Diff: 0)
    500.00, 500.00,                     -- Shift Handover (Diff: 0)
    1000.00, 1000.00,                   -- S1 Drops vs Titan (Diff: 0)
    1200.00, 1200.00,                   -- S2 Drops vs Titan (Diff: 0)
    150.00, 250.00, 400.00,             -- EBT (150+250 = 400. Settled: 400. Diff: 0)
    500.00, 500.00,                     -- Instant Lottery (Diff: 0)
    300.00, 300.00,                     -- Cashing (Diff: 0)
    100.00, 100.00                      -- Draw Machine Sales (Diff: 0)
),

-- =========================================================
-- DAY 2: "Cash Shortages" - Missing money and bad handovers
-- =========================================================
(
    '2026-03-02',
    -5.00, 2.50,                        -- Over/short (Daily: -2.50)
    500.00, 490.00,                     -- Overnight Handover (Diff: -10.00)
    500.00, 510.00,                     -- Shift Handover (Diff: +10.00)
    1000.00, 990.00,                    -- S1 Drops vs Titan (Diff: +10.00)
    1200.00, 1200.00,                   -- S2 Drops vs Titan (Diff: 0)
    150.00, 250.00, 400.00,             -- EBT (Diff: 0)
    500.00, 500.00,                     -- Instant Lottery (Diff: 0)
    300.00, 300.00,                     -- Cashing (Diff: 0)
    100.00, 100.00                      -- Draw Machine Sales (Diff: 0)
),

-- =========================================================
-- DAY 3: "Lottery & EBT Mess" - Discrepancies in sales files
-- =========================================================
(
    '2026-03-03',
    0.00, 0.00,                         -- Over/short (Daily: 0.00)
    510.00, 510.00,                     -- Overnight Handover (Diff: 0.00)
    500.00, 500.00,                     -- Shift Handover (Diff: 0.00)
    1000.00, 1000.00,                   -- S1 Drops vs Titan (Diff: 0)
    1200.00, 1200.00,                   -- S2 Drops vs Titan (Diff: 0)
    200.00, 300.00, 480.00,             -- EBT (200+300 = 500. Settled: 480. Diff: -20.00)
    600.00, 550.00,                     -- Instant Lottery (600 sold AGK, Hisably scanned 550. Diff: +50.00)
    350.00, 400.00,                     -- Cashing (Terminal CAS 350, Paid books 400. Diff: -50.00)
    200.00, 180.00                      -- Draw Machine (SR50 200, AGK books 180. Diff: +20.00)
);
