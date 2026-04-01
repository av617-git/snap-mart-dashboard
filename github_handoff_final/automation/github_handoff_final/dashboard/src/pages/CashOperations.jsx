import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Banknote, Wallet, ShieldCheck, CreditCard, AlertTriangle, CheckCircle2, ArrowRight, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

export default function CashOperations() {
  const [activeTab, setActiveTab] = useState('shifts')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [shiftReports, setShiftReports] = useState([])
  const [loomisDrops, setLoomisDrops] = useState([])
  const [ebtSettlements, setEbtSettlements] = useState([])
  const [summaryMetrics, setSummaryMetrics] = useState({ netOverShort: 0, totalSafeCash: 0, pendingEBT: 0 })

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
  
  const [expandedGroups, setExpandedGroups] = useState({
     [currentYear]: true,
     [`${currentYear}-${currentMonth}`]: true
  })

  const toggleGroup = (key) => {
     setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
     fetchTabData(activeTab)
  }, [activeTab])

  async function fetchTabData(tab) {
    setLoading(true)
    try {
      if (tab === 'shifts') {
         const { data } = await supabase.from('automated_till_reports').select('*').order('date', { ascending: false }).limit(200)
         if (data) {
           const mappedReports = data.map(d => {
             const shiftName = (d.till_start_time || '').localeCompare('14:00:00') < 0 ? 'Shift 1' : 'Shift 2'
             return {
               id: d.id,
               date: d.date,
               shift: shiftName,
               cashier: d.terminal_id || 'Unknown',
               drops: Number(d.safe_drops) || 0,
               payouts: Number(d.paid_outs) || 0,
               overShort: Number(d.over_short) || 0,
               documentLink: d.document_link || null,
               isMissing: false
             }
           })
           
           const sortedReports = mappedReports.sort((a, b) => {
             if (a.date > b.date) return -1;
             if (a.date < b.date) return 1;
             if (a.shift > b.shift) return 1;
             if (a.shift < b.shift) return -1;
             return (Number(a.cashier) || 0) - (Number(b.cashier) || 0);
           })
           
           setShiftReports(sortedReports)
         }
      } else if (tab === 'loomis') {
         const { data } = await supabase.from('automated_loomis_data').select('*').order('date', { ascending: false }).limit(200)
         if (data) {
           const mappedLoomis = data.map(d => ({
             id: d.id,
             date: d.date,
             shift: `Shift ${d.shift_number || 1}`,
             documentLink: d.document_link || null,
             total_dropped: Number(d.total_value) || 0,
             isMissing: false
           }))

           const sortedLoomis = mappedLoomis.sort((a,b) => {
             if (a.date > b.date) return -1;
             if (a.date < b.date) return 1;
             if (a.shift > b.shift) return 1;
             if (a.shift < b.shift) return -1;
             return 0;
           })

           setLoomisDrops(sortedLoomis)
         }
      } else if (tab === 'ebt') {
         const { data: tillRef } = await supabase.from('automated_till_reports').select('date, ebt_safe_drops').order('date', { ascending: false }).limit(600)
         
         const agkMap = {}
         if (tillRef) {
            tillRef.forEach(d => {
               if (!agkMap[d.date]) agkMap[d.date] = 0
               agkMap[d.date] += (Number(d.ebt_safe_drops) || 0)
            })
         }
         
         const allDates = [...new Set(Object.keys(agkMap))].sort((a,b) => b.localeCompare(a)).slice(0, 30)

         const { data: ebtData } = await supabase.from('automated_ebt_settlements').select('*').in('date', allDates)
         
         // Aggregate multiple EBT settlements on the same date via reducing batch totals safely
         const terminalMap = {}
         if (ebtData) {
            ebtData.forEach(d => { 
                if (!terminalMap[d.date]) terminalMap[d.date] = { ...d, total_amount: 0 }
                terminalMap[d.date].total_amount += Number(d.total_amount) || 0
            })
         }

         const finalEbt = allDates.map(dt => {
            const agk = agkMap[dt] || 0
            
            if (terminalMap[dt]) {
               const batch = terminalMap[dt].total_amount
               return { 
                  id: terminalMap[dt].id, 
                  date: dt, 
                  documentLink: terminalMap[dt].document_link || null, 
                  agkTotal: agk, 
                  batchTotal: batch, 
                  variance: batch - agk, 
                  isMissing: false 
               }
            } else {
               return { id: `ebt_missing_${dt}`, date: dt, agkTotal: agk, isMissing: true }
            }
         })

         setEbtSettlements(finalEbt)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }



  const tabs = [
    { id: 'shifts', name: 'Till Reports', icon: Wallet },
    { id: 'loomis', name: 'Loomis Armored Drops', icon: ShieldCheck },
    { id: 'ebt', name: 'EBT', icon: CreditCard }
  ]

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Banknote className="w-8 h-8 mr-3 text-emerald-600" />
            Cash Operations
          </h2>
          <p className="text-sm text-gray-500 mt-1">Audit shift performance, armored car pickups, and batch terminal settlements.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* Till Reports Tab */}
          {activeTab === 'shifts' && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
               <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 uppercase text-gray-600">
                     <tr>
                       <th className="p-3">Date</th><th className="p-3">Shift</th><th className="p-3">Till</th>
                       <th className="p-3 text-right">Cashier Safe Drops</th><th className="p-3 text-right">Paid Outs</th>
                       <th className="p-3 text-right">Over/Short</th><th className="p-3 text-right">Document Link</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     {loading ? <tr><td colSpan="7" className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" /></td></tr> : shiftReports.map((row) => {
                        const isPerfect = row.overShort === 0
                        const isShort = row.overShort < 0
                        const osClass = isPerfect ? 'text-gray-500 font-medium' : isShort ? 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded' : 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded'

                        if (row.isMissing) {
                           return (
                             <tr key={row.id} className="bg-red-50/60 hover:bg-red-50">
                                <td className="p-3 text-red-900 font-medium whitespace-nowrap">{row.date}</td>
                                <td className="p-3 text-red-800 whitespace-nowrap">{row.shift}</td>
                                <td className="p-3 text-red-900 font-bold whitespace-nowrap border-r border-red-200">{row.cashier}</td>
                                <td colSpan="4" className="p-3 text-center text-red-600 font-bold uppercase tracking-widest text-xs">Missing</td>
                             </tr>
                           )
                        }

                        return (
                          <tr key={row.id} className="hover:bg-gray-50">
                             <td className="p-3 text-gray-900 font-medium whitespace-nowrap">{row.date}</td>
                             <td className="p-3 text-gray-600 whitespace-nowrap">{row.shift}</td>
                             <td className="p-3 text-gray-900 font-bold whitespace-nowrap border-r border-gray-100">{row.cashier}</td>
                             <td className="p-3 text-right text-emerald-700 font-medium whitespace-nowrap">{formatCurrency(row.drops)}</td>
                             <td className="p-3 text-right text-gray-500 whitespace-nowrap">{formatCurrency(row.payouts)}</td>
                             <td className="p-3 text-right whitespace-nowrap">
                               <span className={osClass}>{row.overShort > 0 ? '+' : ''}{formatCurrency(row.overShort)}</span>
                             </td>
                             <td className="p-3 text-right whitespace-nowrap">
                               {row.documentLink ? (
                                 <a href={row.documentLink} target="_blank" rel="noopener noreferrer" className="font-bold underline text-emerald-600 hover:text-emerald-800">View Document</a>
                               ) : (
                                 <span className="text-gray-400 italic font-medium">No Link</span>
                               )}
                             </td>
                          </tr>
                        )
                     })}
                  </tbody>
               </table>
            </div>
          )}

          {/* Loomis Armored Drops Tab */}
          {activeTab === 'loomis' && (
            <div className="space-y-4">
              {loading ? (
                <div className="border border-gray-200 rounded-lg bg-white p-10 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                (() => {
                  const groupedLoomis = {}
                  loomisDrops.forEach(drop => {
                    if (!drop.date) return
                    const [year, month] = drop.date.split('-')
                    if (!groupedLoomis[year]) groupedLoomis[year] = {}
                    if (!groupedLoomis[year][month]) groupedLoomis[year][month] = []
                    groupedLoomis[year][month].push(drop)
                  })

                  const years = Object.keys(groupedLoomis).sort((a,b) => b.localeCompare(a))

                  if (years.length === 0) {
                     return <div className="p-10 text-center text-gray-500 border border-gray-200 rounded bg-white">No armored drops found.</div>
                  }

                  return years.map(year => (
                    <div key={year} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      <button 
                        onClick={() => toggleGroup(year)} 
                        className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-bold text-lg text-gray-800">{year} Armored Drops</span>
                        {expandedGroups[year] ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                      </button>

                      {expandedGroups[year] && (
                        <div className="p-4 space-y-4">
                          {Object.keys(groupedLoomis[year]).sort((a,b) => b.localeCompare(a)).map(month => {
                            const monthKey = `${year}-${month}`
                            const monthName = new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'long' })
                            
                            return (
                              <div key={monthKey} className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                <button 
                                  onClick={() => toggleGroup(monthKey)} 
                                  className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100 transition-colors border-b border-gray-100"
                                >
                                  <span className="font-semibold text-gray-700">{monthName} {year}</span>
                                  {expandedGroups[monthKey] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                </button>
                                
                                {expandedGroups[monthKey] && (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                                      <thead className="bg-gray-50 uppercase text-gray-600">
                                         <tr>
                                           <th className="p-3 font-semibold">Date</th>
                                           <th className="p-3 font-semibold">Shift</th>
                                           <th className="p-3 font-semibold">Safe Drop Receipt</th>
                                           <th className="p-3 text-right font-semibold">Total Dropped</th>
                                         </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                         {groupedLoomis[year][month].map((row) => {
                                            if (row.isMissing) {
                                               return (
                                                 <tr key={row.id} className="bg-red-50/60 hover:bg-red-50">
                                                    <td className="p-3 text-red-900 font-medium">{row.date}</td>
                                                    <td className="p-3 text-red-800 font-medium">{row.shift}</td>
                                                    <td colSpan="2" className="p-3 text-center text-red-600 font-bold uppercase tracking-widest text-xs">Missing</td>
                                                 </tr>
                                               )
                                            }
                    
                                            return (
                                              <tr key={row.id} className="hover:bg-gray-50">
                                                 <td className="p-3 text-gray-900 font-medium">{row.date}</td>
                                                 <td className="p-3 text-gray-600 font-medium">{row.shift}</td>
                                                 <td className="p-3 font-medium">
                                                   {row.documentLink && row.documentLink.startsWith('http') ? (
                                                     <a href={row.documentLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">View Drop Receipt</a>
                                                   ) : (
                                                     <span className="text-gray-400 text-sm">Unavailable</span>
                                                   )}
                                                 </td>
                                                 <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(row.total_dropped)}</td>
                                              </tr>
                                            )
                                         })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))
                })()
              )}
            </div>
          )}

          {/* EBT Tab */}
          {activeTab === 'ebt' && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
               <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 uppercase text-gray-600">
                     <tr>
                       <th className="p-3">Date</th><th className="p-3">EBT Report</th>
                       <th className="p-3 text-right">Till Report Total</th><th className="p-3 text-right">EBT Batch Total</th>
                       <th className="p-3 text-right">Variance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     {loading ? <tr><td colSpan="5" className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" /></td></tr> : ebtSettlements.map((row) => {
                        if (row.isMissing) {
                           if (row.agkTotal === 0) {
                              return (
                                <tr key={row.id} className="bg-green-50/50 hover:bg-green-50">
                                   <td className="p-3 text-gray-900 font-medium">{row.date}</td>
                                   <td className="p-3 text-green-700 font-bold text-xs uppercase tracking-wider">No EBT Transactions</td>
                                   <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(0)}</td>
                                   <td className="p-3 text-right font-medium text-gray-500">{formatCurrency(0)}</td>
                                   <td className="p-3 text-right">
                                      <span className="font-bold text-base text-green-700">{formatCurrency(0)}</span>
                                   </td>
                                </tr>
                              )
                           }

                           return (
                             <tr key={row.id} className="bg-red-50/60 hover:bg-red-50">
                                <td className="p-3 text-red-900 font-medium">{row.date}</td>
                                <td colSpan="3" className="p-3 text-center text-red-600 font-bold uppercase tracking-widest text-xs">Missing Terminal Settlement</td>
                                <td className="p-3 text-center">
                                   <span className="text-red-800 text-xs font-bold uppercase">Upload Required</span>
                                </td>
                             </tr>
                           )
                        }

                        if (row.documentLink === 'NO_EBT') {
                           const isZeroMatch = Math.abs(row.variance) < 0.01
                           return (
                             <tr key={row.id} className={isZeroMatch ? 'bg-green-50/50 hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'}>
                                <td className="p-3 text-gray-900 font-medium">{row.date}</td>
                                <td className="p-3 text-gray-500 font-bold text-xs uppercase tracking-wider">No EBT Transactions</td>
                                <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(row.agkTotal)}</td>
                                <td className="p-3 text-right font-medium text-gray-500">{formatCurrency(row.batchTotal)}</td>
                                <td className="p-3 text-right">
                                   <span className={`font-bold text-base ${isZeroMatch ? 'text-green-700' : 'text-red-700'}`}>
                                      {row.variance > 0.01 ? '+' : ''}{formatCurrency(isZeroMatch ? 0 : row.variance)}
                                   </span>
                                </td>
                             </tr>
                           )
                        }

                        const isMatch = Math.abs(row.variance) < 0.01
                        return (
                          <tr key={row.id} className={isMatch ? 'bg-green-50/50 hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'}>
                             <td className="p-3 text-gray-900 font-medium">{row.date}</td>
                             <td className="p-3 font-medium">
                               {row.documentLink && row.documentLink.startsWith('http') ? (
                                 <a href={row.documentLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">View Report</a>
                               ) : (
                                 <span className="text-gray-400 text-sm">Automated Transfer</span>
                               )}
                             </td>
                             <td className="p-3 text-right">{formatCurrency(row.agkTotal)}</td>
                             <td className="p-3 text-right font-medium">{formatCurrency(row.batchTotal)}</td>
                             <td className="p-3 text-right">
                               <span className={`font-bold text-base ${isMatch ? 'text-green-700' : 'text-red-700'}`}>
                                  {row.variance > 0.01 ? '+' : ''}{formatCurrency(isMatch ? 0 : row.variance)}
                               </span>
                             </td>
                          </tr>
                        )
                     })}
                  </tbody>
               </table>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
