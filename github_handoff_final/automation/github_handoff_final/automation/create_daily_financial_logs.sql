CREATE TABLE IF NOT EXISTS daily_financial_logs (
    date DATE PRIMARY KEY,
    
    -- A. Raw Data Inputs (Injected by Pipedream)
    -- Defaulting to 0.00 ensures mathematical safety when portions of the day's data arrive incrementally.
    s1_over_short NUMERIC(10,2) DEFAULT 0.00,
    s2_over_short NUMERIC(10,2) DEFAULT 0.00,
    
    prev_s2_end_count NUMERIC(10,2) DEFAULT 0.00,
    curr_s1_start_balance NUMERIC(10,2) DEFAULT 0.00,
    s1_end_count NUMERIC(10,2) DEFAULT 0.00,
    s2_start_balance NUMERIC(10,2) DEFAULT 0.00,
    
    s1_till_drops NUMERIC(10,2) DEFAULT 0.00,
    s1_titan_deposits NUMERIC(10,2) DEFAULT 0.00,
    s2_till_drops NUMERIC(10,2) DEFAULT 0.00,
    s2_titan_deposits NUMERIC(10,2) DEFAULT 0.00,
    
    s1_ebt_sales NUMERIC(10,2) DEFAULT 0.00,
    s2_ebt_sales NUMERIC(10,2) DEFAULT 0.00,
    ebt_settlement_batch NUMERIC(10,2) DEFAULT 0.00,
    
    lottery_tickets_books NUMERIC(10,2) DEFAULT 0.00,
    total_sales_hisably NUMERIC(10,2) DEFAULT 0.00,
    terminal_cashing_all NUMERIC(10,2) DEFAULT 0.00,
    prizes_paid_books NUMERIC(10,2) DEFAULT 0.00,
    total_sr50_net_sales NUMERIC(10,2) DEFAULT 0.00,
    machine_sales_books NUMERIC(10,2) DEFAULT 0.00,

    -- B. Generated Columns (Calculated Math offloaded to Supabase)
    daily_over_short NUMERIC(10,2) GENERATED ALWAYS AS (s1_over_short + s2_over_short) STORED,
    overnight_handover_diff NUMERIC(10,2) GENERATED ALWAYS AS (curr_s1_start_balance - prev_s2_end_count) STORED,
    shift_handover_diff NUMERIC(10,2) GENERATED ALWAYS AS (s2_start_balance - s1_end_count) STORED,
    s1_deposit_diff NUMERIC(10,2) GENERATED ALWAYS AS (s1_till_drops - s1_titan_deposits) STORED,
    s2_deposit_diff NUMERIC(10,2) GENERATED ALWAYS AS (s2_till_drops - s2_titan_deposits) STORED,
    total_till_ebt NUMERIC(10,2) GENERATED ALWAYS AS (s1_ebt_sales + s2_ebt_sales) STORED,
    ebt_rec_diff NUMERIC(10,2) GENERATED ALWAYS AS (ebt_settlement_batch - (s1_ebt_sales + s2_ebt_sales)) STORED,
    instant_sales_diff NUMERIC(10,2) GENERATED ALWAYS AS (lottery_tickets_books - total_sales_hisably) STORED,
    cashing_diff NUMERIC(10,2) GENERATED ALWAYS AS (terminal_cashing_all - prizes_paid_books) STORED,
    net_sales_diff NUMERIC(10,2) GENERATED ALWAYS AS (total_sr50_net_sales - machine_sales_books) STORED
);
