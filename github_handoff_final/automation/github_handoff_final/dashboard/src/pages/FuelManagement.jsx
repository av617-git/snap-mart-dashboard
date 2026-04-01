import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, RadioTower, Droplets, Receipt, FileSignature, RefreshCcw, AlertTriangle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, ReferenceLine, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { calculateRunwayPredictions } from '../lib/fuelUtils'

export default function FuelManagement() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [loadingWebhook, setLoadingWebhook] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tanks, setTanks] = useState([])
  const [tankPredictions, setTankPredictions] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  
  const [quoteGradeFilter, setQuoteGradeFilter] = useState('ALL')
  const [quoteSupplierFilter, setQuoteSupplierFilter] = useState('ALL')
  const [quoteTimeframeFilter, setQuoteTimeframeFilter] = useState('30')

  useEffect(() => {
     fetchTabData(activeTab)
  }, [activeTab])

  async function fetchTabData(tab) {
    setLoading(true)
    try {
      if (tab === 'inventory') {
         const { data, error } = await supabase.from('tank_readings').select('*').order('date', { ascending: false }).order('time', { ascending: false }).limit(100)
         if (data && data.length > 0) {
           const mappedTanks = []
           data.slice(0, 1).forEach(d => {
             if (d.regular !== null) mappedTanks.push({ id: `${d.id}-reg`, date: d.date, time: d.time ? d.time.substring(0,5) : '', tank: 1, grade: 'Regular', volume: d.regular, ullage: 10000 - d.regular })
             if (d.super !== null) mappedTanks.push({ id: `${d.id}-sup`, date: d.date, time: d.time ? d.time.substring(0,5) : '', tank: 2, grade: 'Super', volume: d.super, ullage: 10000 - d.super })
             if (d.diesel !== null) mappedTanks.push({ id: `${d.id}-dsl`, date: d.date, time: d.time ? d.time.substring(0,5) : '', tank: 3, grade: 'Diesel', volume: d.diesel, ullage: 10000 - d.diesel })
           })
           setTanks(mappedTanks)

           setTankPredictions(calculateRunwayPredictions(data));
         }
      } else if (tab === 'deliveries') {
         const { data, error } = await supabase.from('fuel_bol').select('*').order('date', { ascending: false }).limit(100)
         if (data) {
           setDeliveries(data.map(d => ({
             id: d.id, 
             date: d.date, 
             grade: d.grade, 
             volume: d.volume, 
             document_type: d.ticket_bol || 'BOL', 
             document_link: d.document_link
           })))
         }
      } else if (tab === 'quotes') {
         const { data, error } = await supabase.from('fuel_quotes').select('*').order('start_time', { ascending: false }).limit(200)
         if (data) {
           setQuotes(data.map(q => ({
             id: q.id, date: String(q.start_time).split(' ')[0], time: String(q.start_time).substring(11, 16) || '', supplier: q.supplier || 'Super Petroleum',
             grade: q.grade, price: q.price
           })))
         }
      } else if (tab === 'invoices') {
         const { data, error } = await supabase.from('fuel_invoices').select('*').order('date', { ascending: false }).limit(50)
         if (data) {
           setInvoices(data.map(i => ({
             id: i.id, 
             date: i.date, 
             link: i.document, 
             grade: i.grade,
             price_billed: i.price_per_gallon,
             reconciled: i.reconciled || false,
             gallons_billed: i.volume, 
             total_cost: Number(i.volume || 0) * Number(i.price_per_gallon || 0)
           })))
         }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const triggerTelnetPing = () => {
    setLoadingWebhook(true)
    
    // Simulate webhook response
    setTimeout(() => {
      setTanks(prev => prev.map(t => ({
        ...t,
        reading_time: format(new Date(), 'hh:mm a'),
        current_volume: Math.max(100, t.current_volume - Math.floor(Math.random() * 50)),
        ullage: t.ullage + Math.floor(Math.random() * 50)
      })))
      
      setLoadingWebhook(false)
      toast.success("Tank readings updated successfully.")
    }, 2000)
  }

  const tabs = [
    { id: 'inventory', name: 'Tank Inventory', icon: RadioTower },
    { id: 'deliveries', name: 'Deliveries & BOL', icon: Droplets },
    { id: 'quotes', name: 'Price Quotes', icon: Receipt },
    { id: 'invoices', name: 'Invoices', icon: FileSignature },
  ]

  const toggleReconciled = async (id, currentVal) => {
    const newVal = !currentVal;
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, reconciled: newVal } : inv));
    const { error } = await supabase.from('fuel_invoices').update({ reconciled: newVal }).eq('id', id);
    if (error) {
      toast.error('Failed to update reconciliation status');
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, reconciled: currentVal } : inv));
    } else {
      toast.success(newVal ? 'Invoice marked as reconciled' : 'Invoice marked as pending');
    }
  }

  const GradeBadge = ({ grade }) => {
    let displayGrade = grade?.toUpperCase() || ''
    if (displayGrade.includes('REGULAR') || displayGrade === 'NL') displayGrade = 'REGULAR'
    else if (displayGrade.includes('SUPER') || displayGrade === 'SUP' || displayGrade === 'PREMIUM') displayGrade = 'SUPER'
    else if (displayGrade.includes('DIESEL') || displayGrade === 'DSL') displayGrade = 'DIESEL'

    let colors = 'bg-gray-100 text-gray-800 border-gray-200'
    if (displayGrade === 'REGULAR') colors = 'bg-green-100 text-green-800 border-green-200'
    if (displayGrade === 'SUPER') colors = 'bg-red-100 text-red-800 border-red-200'
    if (displayGrade === 'DIESEL') colors = 'bg-blue-100 text-blue-800 border-blue-200'
    return <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded border ${colors}`}>{displayGrade}</span>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="md:flex md:items-center md:justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl flex items-center">
            <RadioTower className="w-8 h-8 mr-3 text-petrola-600" />
            Fuel Management Ops
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage tank inventories, automated telnet pings, quotes, and bol deliveries.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-gray-50 overflow-x-auto overflow-y-hidden">
          <div className="border-b border-gray-200 min-w-max">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${isActive ? 'border-petrola-500 text-petrola-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-petrola-500' : 'text-gray-400'}`} />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
           {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-petrola-500" /></div>
           ) : (
             <>
                {/* Tank Inventory */}
                {activeTab === 'inventory' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
                       <div className="flex items-center justify-between mb-4">
                         <div>
                            <h3 className="text-lg font-bold text-gray-900">Predictive Depletion Modeler</h3>
                            <p className="text-sm text-gray-500 font-medium">Algorithmic runway forecast derived from consecutive Veeder-Root drainage intervals (10,000 gal cap | 400 gal dead-pump tolerance).</p>
                         </div>
                         <button 
                           onClick={triggerTelnetPing}
                           disabled={loadingWebhook}
                           className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white transition-opacity ${loadingWebhook ? 'bg-gray-400' : 'bg-petrola-600 hover:bg-petrola-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-petrola-500`}
                         >
                           {loadingWebhook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                           {loadingWebhook ? 'Pinging...' : 'Force Live Poll'}
                         </button>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                          {tankPredictions.map(p => {
                             const isCritical = p.remainingHours <= 3 && p.remainingHours > 0;
                             const isCaution = p.remainingHours <= 6 && !isCritical && p.remainingHours > 0;
                             
                             let outlineStr = "border-gray-200 bg-gray-50"
                             let textStr = "text-gray-900"
                             let iconClass = "text-gray-400"
                             let statusText = "STABLE RUNWAY"

                             if (isCritical) {
                                outlineStr = "border-red-300 bg-red-50"
                                textStr = "text-red-700"
                                iconClass = "text-red-500"
                                statusText = "CRITICAL RUNWAY"
                             } else if (isCaution) {
                                outlineStr = "border-yellow-300 bg-yellow-50"
                                textStr = "text-yellow-700"
                                iconClass = "text-yellow-500"
                                statusText = "CAUTION RUNWAY"
                             } else if (p.remainingHours === 0) {
                                outlineStr = "border-gray-200 bg-gray-50"
                                textStr = "text-gray-500"
                                statusText = "NO DRAIN"
                             }

                             return (
                                <div key={p.grade} className={`p-5 rounded-xl border shadow-sm ${outlineStr}`}>
                                   <div className="flex justify-between items-start mb-2">
                                      <h4 className={`font-bold uppercase tracking-wide text-xs ${textStr}`}>{p.grade} GRADE - {statusText}</h4>
                                      <AlertTriangle className={`w-5 h-5 ${iconClass} ${!isCritical && !isCaution ? 'opacity-0' : ''}`} />
                                   </div>
                                   <div className="mt-2">
                                      <p className="text-xs text-gray-500 font-medium mb-1">Estimated Pump Fail Date</p>
                                      <p className={`text-xl font-black ${textStr}`}>
                                         {p.runOutTime}
                                      </p>
                                   </div>
                                   <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between text-xs font-bold text-gray-500">
                                      <span>{p.remainingHours === 0 ? 'N/A' : `${p.remainingHours} hrs remaining`}</span>
                                      <span>Burn: {p.depletionRate} g/hr</span>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    </div>

                    <div className="overflow-x-auto mt-6 border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm text-left">
                         <thead className="bg-gray-50 uppercase text-gray-600 border-b border-gray-200">
                            <tr><th className="p-4 font-semibold">Date / Time</th><th className="p-4 font-semibold">Grade</th><th className="p-4 font-semibold text-right">Current Vol</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {tanks.map(t => (
                               <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="p-4 whitespace-nowrap"><span className="font-medium text-gray-900">{t.date}</span> <span className="text-gray-500 ml-2">{t.time}</span></td>
                                  <td className="p-4 whitespace-nowrap"><GradeBadge grade={t.grade}/></td>
                                  <td className="p-4 whitespace-nowrap text-right font-medium text-petrola-700 font-mono text-lg">{Number(t.volume || 0).toLocaleString()} gal</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Deliveries & BOL */}
                {activeTab === 'deliveries' && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm text-left">
                       <thead className="bg-gray-50 uppercase text-gray-600 border-b border-gray-200">
                         <tr><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Grade</th><th className="p-4 font-semibold text-right">Volume</th><th className="p-4 font-semibold text-center">Document Type</th><th className="p-4 font-semibold text-right">Document Link</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {deliveries.map(d => {
                            return (
                              <tr key={d.id} className="hover:bg-gray-50">
                                <td className="p-4 whitespace-nowrap text-gray-900 font-medium">{d.date}</td>
                                <td className="p-4 whitespace-nowrap"><GradeBadge grade={d.grade}/></td>
                                <td className="p-4 whitespace-nowrap text-right font-medium font-mono text-petrola-700 text-lg">{Number(d.volume || 0).toLocaleString()} gal</td>
                                <td className="p-4 whitespace-nowrap text-center text-gray-600 font-bold">{d.document_type}</td>
                                <td className="p-4 whitespace-nowrap text-right">
                                  {d.document_link ? (
                                    <a href={d.document_link} target="_blank" rel="noreferrer" className="inline-flex items-center text-petrola-600 hover:text-petrola-800 font-bold underline transition-colors">
                                      View Document
                                    </a>
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

                {/* Price Quotes */}
                {activeTab === 'quotes' && (
                  <div className="space-y-6">
                    {quotes.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-gray-100 pb-4">
                           <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Supplier Price Trends</h3>
                           <div className="flex space-x-3 mt-3 sm:mt-0">
                             <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Timeframe</label>
                               <select value={quoteTimeframeFilter} onChange={(e) => setQuoteTimeframeFilter(e.target.value)} className="block w-28 pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:ring-petrola-500 focus:border-petrola-500 rounded-md bg-gray-50 font-medium cursor-pointer shadow-sm">
                                 <option value="7">7 Days</option>
                                 <option value="30">30 Days</option>
                                 <option value="90">90 Days</option>
                                 <option value="ALL">All Time</option>
                               </select>
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Grade</label>
                               <select value={quoteGradeFilter} onChange={(e) => setQuoteGradeFilter(e.target.value)} className="block w-28 pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:ring-petrola-500 focus:border-petrola-500 rounded-md bg-gray-50 font-medium cursor-pointer shadow-sm">
                                 <option value="ALL">All</option>
                                 <option value="NL">NL (Regular)</option>
                                 <option value="SUP">SUP (Super)</option>
                                 <option value="DSL">DSL (Diesel)</option>
                                 <option value="PREM">Premium</option>
                               </select>
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier</label>
                               <select value={quoteSupplierFilter} onChange={(e) => setQuoteSupplierFilter(e.target.value)} className="block w-36 pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:ring-petrola-500 focus:border-petrola-500 rounded-md bg-gray-50 font-medium cursor-pointer shadow-sm">
                                 <option value="ALL">All</option>
                                 <option value="Super Petroleum">Super</option>
                                 <option value="Fabian">Fabian</option>
                               </select>
                             </div>
                           </div>
                        </div>

                        {(() => {
                           const filteredQuotes = quotes.filter(q => 
                             (quoteGradeFilter === 'ALL' || q.grade === quoteGradeFilter) &&
                             (quoteSupplierFilter === 'ALL' || q.supplier === quoteSupplierFilter)
                           )
                           const chartKeys = [...new Set(filteredQuotes.map(q => `${q.supplier} ${q.grade}`))]
                           
                           const cutoffDate = quoteTimeframeFilter === 'ALL' 
                             ? null 
                             : format(subDays(new Date(), parseInt(quoteTimeframeFilter)), 'yyyy-MM-dd')
                             
                           const groupedByDate = filteredQuotes.reduce((acc, q) => {
                             if (!acc[q.date]) acc[q.date] = {}
                             acc[q.date][`${q.supplier} ${q.grade}`] = Number(q.price)
                             return acc
                           }, {})

                           const sortedValidDates = Object.keys(groupedByDate)
                             .filter(dStr => !cutoffDate || dStr >= cutoffDate)
                             .sort()

                           const groupedData = sortedValidDates.map(dateStr => ({
                              date: dateStr,
                              ...(groupedByDate[dateStr] || {})
                           }))

                           return (
                             <div className="h-80 w-full">
                               <ResponsiveContainer width="100%" height="85%">
                                 <LineChart data={groupedData}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                   <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} 
                                     tickFormatter={(dateStr) => format(new Date(dateStr), 'MMM d')}
                                   />
                                   <YAxis domain={['dataMin - 0.02', 'auto']} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `$${v.toFixed(2)}`} axisLine={false} tickLine={false} dx={-10} />
                                   <Tooltip 
                                     formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Price']}
                                     labelFormatter={(label) => `Date: ${label}`}
                                     contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                     cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}} 
                                   />
                                   <Legend wrapperStyle={{paddingTop: '20px', fontSize: '13px', fontWeight: '500'}} iconType="circle" />
                                   {chartKeys.map((keyStr, i) => {
                                     const colors = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];
                                     return <Line key={keyStr} type="monotone" connectNulls={true} dataKey={keyStr} name={keyStr} stroke={colors[i % 6]} strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} dot={{ r: 4, strokeWidth: 2 }} />
                                   })}
                                 </LineChart>
                               </ResponsiveContainer>
                             </div>
                           )
                        })()}
                      </div>
                    )}
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg mt-6">
                      <table className="min-w-full text-sm text-left">
                         <thead className="bg-gray-50 uppercase text-gray-600 border-b border-gray-200">
                           <tr><th className="p-4 font-semibold">Date / Time</th><th className="p-4 font-semibold">Supplier</th><th className="p-4 font-semibold">Grade</th><th className="p-4 font-semibold text-right">Price</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                           {(() => {
                             const filtered = quotes.filter(q => (quoteGradeFilter === 'ALL' || q.grade === quoteGradeFilter) && (quoteSupplierFilter === 'ALL' || q.supplier === quoteSupplierFilter))
                             const minPriceObj = {}
                             filtered.forEach(q => {
                               if (!minPriceObj[q.grade] || q.price < minPriceObj[q.grade]) {
                                 minPriceObj[q.grade] = q.price
                               }
                             })

                             return filtered.map(q => {
                               const isLowest = q.price === minPriceObj[q.grade] && filtered.length > 1
                               return (
                                 <tr key={q.id} className={`${isLowest ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                                   <td className="p-4 whitespace-nowrap"><span className="font-medium text-gray-900">{q.date}</span> <span className="text-gray-500 ml-2">{q.time}</span></td>
                                   <td className="p-4 whitespace-nowrap font-medium text-gray-900">{q.supplier}</td>
                                   <td className="p-4 whitespace-nowrap"><GradeBadge grade={q.grade}/></td>
                                   <td className="p-4 whitespace-nowrap text-right">
                                     <span className={`font-bold ${isLowest ? 'text-green-700' : 'text-gray-800'}`}>${Number(q.price).toFixed(4)}</span>
                                   </td>
                                 </tr>
                               )
                             })
                           })()}
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {activeTab === 'invoices' && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm text-left">
                       <thead className="bg-gray-50 uppercase text-gray-600 border-b border-gray-200">
                         <tr><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold text-center">Document Link</th><th className="p-4 font-semibold">Grade</th><th className="p-4 font-semibold text-right">Gallons Billed</th><th className="p-4 font-semibold text-right">Price Billed</th><th className="p-4 font-semibold text-right">Total Cost</th><th className="p-4 font-semibold text-center">Reconciled</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {invoices.map(i => (
                            <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${i.reconciled ? 'bg-green-50/40' : ''}`}>
                              <td className="p-4 whitespace-nowrap font-medium text-gray-900">{i.date}</td>
                              <td className="p-4 whitespace-nowrap text-center">
                                {i.link ? (
                                  <a href={i.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-petrola-600 hover:text-petrola-800 font-bold underline transition-colors">
                                    View Document
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic font-medium">No Link</span>
                                )}
                              </td>
                              <td className="p-4 whitespace-nowrap"><GradeBadge grade={i.grade}/></td>
                              <td className="p-4 whitespace-nowrap text-right text-gray-700 font-mono text-lg">{Number(i.gallons_billed || 0).toLocaleString()} gal</td>
                              <td className="p-4 whitespace-nowrap text-right text-gray-600 font-mono text-lg">${Number(i.price_billed || 0).toFixed(4)}</td>
                              <td className="p-4 whitespace-nowrap text-right font-bold text-red-700 font-mono text-lg">${Number(i.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              <td className="p-4 whitespace-nowrap text-center">
                                <input 
                                  type="checkbox" 
                                  checked={i.reconciled} 
                                  onChange={() => toggleReconciled(i.id, i.reconciled)} 
                                  className="w-5 h-5 text-petrola-600 rounded border-gray-300 focus:ring-petrola-500 cursor-pointer shadow-sm transition-all" 
                                />
                              </td>
                            </tr>
                         ))}
                       </tbody>
                    </table>
                  </div>
                )}
             </>
           )}
        </div>
      </div>
    </div>
  )
}
