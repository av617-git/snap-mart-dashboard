import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Ticket, Search, BarChart3, AlertTriangle, CheckCircle2, Sigma, DollarSign, Wallet, Loader2 } from 'lucide-react'

const parseExcelDate = (val) => {
  if (!val) return 'Unknown'
  const strVal = String(val).trim()
  if (/^\d{5}$/.test(strVal)) {
     return new Date((Number(strVal) - 25569) * 86400 * 1000).toISOString().split('T')[0]
  }
  return strVal.split('T')[0].split(' ')[0]
}

export default function LotteryAudit() {
  const [activeTab, setActiveTab] = useState('activations')
  const [loading, setLoading] = useState(false)
  const [activations, setActivations] = useState([])
  const [instantAudit, setInstantAudit] = useState([])
  const [drawGames, setDrawGames] = useState([])

  useEffect(() => {
     fetchTabData(activeTab)
  }, [activeTab])

  async function fetchTabData(tab) {
    setLoading(true)
    try {
      if (tab === 'activations') {
         const { data: stateData } = await supabase.from('automated_ticket_activations').select('*').order('date', { ascending: false }).limit(200)
         const { data: hisablyData } = await supabase.from('automated_hisably_activations').select('*').order('date', { ascending: false }).limit(2000)

         const allActivationsMap = new Map()

         if (stateData) {
            stateData.filter(d => d.game && d.book && !isNaN(Number(d.game))).forEach(d => {
               const cleanDate = parseExcelDate(d.date)
               const gameId = Number(d.game)
               const bookId = Number(d.book)
               const key = `${gameId}_${bookId}`
               
               allActivationsMap.set(key, {
                  id: `state_${d.id}`,
                  date: cleanDate,
                  game: d.game,
                  book: d.book,
                  state_active: 'Yes',
                  hisably_scan: 'No',
                  documentLink: d.document_link || null
               })
            })
         }
         
         if (hisablyData) {
            hisablyData.filter(d => d.game_number && d.book_number).forEach(d => {
               const cleanDate = parseExcelDate(d.date)
               const gameId = Number(d.game_number)
               const bookId = Number(d.book_number)
               const key = `${gameId}_${bookId}`
               
               if (allActivationsMap.has(key)) {
                  const existing = allActivationsMap.get(key)
                  existing.hisably_scan = 'Yes'
               } else {
                  allActivationsMap.set(key, {
                     id: `hisably_${d.id}`,
                     date: cleanDate,
                     game: String(d.game_number),
                     book: String(d.book_number),
                     state_active: 'No',
                     hisably_scan: 'Yes',
                     documentLink: null
                  })
               }
            })
         }

         const mergedArray = Array.from(allActivationsMap.values()).sort((a, b) => b.date.localeCompare(a.date))
         setActivations(mergedArray)
      } else if (tab === 'audit') {
         const { data: auditData } = await supabase.from('instant_ticket_audit').select('*').order('date', { ascending: false }).limit(60)
         
         let gridData = []
         for (let page = 0; page < 8; page++) {
            const { data: pagedData } = await supabase.from('automated_hisably_lottery_tickets')
               .select('game_number, book_number, game_price, quantity_sold, today_sales')
               .order('id', { ascending: false })
               .range(page * 1000, (page + 1) * 1000 - 1)
            if (pagedData && pagedData.length > 0) gridData = [...gridData, ...pagedData]
            if (!pagedData || pagedData.length < 1000) break
         }
         
         if (auditData) {
           const cleanAudit = auditData.filter(d => d.game && d.book && !isNaN(Number(d.game)))
           setInstantAudit(cleanAudit.map(d => {
             const cleanDate = parseExcelDate(d.date)
             
             let t_sold = 0
             let scanned = 0
             let price = 0
             
             if (gridData) {
                const sales = gridData.filter(h => String(h.game_number) === String(d.game) && String(h.book_number) === String(d.book))
                sales.forEach(sale => {
                   t_sold += Number(sale.quantity_sold || 0)
                   scanned += Number(sale.today_sales || 0)
                   if (Number(sale.game_price || 0) > 0) price = Number(sale.game_price)
                })
             }
             
             const expected = t_sold * price
             const variance = scanned - expected
             
             return {
               id: d.id, date: cleanDate, game: d.game || 'N/A', book: d.book || 'N/A', 
               tickets_sold: t_sold, price, expected, scanned, variance
             }
           }))
         }
      } else if (tab === 'draw') {
         const { data } = await supabase.from('automated_agk_summary').select('*').order('date', { ascending: false }).limit(20)
         
         let summaryData = []
         for (let page = 0; page < 8; page++) {
            const { data: pagedData } = await supabase.from('automated_lottery_data')
               .select('date, report_type, terminal_id, time, document_link, net_sales')
               .order('id', { ascending: false })
               .range(page * 1000, (page + 1) * 1000 - 1)
            if (pagedData && pagedData.length > 0) summaryData = [...summaryData, ...pagedData]
            if (!pagedData || pagedData.length < 1000) break
         }

          if (data) {
           const docMap = {}
           const salesMap = {}
           const breakdownMap = {}
           if (summaryData) {
              const latestReports = {}
              summaryData.forEach(s => {
                 const cDate = parseExcelDate(s.date)
                 const reportName = (s.report_type || '').toLowerCase()
                 const isSR50 = reportName.includes('50')
                 const isSR51 = reportName.includes('51')
                 
                 const terminalRaw = String(s.terminal_id || 'Unknown')
                 let terminal = null
                 if (terminalRaw.endsWith('400')) terminal = 'T400'
                 else if (terminalRaw.endsWith('401')) terminal = 'T401'
                 
                 if (!terminal) return // We only care about 400 and 401
                 
                 if (!latestReports[cDate]) latestReports[cDate] = { 'T400': null, 'T401': null }
                 
                 const currentStored = latestReports[cDate][terminal]
                 const hourString = String(s.time || '00:00:00').split(':')[0]
                 const hour = parseInt(hourString, 10) || 0
                 
                 const sortHour = hour < 4 ? hour + 24 : hour
                 const rawMinSec = parseInt(String(s.time || '00:00:00').replace(/:/g,'').slice(2,6), 10) || 0
                 const sortMetric = (sortHour * 10000) + rawMinSec
                 
                 if (isSR50) {
                        if (!currentStored || currentStored.type !== 'SR 50' || sortMetric > currentStored.sortMetric) {
                            latestReports[cDate][terminal] = { 
                               type: 'SR 50',
                               time: s.time,
                               sortMetric,
                               sales: Number(s.net_sales) || 0, 
                               document: s.document_link 
                            }
                        }
                 } else if (isSR51) {
                    if (!currentStored || currentStored.type !== 'SR 50') {
                        if (!currentStored || sortMetric > currentStored.sortMetric) {
                            latestReports[cDate][terminal] = {
                               type: 'SR 51',
                               time: s.time,
                               sortMetric,
                               sales: Number(s.net_sales) || 0,
                               document: s.document_link
                            }
                        }
                    }
                 }
              })

              Object.keys(latestReports).forEach(date => {
                 let dailyTotal = 0
                 const docs = new Set()
                 const breakdownParts = []
                 
                 Object.keys(latestReports[date]).forEach(termId => {
                    const report = latestReports[date][termId]
                    if (report) {
                       dailyTotal += report.sales
                       breakdownParts.push(`${termId}: $${report.sales.toFixed(2)}${report.type === 'SR 51' ? ' (SR51)' : ''}`)
                       if (report.document && report.document.startsWith('http')) {
                          docs.add(report.document)
                       }
                    } else {
                       breakdownParts.push(`${termId}: Missing`)
                    }
                 })
                 
                 salesMap[date] = dailyTotal
                 breakdownMap[date] = breakdownParts
                 docMap[date] = Array.from(docs)
              })
           }

           setDrawGames(data.map(d => {
              const cleanDate = parseExcelDate(d.date)
              const agk = Number(d.lottery_machine_sales) || 0
              const sr50 = salesMap[cleanDate] || 0
              return {
                 id: d.id, date: cleanDate, 
                 agkOnline: agk, 
                 sr50Online: sr50, 
                 variance: agk - sr50,
                 breakdownArray: breakdownMap[cleanDate] || [],
                 agkDocument: d.document_link,
                 documentLinks: docMap[cleanDate] || []
              }
           }))
         }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Hardcoded Mock Data for Local Testing


  const tabs = [
    { id: 'activations', name: 'Ticket Activations (Hisably vs Lottery)', icon: Ticket },
    { id: 'audit', name: 'Instant Ticket Audit', icon: Search },
    { id: 'draw', name: 'Draw Games Summary', icon: BarChart3 }
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Ticket className="w-8 h-8 mr-3 text-purple-600" />
            Lottery & Scratch Ticket Audit
          </h2>
          <p className="text-sm text-gray-500 mt-1">Cross-reference state lottery activations against in-store physical scans to detect theft instantly.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* Ticket Activations Tab */}
          {activeTab === 'activations' && (
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Missing & Stolen Book Detector</h3>
               <div className="overflow-x-auto rounded-lg border border-gray-200">
                 <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-100 uppercase text-gray-600">
                       <tr>
                         <th className="p-3">Date</th>
                         <th className="p-3">Game #</th>
                         <th className="p-3">Book #</th>
                         <th className="p-3 text-center">
                           Lottery Activation<br/>
                           <span className="text-[10px] text-gray-500 font-medium normal-case tracking-normal">(Click 'Yes' for State Report)</span>
                         </th>
                         <th className="p-3 text-center">Hisably Activation</th>
                         <th className="p-3 text-center">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="8" className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" /></td></tr>
                    ) : activations.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-10 text-gray-500">No activation data found.</td></tr>
                    ) : activations.map((row) => {
                          const isSuspicious = row.state_active === 'Yes' && row.hisably_scan === 'No'
                          const isOrphaned = row.state_active === 'No' && row.hisably_scan === 'Yes'
                          
                          let rowClass = 'hover:bg-gray-50'
                          if (isSuspicious) rowClass = 'bg-red-50 hover:bg-red-100 transition-colors'
                          if (isOrphaned) rowClass = 'bg-amber-50 hover:bg-amber-100 transition-colors'
                          
                          return (
                            <tr key={row.id} className={rowClass}>
                               <td className="p-3 py-4 text-gray-900 font-medium">{row.date}</td>
                               <td className="p-3 py-4 text-gray-900 font-semibold">{row.game}</td>
                               <td className="p-3 py-4 text-gray-600">{row.book}</td>
                               <td className="p-3 py-4 text-center">
                                  {row.documentLink && row.documentLink.startsWith('http') ? (
                                    <a href={row.documentLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 shadow-sm transition-all cursor-pointer hover:underline underline-offset-2">
                                       {row.state_active}
                                    </a>
                                  ) : (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold border ${row.state_active === 'Yes' ? 'bg-gray-50 text-gray-800 border-gray-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                                       {row.state_active}
                                    </span>
                                  )}
                               </td>
                               <td className="p-3 py-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${row.hisably_scan === 'Yes' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                     {row.hisably_scan}
                                  </span>
                               </td>
                               <td className="p-3 py-4 text-center">
                                  {isSuspicious ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                       <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ⚠️ MISSING / STOLEN
                                    </span>
                                  ) : isOrphaned ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                       <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ⚠️ STORE ONLY
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                       <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified
                                    </span>
                                  )}
                               </td>
                            </tr>
                          )
                       })}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* Instant Ticket Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Instant Ticket Ledger (Active Books)</h3>
               <div className="overflow-x-auto rounded-lg border border-gray-200">
                 <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-100 uppercase text-gray-600">
                       <tr>
                         <th className="p-3">Date</th>
                         <th className="p-3">Game #</th>
                         <th className="p-3">Book #</th>
                         <th className="p-3 text-center">Tickets Sold</th>
                         <th className="p-3 text-right">Price</th>
                         <th className="p-3 text-right">Expected Revenue</th>
                         <th className="p-3 text-right">Scanned Sales</th>
                         <th className="p-3 text-right">Variance</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                       {loading ? (
                      <tr><td colSpan="5" className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" /></td></tr>
                    ) : instantAudit.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-10 text-gray-500">No audit data found.</td></tr>
                    ) : instantAudit.map((row) => {
                          const isShort = row.variance < 0
                          return (
                            <tr key={row.id} className={isShort ? 'bg-red-50 hover:bg-red-100 transition-colors' : 'hover:bg-gray-50'}>
                               <td className="p-3 py-4 text-gray-900 font-medium">{row.date}</td>
                               <td className="p-3 py-4 text-gray-900 font-semibold">{row.game}</td>
                               <td className="p-3 py-4 text-gray-600">{row.book}</td>
                               <td className="p-3 py-4 text-center font-bold bg-gray-50/50">{row.tickets_sold}</td>
                               <td className="p-3 py-4 text-right text-gray-500">${Number(row.price || 0).toFixed(2)}</td>
                               <td className="p-3 py-4 text-right font-medium">${Number(row.expected || 0).toFixed(2)}</td>
                               <td className="p-3 py-4 text-right font-bold text-blue-700">${Number(row.scanned || 0).toFixed(2)}</td>
                               <td className="p-3 py-4 text-right">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${isShort ? 'bg-red-100 text-red-800 border border-red-200' : 'text-gray-500'}`}>
                                    {row.variance < 0 ? '' : '+'}${Number(row.variance || 0).toFixed(2)}
                                  </span>
                               </td>
                            </tr>
                          )
                       })}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* Draw Games Summary */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-2">Draw Games Audit (AGK vs SR 50)</h3>
               <div className="overflow-x-auto rounded-lg border border-gray-200">
                 <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-100 uppercase text-gray-600">
                       <tr>
                         <th className="p-3">Date</th>
                         <th className="p-3 text-center">
                           State Lottery Report<br/>
                           <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">(Click for SR 50)</span>
                         </th>
                         <th className="p-3 text-right">AGK Terminal Sales</th>
                         <th className="p-3 text-right">SR 50 Online Sales</th>
                         <th className="p-3 text-right">Variance</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? <tr><td colSpan="5" className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" /></td></tr> : drawGames.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-gray-500">No mapped draw game metrics found.</td></tr> : drawGames.map((row) => {
                           const isShort = row.variance !== 0
                           return (
                             <tr key={row.id} className={isShort ? 'bg-amber-50 hover:bg-amber-100 transition-colors' : 'hover:bg-gray-50'}>
                                <td className="p-3 py-4 text-gray-900 font-medium">{row.date}</td>
                                <td className="p-3 py-4 text-center">
                                  {row.documentLinks && row.documentLinks.length > 0 ? (
                                    <a href={row.documentLinks[0]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 shadow-sm transition-all cursor-pointer hover:underline underline-offset-2">
                                       View SR 50
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-800 border border-gray-200">
                                       Missing
                                    </span>
                                  )}
                               </td>
                               <td className="p-3 py-4 text-right">
                                  <div className="font-medium text-gray-800">${Number(row.agkOnline || 0).toFixed(2)}</div>
                                  {row.agkDocument && (
                                    <a href={row.agkDocument} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer hover:underline">
                                       View AGK
                                    </a>
                                  )}
                               </td>
                               <td className="p-3 py-4 text-right">
                                  <div className="font-bold text-blue-700">${Number(row.sr50Online || 0).toFixed(2)}</div>
                                  {row.breakdownArray && row.breakdownArray.length > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-end mt-1.5">
                                      {row.breakdownArray.map((item, idx) => (
                                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                                           {item}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                               </td>
                               <td className="p-3 py-4 text-right">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${isShort ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'text-gray-500'}`}>
                                    {row.variance > 0 ? '+' : ''}${Number(row.variance || 0).toFixed(2)}
                                  </span>
                               </td>
                            </tr>
                          )
                       })}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
