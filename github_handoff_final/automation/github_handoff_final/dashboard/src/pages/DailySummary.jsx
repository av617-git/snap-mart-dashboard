import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, DollarSign, Wallet, FileBarChart, ArrowRightLeft, FileText, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

const formatCurrency = (val) => {
  if (val === 'Missing') return <span className="text-red-500 font-black tracking-wider uppercase text-[10px]">Missing</span>;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
}

const VarianceBadge = ({ label, value, inverse = false }) => {
  const isZero = Math.abs(value) < 0.01
  const isBad = inverse ? value > 0.01 : value < -0.01
  const colorClass = isZero ? 'text-slate-500 bg-slate-100' : (isBad ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100')
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">{label}</span>
      <span className={`px-2 py-0.5 rounded text-xs font-black ${colorClass}`}>
        {value > 0.01 ? '+' : ''}{formatCurrency(value)}
      </span>
    </div>
  )
}

const DetailRow = ({ label, value, isHighlight = false }) => (
  <div className={`flex justify-between items-center py-1.5 ${isHighlight ? 'font-bold text-slate-900 border-t border-slate-200 mt-1 pt-2' : 'text-slate-600'}`}>
    <span className={`text-xs ${isHighlight ? 'uppercase tracking-wide' : ''}`}>{label}</span>
    <span className={`text-xs ${isHighlight ? 'font-mono' : ''}`}>{formatCurrency(value)}</span>
  </div>
)

