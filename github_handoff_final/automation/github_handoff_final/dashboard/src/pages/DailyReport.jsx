import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, subDays, addDays } from 'date-fns'
import { Loader2, Calendar, FileText, ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DailyReport() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dateParam = searchParams.get('date')
  const [selectedDate, setSelectedDate] = useState(dateParam || format(subDays(new Date(), 0), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchDailyReport(selectedDate)
  }, [selectedDate])

  async function fetchDailyReport(date) {
    try {
      setLoading(true)
      const prevDate = format(subDays(new Date(date), 1), 'yyyy-MM-dd')

      const [
        { data: tills },
        { data: prevTills },
        { data: loomis },
        { data: ebt },
        { data: agkData },
        { data: lotterySum },
        { data: hisably },
        { data: dashFinancials }
      ] = await Promise.all([
        supabase.from('automated_till_reports').select('*').eq('date', date),
        supabase.from('automated_till_reports').select('*').eq('date', prevDate),
        supabase.from('automated_loomis_data').select('*').eq('date', date),
        supabase.from('automated_ebt_settlements').select('*').eq('date', date),
        supabase.from('automated_agk_summary').select('*').eq('date', date),
        supabase.from('automated_lottery_data').select('*').eq('date', date),
        supabase.from('automated_hisably_lottery_tickets').select('*').eq('date', date),
        supabase.from('dashboard_financials').select('*').eq('date', date).maybeSingle()
      ])

      const calcTotal = (arr, field) => (arr || []).reduce((sum, item) => sum + (Number(item[field]) || 0), 0)

      // Till Helper
      const getShift = (row) => (row.till_start_time || '').localeCompare('14:00:00') < 0 ? 'Shift 1' : 'Shift 2'
      const getTillVal = (arr, shift, tillNum, prop) => {
        const row = (arr || []).find(r => getShift(r) === shift && Number(r.terminal_id) === tillNum)
        return row ? Number(row[prop]) : 0
      }

      const agk = (agkData && agkData.length > 0) ? agkData[0] : null

      // 1. Tills & Loomis
      const s1r1_drop = getTillVal(tills, 'Shift 1', 1, 'safe_drops')
      const s1r2_drop = getTillVal(tills, 'Shift 1', 2, 'safe_drops')
      const s1_total_drop = s1r1_drop + s1r2_drop
      const s1_titan = calcTotal((loomis || []).filter(r => r.shift_number === 1), 'total_value')

      const s2r1_drop = getTillVal(tills, 'Shift 2', 1, 'safe_drops')
      const s2r2_drop = getTillVal(tills, 'Shift 2', 2, 'safe_drops')
      const s2_total_drop = s2r1_drop + s2r2_drop
      const s2_titan = calcTotal((loomis || []).filter(r => r.shift_number === 2), 'total_value')

      const s1_os_r1 = getTillVal(tills, 'Shift 1', 1, 'over_short')
      const s1_os_r2 = getTillVal(tills, 'Shift 1', 2, 'over_short')
      const s1_total_os = s1_os_r1 + s1_os_r2

      const s2_os_r1 = getTillVal(tills, 'Shift 2', 1, 'over_short')
      const s2_os_r2 = getTillVal(tills, 'Shift 2', 2, 'over_short')
      const s2_total_os = s2_os_r1 + s2_os_r2

      const daily_os = s1_total_os + s2_total_os

      // Counted Cash Handovers
      const s1r1_counted = getTillVal(tills, 'Shift 1', 1, 'counted_cash')
      const s1r2_counted = getTillVal(tills, 'Shift 1', 2, 'counted_cash')
      const s1_total_counted = s1r1_counted + s1r2_counted

      const s2r1_start = getTillVal(tills, 'Shift 2', 1, 'beginning_balance')
      const s2r2_start = getTillVal(tills, 'Shift 2', 2, 'beginning_balance')
      const s2_total_start = s2r1_start + s2r2_start

      const handover_diff = s1_total_counted - s2_total_start

      // Overnight Handover
      const prev_s2r1_counted = getTillVal(prevTills, 'Shift 2', 1, 'counted_cash')
      const prev_s2r2_counted = getTillVal(prevTills, 'Shift 2', 2, 'counted_cash')
      const prev_s2_total_counted = prev_s2r1_counted + prev_s2r2_counted
      
      const s1r1_start = getTillVal(tills, 'Shift 1', 1, 'beginning_balance')
      const s1r2_start = getTillVal(tills, 'Shift 1', 2, 'beginning_balance')
      const s1_total_start = s1r1_start + s1r2_start
      
      const overnight_diff = prev_s2_total_counted - s1_total_start

      // 2. EBT Sales
      const s1_ebt = getTillVal(tills, 'Shift 1', 1, 'ebt_safe_drops') + getTillVal(tills, 'Shift 1', 2, 'ebt_safe_drops')
      const s2_ebt = getTillVal(tills, 'Shift 2', 1, 'ebt_safe_drops') + getTillVal(tills, 'Shift 2', 2, 'ebt_safe_drops')
      const total_shift_ebt = s1_ebt + s2_ebt
      const ebt_batch = calcTotal(ebt, 'total_amount')
      const ebt_diff = ebt_batch - total_shift_ebt

      // 3. Lottery Match (Hisably)
      const dashRow = dashFinancials || {} // fallback
      
      const tickets_daily = Number(dashRow.lottery_tickets_daily_books || 0)
      const hisably_sales = calcTotal(hisably, 'today_sales')
      const tickets_diff = hisably_sales - tickets_daily

      // 4. Lottery Terminals (SR34 & SR50 with Fallbacks)
      const ls = lotterySum || []
      
      const getValidReport = (reports, termSuffix, typeName, fallbackName) => {
         const termReports = reports.filter(r => String(r.terminal_id || '').endsWith(termSuffix))
         
         const attachSortMetric = (r) => {
            const h = parseInt((r.time||'00:00:00').split(':')[0], 10)
            const sortH = h < 4 ? h + 24 : h
            const minSec = parseInt((r.time||'00:00:00').replace(/:/g,'').slice(2,6), 10) || 0
            return (sortH * 10000) + minSec
         }
         
         const primary = termReports.filter(r => (r.report_type||'').toLowerCase().includes(typeName))
         if (primary.length > 0) {
            primary.sort((a,b) => attachSortMetric(b) - attachSortMetric(a))
            return primary[0]
         }
         
         if (fallbackName) {
            const fallback = termReports.filter(r => (r.report_type||'').toLowerCase().includes(fallbackName))
            if (fallback.length > 0) {
               fallback.sort((a,b) => attachSortMetric(b) - attachSortMetric(a))
               return fallback[0]
            }
         }
         return null
      }

      const rep400_50 = getValidReport(ls, '400', '50', '51')
      const rep401_50 = getValidReport(ls, '401', '50', '51')
      const rep400_34 = getValidReport(ls, '400', '34', '35')
      const rep401_34 = getValidReport(ls, '401', '34', '35')

      const r34_cashing_400 = rep400_34 ? Number(rep400_34.cashes || 0) : 0
      const r34_cashing_401 = rep401_34 ? Number(rep401_34.cashes || 0) : 0
      const r50_cashes_400 = rep400_50 ? Number(rep400_50.cashes || 0) : 0
      const r50_cashes_401 = rep401_50 ? Number(rep401_50.cashes || 0) : 0
      
      const total_term_cashing = r34_cashing_400 + r34_cashing_401 + r50_cashes_400 + r50_cashes_401
      const prizes_paid = Number(agk?.lottery_paid_outs || 0)
      const cashing_diff = prizes_paid - total_term_cashing

      const r50_net_400 = rep400_50 ? Number(rep400_50.net_sales || 0) : 0
      const r50_net_401 = rep401_50 ? Number(rep401_50.net_sales || 0) : 0
      const total_r50_net = r50_net_400 + r50_net_401
      const machine_daily = Number(agk?.lottery_machine_sales || 0)
      const r50_diff = machine_daily - total_r50_net

      let missingCount = 0
      if (!tills || tills.length === 0) missingCount++
      if (!loomis || loomis.length === 0) missingCount++
      if (!agkData || agkData.length === 0) missingCount++
      if (!lotterySum || lotterySum.length === 0) missingCount++
      if (!hisably || hisably.length === 0) missingCount++

      setData({
        s1r1_drop, s1r2_drop, s1_total_drop, s1_titan, s1_diff: s1_total_drop - s1_titan,
        s2r1_drop, s2r2_drop, s2_total_drop, s2_titan, s2_diff: s2_total_drop - s2_titan,
        s1_total_os, s2_total_os, daily_os,
        s1r1_counted, s1r2_counted, s1_total_counted,
        s2r1_start, s2r2_start, s2_total_start, handover_diff,
        prev_s2_total_counted, s1_total_start, overnight_diff,
        s1_ebt, s2_ebt, total_shift_ebt, ebt_batch, ebt_diff,
        tickets_daily, hisably_sales, tickets_diff,
        r34_cashing_400, r34_cashing_401, r50_cashes_400, r50_cashes_401, total_term_cashing, prizes_paid, cashing_diff,
        r50_net_400, r50_net_401, total_r50_net, machine_daily, r50_diff, missingDocsCount: missingCount
      })

    } catch (error) {
      console.error(error)
      toast.error('Failed to aggregate dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }

  const RenderVar = ({ label, value, type = 'dollar', varianceObj = null }) => {
    let valStr = ''
    if (type === 'dollar') valStr = `$${Number(value).toFixed(2)}`
    else if (type === 'num') valStr = Number(value).toFixed(2)
    else valStr = value
    
    let colorClass = 'text-gray-900'
    let postfix = ''
    if (varianceObj) {
      const v = Number(value)
      if (v < 0) { colorClass = 'text-red-600'; postfix = ' Short' }
      else if (v > 0) { colorClass = 'text-green-600'; postfix = ' Over' }
      else { colorClass = 'text-gray-500'; postfix = ' Balanced' }
    }

    return (
      <div className="flex justify-between py-1 border-b border-gray-100 last:border-0 text-sm">
        <span className={varianceObj ? "font-bold text-gray-800" : "text-gray-600"}>{label}</span>
        <span className={`font-mono text-right ${colorClass} ${varianceObj ? 'font-bold' : ''}`}>
           {valStr} {postfix}
        </span>
      </div>
    )
  }

  const PageDateNav = () => (
    <div className="flex items-center gap-2">
      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
        className="block px-3 py-2 border-gray-300 focus:ring-petrola-500 focus:border-petrola-500 sm:text-sm rounded-md shadow-sm border bg-gray-50 font-bold text-gray-700"
      />
    </div>
  )

  if (loading || !data) {
     return <div className="flex justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-petrola-500" /></div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <button 
          onClick={() => navigate('/cash')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-md text-sm font-bold rounded-md text-white bg-petrola-600 hover:bg-petrola-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-petrola-500"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Cash & Shifts
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-petrola-600"/>
          Daily Sheet Raw Data
        </h2>
        <PageDateNav />
      </div>

      {data.missingDocsCount > 0 && (
        <div 
           onClick={() => navigate('/tracker')}
           className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800">Missing Ingestion Documents</h3>
              <p className="mt-0.5 text-sm text-amber-700 font-medium">There are {data.missingDocsCount} missing operations documents for this date. Click here to trace the Data Tracker.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Column */}
        <div className="space-y-6">
           <div className="bg-white shadow border border-gray-200 rounded-lg p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-3 border-b pb-2">Shift 1 & 2 Cash</h3>
              <RenderVar label="Shift 1 Till Drops (R1)" value={data.s1r1_drop} />
              <RenderVar label="Shift 1 Till Drops (R2)" value={data.s1r2_drop} />
              <RenderVar label="Total Shift 1 Till Drops" value={data.s1_total_drop} />
              <RenderVar label="Shift 1 Titan Deposits" value={data.s1_titan} />
              <RenderVar label="Shift 1 Drops vs Titan Diff" value={data.s1_diff} varianceObj />
              <div className="h-4"></div>
              <RenderVar label="Shift 2 Till Drops (R1)" value={data.s2r1_drop} />
              <RenderVar label="Shift 2 Till Drops (R2)" value={data.s2r2_drop} />
              <RenderVar label="Total Shift 2 Till Drops" value={data.s2_total_drop} />
              <RenderVar label="Shift 2 Titan Deposits" value={data.s2_titan} />
              <RenderVar label="Shift 2 Drops vs Titan Diff" value={data.s2_diff} varianceObj />
              <div className="h-4"></div>
              <RenderVar label="Shift 1 Total Over/Short" value={data.s1_total_os} varianceObj />
              <RenderVar label="Shift 2 Total Over/Short" value={data.s2_total_os} varianceObj />
              <RenderVar label="Daily Total Over/Short (Tills)" value={data.daily_os} varianceObj />
           </div>

           <div className="bg-white shadow border border-gray-200 rounded-lg p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-3 border-b pb-2">Shift Handovers</h3>
              <RenderVar label="S1 R1 Counted Cash" value={data.s1r1_counted} />
              <RenderVar label="S1 R2 Counted Cash" value={data.s1r2_counted} />
              <RenderVar label="Total S1 Counted Cash" value={data.s1_total_counted} />
              <RenderVar label="S2 R1 Beginning Balance" value={data.s2r1_start} />
              <RenderVar label="S2 R2 Beginning Balance" value={data.s2r2_start} />
              <RenderVar label="Total S2 Beginning Balance" value={data.s2_total_start} />
              <RenderVar label="Handover Difference" value={data.handover_diff} varianceObj />
              <div className="h-4"></div>
              <RenderVar label="Prev S2 R1 Counted Cash" value={data.prev_s2_total_counted - data.prev_s2_total_counted} />
              <RenderVar label="Total Prev Day S2 Counted" value={data.prev_s2_total_counted} />
              <RenderVar label="Total Curr Day S1 Begin" value={data.s1_total_start} />
              <RenderVar label="Overnight Handover Difference" value={data.overnight_diff} varianceObj />
           </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           <div className="bg-white shadow border border-gray-200 rounded-lg p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-3 border-b pb-2">EBT Reconciliation</h3>
              <RenderVar label="Shift 1 EBT Sales" value={data.s1_ebt} />
              <RenderVar label="Shift 2 EBT Sales" value={data.s2_ebt} />
              <RenderVar label="Total Shift EBT Sales" value={data.total_shift_ebt} />
              <RenderVar label="EBT Total (Batch)" value={data.ebt_batch} />
              <RenderVar label="EBT Reconciliation Diff" value={data.ebt_diff} varianceObj />
           </div>

           <div className="bg-white shadow border border-purple-200 rounded-lg p-5">
              <h3 className="font-bold text-lg text-purple-900 mb-3 border-b border-purple-100 pb-2">Lottery: Tickets & Hisably</h3>
              <RenderVar label="Lottery Tickets (Daily Books)" value={data.tickets_daily} />
              <RenderVar label="Total Lottery Sales (Hisably)" value={data.hisably_sales} />
              <RenderVar label="Tickets vs Hisably Sales Diff" value={data.tickets_diff} varianceObj />
           </div>

           <div className="bg-white shadow border border-blue-200 rounded-lg p-5">
              <h3 className="font-bold text-lg text-snapmart-900 mb-3 border-b border-blue-100 pb-2">Lottery: SR Terminals</h3>
              <RenderVar label="SR 34 Cashing (Term 400)" value={data.r34_cashing_400} />
              <RenderVar label="SR 34 Cashing (Term 401)" value={data.r34_cashing_401} />
              <RenderVar label="SR 50 Cashes (Term 400)" value={data.r50_cashes_400} />
              <RenderVar label="SR 50 Cashes (Term 401)" value={data.r50_cashes_401} />
              <RenderVar label="Total Lottery Terminal Cashing" value={data.total_term_cashing} />
              <RenderVar label="Lottery Prizes Paid (Daily Books)" value={data.prizes_paid} />
              <RenderVar label="Cashing vs Prizes Paid Diff" value={data.cashing_diff} varianceObj />
              <div className="h-4"></div>
              <RenderVar label="SR 50 Net Sales (Term 400)" value={data.r50_net_400} />
              <RenderVar label="SR 50 Net Sales (Term 401)" value={data.r50_net_401} />
              <RenderVar label="Total SR 50 Net Sales" value={data.total_r50_net} />
              <RenderVar label="Lottery Machine (Daily Books)" value={data.machine_daily} />
              <RenderVar label="SR 50 Net Sales vs Machine Diff" value={data.r50_diff} varianceObj />
           </div>
        </div>

      </div>
    </div>
  )
}