const DocLink = ({ url, label }) => {
  const isStubbed = !url;
  return (
    <a 
      href={url || '#'}
      target={isStubbed ? '_self' : '_blank'}
      rel="noreferrer"
      onClick={(e) => { if (isStubbed) e.preventDefault(); }}
      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded w-fit mt-3 shadow-sm border ${isStubbed ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed' : 'text-indigo-500 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 border-indigo-100/50'}`}
    >
      <LinkIcon className="w-3 h-3" /> {label} {isStubbed ? '(Stub)' : ''}
    </a>
  )
}

export default function DailySummary() {
  const [logs, setLogs] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true)
        
        // Phase 2: Refactored to fetch from the clean, single wide-table
        const { data, error } = await supabase
          .from('daily_financial_logs')
          .select('*')
          .order('date', { ascending: false })
          .limit(10)

        if (error || !data || data.length === 0) {
          throw new Error('Data not found, using fallback seed');
        }

        setLogs(data)
      } catch (e) {
        console.log('Using seeded fallback data for UI testing of formulas.');
        // Fallback to our 3 sample days
        const fallbackData = [
          {
            "date": "2026-03-03", // Day 3: Lottery & EBT Discrepancies
            "s1_over_short": 0.00,
            "s2_over_short": 0.00,
            "prev_s2_end_count": 510.00,
            "curr_s1_start_balance": 510.00,
            "s1_end_count": 500.00,
            "s2_start_balance": 500.00,
            "s1_till_drops": 1000.00,
            "s1_titan_deposits": 1000.00,
            "s2_till_drops": 1200.00,
            "s2_titan_deposits": 1200.00,
            "s1_ebt_sales": 200.00,
            "s2_ebt_sales": 300.00,
            "total_till_ebt": 500.00,
            "ebt_settlement_batch": 480.00,
            "lottery_tickets_books": 600.00,
            "total_sales_hisably": 550.00,
            "terminal_cashing_all": 350.00,
            "prizes_paid_books": 400.00,
            "total_sr50_net_sales": 200.00,
            "machine_sales_books": 180.00,
            
            "daily_over_short": 0.00,
            "overnight_handover_diff": 0.00,
            "shift_handover_diff": 0.00,
            "s1_deposit_diff": 0.00,
            "s2_deposit_diff": 0.00,
            "ebt_rec_diff": -20.00,
            "instant_sales_diff": 50.00,
            "cashing_diff": -50.00,
            "net_sales_diff": 20.00
          },
          {
            "date": "2026-03-02", // Day 2: Cash Shortages
            "s1_over_short": -5.00,
            "s2_over_short": 2.50,
            "prev_s2_end_count": 500.00,
            "curr_s1_start_balance": 490.00,
            "s1_end_count": 500.00,
            "s2_start_balance": 510.00,
            "s1_till_drops": 1000.00,
            "s1_titan_deposits": 990.00,
            "s2_till_drops": 1200.00,
            "s2_titan_deposits": 1200.00,
            "s1_ebt_sales": 150.00,
            "s2_ebt_sales": 250.00,
            "total_till_ebt": 400.00,
            "ebt_settlement_batch": 400.00,
            "lottery_tickets_books": 500.00,
            "total_sales_hisably": 500.00,
            "terminal_cashing_all": 300.00,
            "prizes_paid_books": 300.00,
            "total_sr50_net_sales": 100.00,
            "machine_sales_books": 100.00,
            
            "daily_over_short": -2.50,
            "overnight_handover_diff": -10.00,
            "shift_handover_diff": 10.00,
            "s1_deposit_diff": 10.00,
            "s2_deposit_diff": 0.00,
            "ebt_rec_diff": 0.00,
            "instant_sales_diff": 0.00,
            "cashing_diff": 0.00,
            "net_sales_diff": 0.00
          },
          {
            "date": "2026-03-01", // Day 1: The Perfect Day
            "s1_over_short": 0.00,
            "s2_over_short": 0.00,
            "prev_s2_end_count": 500.00,
            "curr_s1_start_balance": 500.00,
            "s1_end_count": 500.00,
            "s2_start_balance": 500.00,
            "s1_till_drops": 1000.00,
            "s1_titan_deposits": 1000.00,
            "s2_till_drops": 1200.00,
            "s2_titan_deposits": 1200.00,
            "s1_ebt_sales": 150.00,
            "s2_ebt_sales": 250.00,
            "total_till_ebt": 400.00,
            "ebt_settlement_batch": 400.00,
            "lottery_tickets_books": 500.00,
            "total_sales_hisably": 500.00,
            "terminal_cashing_all": 300.00,
            "prizes_paid_books": 300.00,
            "total_sr50_net_sales": 100.00,
            "machine_sales_books": 100.00,
            
            "daily_over_short": 0.00,
            "overnight_handover_diff": 0.00,
            "shift_handover_diff": 0.00,
            "s1_deposit_diff": 0.00,
            "s2_deposit_diff": 0.00,
            "ebt_rec_diff": 0.00,
            "instant_sales_diff": 0.00,
            "cashing_diff": 0.00,
            "net_sales_diff": 0.00
          }
        ];
        setLogs(fallbackData)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLogs()
  }, [])

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Summary</h1>
            <p className="text-sm text-slate-500 mt-1">Hierarchical multi-level variance drill-down based on the automated wide-tables.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse font-bold tracking-widest uppercase text-sm">Aggregating Financial Mathematics...</div>
        ) : logs.length === 0 ? (
           <div className="p-12 text-center text-slate-500 font-bold tracking-widest uppercase text-sm">No operation logs found</div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const uniqueId = log.id || log.date;
              const isExpanded = expandedId === uniqueId;
              
              // Frontend mapping of variances for grouping if the math wasn't already aggregated in SQL
              const dropsDiff = (log.s1_deposit_diff || 0) + (log.s2_deposit_diff || 0);
              const handovers = (log.shift_handover_diff || 0) + (log.overnight_handover_diff || 0);
              const lotteryDiff = (log.instant_sales_diff || 0) + (log.cashing_diff || 0) + (log.net_sales_diff || 0);
              const netPosition = (log.daily_over_short || 0) + dropsDiff + handovers + (log.ebt_rec_diff || 0) + lotteryDiff;

              return (
                <div key={uniqueId} className="bg-white border text-left border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-200">
                  {/* Top Level Glance Row */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : uniqueId)}
                    className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between items-center gap-4"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">{log.date}</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Financial Operations Log</p>
                      </div>
                    </div>

                    {/* Variances Row */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto overflow-x-auto justify-start sm:justify-end pb-2 sm:pb-0 hide-scrollbar">
                      <VarianceBadge label="Ov/Short" value={log.daily_over_short} />
                      <VarianceBadge label="Drops Diff" value={dropsDiff} />
                      <VarianceBadge label="Handovers" value={handovers} />
                      <VarianceBadge label="EBT Diff" value={log.ebt_rec_diff} />
                      <VarianceBadge label="Lottery Diff" value={lotteryDiff} />
                      
                      <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                      
                      <div className="flex flex-col items-center justify-center min-w-[80px]">
                        <span className="text-[9px] uppercase font-black text-indigo-400 mb-1">Net Position</span>
                        <span className={`text-base font-black ${netPosition < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {netPosition > 0 ? '+' : ''}{formatCurrency(netPosition)}
                        </span>
                      </div>
                      
                      <button className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors hidden sm:block">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/80 p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        
                        {/* Column 1: Cash & Handovers */}
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                               <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                 <DollarSign className="w-4 h-4 text-emerald-500" /> Over / Short
                               </h4>
                               <DocLink url={null} label="Till Reports" />
                            </div>
                            <DetailRow label="S1 Total Over/Short" value={log.s1_over_short} />
                            <DetailRow label="S2 Total Over/Short" value={log.s2_over_short} />
                            <DetailRow label="Daily Over/Short" value={log.daily_over_short} isHighlight />
                          </div>

                          <div>
                            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                              <ArrowRightLeft className="w-4 h-4 text-blue-500" /> Cash Handovers
                            </h4>
                            <DetailRow label="Prev S2 End Counts" value={log.prev_s2_end_count} />
                            <DetailRow label="Curr S1 Start Balance" value={log.curr_s1_start_balance} />
                            <DetailRow label="Overnight Handover Diff" value={log.overnight_handover_diff} isHighlight />
                            
                            <div className="mt-3">
                              <DetailRow label="S1 End Counts" value={log.s1_end_count} />
                              <DetailRow label="S2 Start Balance" value={log.s2_start_balance} />
                              <DetailRow label="Shift Handover Diff" value={log.shift_handover_diff} isHighlight />
                            </div>
                          </div>
                        </div>

                        {/* Column 2: EBT & Drops */}
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                               <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                 <FileBarChart className="w-4 h-4 text-purple-500" /> Loomis Drops Rec.
                               </h4>
                               <div className="flex gap-2">
                                 <DocLink url={null} label="Loomis S1" />
                                 <DocLink url={null} label="Loomis S2" />
                               </div>
                            </div>
                            <DetailRow label="S1 Till Drops" value={log.s1_till_drops} />
                            <DetailRow label="S1 Titan Deposits" value={log.s1_titan_deposits} />
                            <DetailRow label="S1 Deposit Diff" value={log.s1_deposit_diff} isHighlight />
                            
                            <div className="mt-3">
                              <DetailRow label="S2 Till Drops" value={log.s2_till_drops} />
                              <DetailRow label="S2 Titan Deposits" value={log.s2_titan_deposits} />
                              <DetailRow label="S2 Deposit Diff" value={log.s2_deposit_diff} isHighlight />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                <CheckCircle2 className="w-4 h-4 text-indigo-500" /> EBT Batch
                              </h4>
                              <DocLink url={null} label="EBT Settlement" />
                            </div>
                            <DetailRow label="S1 EBT Sales" value={log.s1_ebt_sales} />
                            <DetailRow label="S2 EBT Sales" value={log.s2_ebt_sales} />
                            <DetailRow label="Total Till EBT" value={log.total_till_ebt || (log.s1_ebt_sales + log.s2_ebt_sales)} />
                            <DetailRow label="EBT Settlement (Batch)" value={log.ebt_settlement_batch} />
                            <DetailRow label="EBT Rec Diff" value={log.ebt_rec_diff} isHighlight />
                          </div>
                        </div>

                        {/* Column 3: Lottery */}
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                               <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                 <AlertTriangle className="w-4 h-4 text-orange-500" /> Instant Lottery
                               </h4>
                            </div>
                            <DetailRow label="Lottery Tickets (Books)" value={log.lottery_tickets_books} />
                            <DetailRow label="Total Sales (Hisably)" value={log.total_sales_hisably} />
                            <DetailRow label="Instant Sales Diff" value={log.instant_sales_diff} isHighlight />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                <AlertTriangle className="w-4 h-4 text-orange-500" /> Terminal Cashing
                              </h4>
                              <DocLink url={null} label="Lottery Reports" />
                            </div>
                            <DetailRow label="Terminal Cashing (All)" value={log.terminal_cashing_all} />
                            <DetailRow label="Prizes Paid (Books)" value={log.prizes_paid_books} />
                            <DetailRow label="Cashing Diff" value={log.cashing_diff} isHighlight />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                <AlertTriangle className="w-4 h-4 text-orange-500" /> Draw Lottery
                              </h4>
                              <DocLink url={null} label="AGK Sales" />
                            </div>
                            <DetailRow label="Total R50 Net Sales" value={log.total_sr50_net_sales} />
                            <DetailRow label="Machine Sales (Books)" value={log.machine_sales_books} />
                            <DetailRow label="Net Sales Diff" value={log.net_sales_diff} isHighlight />
                          </div>

                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
