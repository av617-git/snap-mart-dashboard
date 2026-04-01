import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calculateRunwayPredictions } from '../lib/fuelUtils'
import { format } from 'date-fns'
import { 
  RefreshCcw, Calendar, TrendingDown, TrendingUp, AlertTriangle, 
  CheckCircle2, XCircle, Send, FileText, Droplets, Ticket, BadgeDollarSign,
  Link as LinkIcon, Download, Check, Plus, Trash2, ExternalLink, X, Share2, Filter, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [kpis, setKpis] = useState({ lotteryAlerts: 0 })
  const [liveFuel, setLiveFuel] = useState({ regular: 0, super: 0, diesel: 0, asOfDate: '', asOfTime: '' })
  
  // EDI View State
  const [allEdis, setAllEdis] = useState([])
  const [selectedEdis, setSelectedEdis] = useState([])
  const [ediFilter, setEdiFilter] = useState({ vendor: 'All', status: 'Pending' })
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const filterMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
     fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
     setIsRefreshing(true)
     try {
       // 1. Live Fuel Inventory
       const { data: tanks } = await supabase.from('tank_readings').select('*').order('date', { ascending: false }).order('time', { ascending: false }).limit(100)
       if (tanks && tanks.length > 0) {
         const predictions = calculateRunwayPredictions(tanks)
         const getRunout = (grade) => {
           return predictions.find(p => p.grade === grade) || {};
         }
         
         setLiveFuel({ 
           regular: tanks[0].regular, 
           super: tanks[0].super, 
           diesel: tanks[0].diesel, 
           asOfDate: tanks[0].date, 
           asOfTime: tanks[0].time,
           regRunout: getRunout('Regular'),
           supRunout: getRunout('Super'),
           dslRunout: getRunout('Diesel')
         })
       }

       // 2. Missing Lottery Books
       const { data: missingLottery } = await supabase.from('instant_ticket_audit').select('*').ilike('status', '%Missing%')
       const missingBooksCount = missingLottery ? missingLottery.length : 0

       setKpis({ lotteryAlerts: missingBooksCount })

       // 3. EDI Links - Fetch all
       const { data: rawEdis } = await supabase
         .from('edi_links')
         .select('*')
         .order('created_at', { ascending: false })
       
       setAllEdis(rawEdis || [])

     } catch(e) {
       console.error(e)
     } finally {
       setIsRefreshing(false)
     }
  }

  // --- EDI Handlers ---
  const toggleEdiStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'processed' ? 'pending' : 'processed'
    try {
      const { error } = await supabase
        .from('edi_links')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
      fetchDashboardData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleEdiSelection = (id) => {
    setSelectedEdis(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBatchDownload = () => {
    if (selectedEdis.length === 0) return
    
    const linksToDownload = allEdis.filter(e => selectedEdis.includes(e.id))
    let downloadCount = 0

    linksToDownload.forEach(edi => {
      // Extract Google Drive File ID (typically 25+ alphanumeric characters)
      const fileIdMatch = edi.drive_link.match(/[-\w]{25,}/)
      
      let downloadUrl = edi.drive_link
      if (fileIdMatch) {
         const fileId = fileIdMatch[0]
         // Create the direct download URL
         downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
         
         // Create an invisible anchor to trigger the download silently
         const a = document.createElement('a')
         a.href = downloadUrl
         // We add target _blank as a fallback just in case the browser blocks direct top-level navigation
         a.target = '_blank'
         a.download = edi.file_name || 'edi-file'
         document.body.appendChild(a)
         a.click()
         document.body.removeChild(a)
         downloadCount++
      } else {
         // Fallback if not a standard Google Drive link
         window.open(edi.drive_link, '_blank')
      }
    })

    if (downloadCount > 0) {
       toast.success(`Started downloading ${downloadCount} files!`)
    }
  }

  const handleBatchProcess = async () => {
    if (selectedEdis.length === 0) return
    
    try {
      const { error } = await supabase
        .from('edi_links')
        .update({ status: 'processed' })
        .in('id', selectedEdis)

      if (error) throw error
      
      toast.success(`${selectedEdis.length} EDIs marked as processed`)
      setSelectedEdis([])
      fetchDashboardData()
    } catch (error) {
      console.error('Error processing EDIs:', error)
      toast.error('Failed to update EDI status')
    }
  }

  const handleDeleteEdi = async (id) => {
    if (!confirm('Are you sure you want to delete this link?')) return
    try {
      const { error } = await supabase.from('edi_links').delete().eq('id', id)
      if (error) throw error
      toast.success('Link removed')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  
  const handleRefresh = () => {
    fetchDashboardData().then(() => toast.success("Dashboard data refreshed successfully."))
  }

  const displayedEdis = allEdis.filter(e => {
    const matchVendor = ediFilter.vendor === 'All' || e.supplier === ediFilter.vendor
    const matchStatus = ediFilter.status === 'All' ||
                        (ediFilter.status === 'Pending' && (!e.status || e.status.toLowerCase() === 'pending')) ||
                        (ediFilter.status === 'Processed' && e.status && e.status.toLowerCase() === 'processed')
    return matchVendor && matchStatus
  })

  const toggleSelectAll = () => {
    const allDisplayedSelected = displayedEdis.length > 0 && displayedEdis.every(edi => selectedEdis.includes(edi.id))
    if (allDisplayedSelected) {
      setSelectedEdis(prev => prev.filter(id => !displayedEdis.find(e => e.id === id)))
    } else {
      const displayedIds = displayedEdis.map(e => e.id)
      setSelectedEdis(prev => [...new Set([...prev, ...displayedIds])])
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Global Header */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Master Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Cross-module operational 'God View' for Snap Mart.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white transition-colors ${isRefreshing ? 'bg-petrola-400' : 'bg-petrola-600 hover:bg-petrola-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-petrola-500'}`}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* 2. High-Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Lottery Audit */}
        <div 
          onClick={() => navigate('/lottery')}
          className={`rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md flex flex-col hover:scale-[1.01] ${
            kpis.lotteryAlerts > 0 
              ? 'p-6 bg-red-50 hover:bg-red-100 border-red-300 border-2 scale-[1.02]' 
              : 'p-6 bg-green-50 hover:bg-green-100 border-green-200'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <h4 className={`font-bold uppercase tracking-wide text-gray-500 ${kpis.lotteryAlerts > 0 ? 'text-sm' : 'text-xs'}`}>Lottery Audit</h4>
            <Ticket className={`${kpis.lotteryAlerts > 0 ? 'w-8 h-8 text-red-500' : 'w-6 h-6 text-green-500'}`} />
          </div>
          <div className="flex-1 flex items-center">
            {kpis.lotteryAlerts > 0 ? (
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-xl font-black bg-red-100 text-red-800 border border-red-300 shadow-sm animate-pulse">
                <AlertTriangle className="w-6 h-6 mr-2" /> {kpis.lotteryAlerts} Alert
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> All Clear
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className={`font-medium text-gray-500 ${kpis.lotteryAlerts > 0 ? 'text-sm' : 'text-xs'}`}>Missing/Stolen Books</p>
          </div>
        </div>

        {/* Live Fuel Inventory */}
        <div 
           className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
           onClick={() => navigate('/fuel')}
        >
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Fuel inventory as of {liveFuel.asOfTime ? `${liveFuel.asOfDate} ${liveFuel.asOfTime?.substring(0,5)}` : 'Unknown'}</h4>
            <Droplets className="w-6 h-6 text-petrola-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center divide-x divide-gray-100 mt-auto">
            <div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Regular</div>
               <div className="text-xl font-extrabold text-gray-900 mt-1">{Number(liveFuel.regular || 0).toLocaleString()}</div>
               {liveFuel.regRunout?.remainingHours !== undefined ? (
                 <div className="mt-3 flex flex-col items-center">
                   <div className="text-sm font-black text-petrola-600">{liveFuel.regRunout.remainingHours} hrs</div>
                   <div className="text-xs font-bold text-gray-500 mt-0.5">{liveFuel.regRunout.runOutTime}</div>
                 </div>
               ) : <div className="text-xs font-medium text-gray-400 mt-3">N/A</div>}
            </div>
            <div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Super</div>
               <div className="text-xl font-extrabold text-gray-900 mt-1">{Number(liveFuel.super || 0).toLocaleString()}</div>
               {liveFuel.supRunout?.remainingHours !== undefined ? (
                 <div className="mt-3 flex flex-col items-center">
                   <div className="text-sm font-black text-petrola-600">{liveFuel.supRunout.remainingHours} hrs</div>
                   <div className="text-xs font-bold text-gray-500 mt-0.5">{liveFuel.supRunout.runOutTime}</div>
                 </div>
               ) : <div className="text-xs font-medium text-gray-400 mt-3">N/A</div>}
            </div>
            <div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diesel</div>
               <div className="text-xl font-extrabold text-gray-900 mt-1">{Number(liveFuel.diesel || 0).toLocaleString()}</div>
               {liveFuel.dslRunout?.remainingHours !== undefined ? (
                 <div className="mt-3 flex flex-col items-center">
                   <div className="text-sm font-black text-petrola-600">{liveFuel.dslRunout.remainingHours} hrs</div>
                   <div className="text-xs font-bold text-gray-500 mt-0.5">{liveFuel.dslRunout.runOutTime}</div>
                 </div>
               ) : <div className="text-xs font-medium text-gray-400 mt-3">N/A</div>}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Main Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EDI Uploads */}
        <div className="space-y-6">
           
           {/* EDI Tracking Panel */}
           <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-visible">
             <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center relative gap-2">
               <div className="flex items-center gap-2">
                 <LinkIcon className="w-4 h-4 text-indigo-600" />
                 <h3 className="font-bold text-gray-900 tracking-tight text-sm">EDI Tracking</h3>
               </div>
               
               {/* Enhanced View Dropdown */}
               <div className="relative" ref={filterMenuRef}>
                 <button 
                   onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-100 hover:border-indigo-300 rounded-lg text-xs font-bold text-indigo-700 shadow-sm transition-all focus:ring-2 focus:ring-indigo-100"
                 >
                   <Filter className="w-3.5 h-3.5" />
                   View
                   <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isFilterMenuOpen && (
                   <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                     <div className="p-3 space-y-4">
                       {/* Vendor Filter */}
                       <div>
                         <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Vendor</label>
                         <div className="flex flex-col gap-1">
                           {['All', 'J Polep', 'Coremark'].map(v => (
                             <button
                               key={v}
                               onClick={() => { setEdiFilter({...ediFilter, vendor: v}); setIsFilterMenuOpen(false); }}
                               className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${ediFilter.vendor === v ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                             >
                               {v === 'All' ? 'All Vendors' : v}
                             </button>
                           ))}
                         </div>
                       </div>
                       
                       <div className="h-px bg-gray-100 w-full" />
                       
                       {/* Status Filter */}
                       <div>
                         <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Status</label>
                         <div className="flex flex-col gap-1">
                           {['Pending', 'Processed'].map(s => (
                             <button
                               key={s}
                               onClick={() => { setEdiFilter({...ediFilter, status: s}); setIsFilterMenuOpen(false); }}
                               className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${ediFilter.status === s ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                             >
                               {s}
                               {s === 'Pending' ? (
                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                               ) : (
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>
             
             {/* Readout indicating active filters if not default */}
             {(ediFilter.vendor !== 'All' || ediFilter.status !== 'Pending') && (
               <div className="px-5 py-2 flex items-center gap-2 bg-indigo-50/30 border-b border-gray-50">
                 <span className="text-[10px] uppercase font-bold text-gray-500">Filters:</span>
                 {ediFilter.vendor !== 'All' && <span className="text-[10px] font-black bg-white border px-1.5 py-0.5 rounded text-gray-600">{ediFilter.vendor}</span>}
                 {ediFilter.status !== 'Pending' && <span className="text-[10px] font-black bg-white border px-1.5 py-0.5 rounded text-gray-600">{ediFilter.status}</span>}
                 <button 
                  onClick={() => setEdiFilter({ vendor: 'All', status: 'Pending' })}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 ml-auto"
                 >
                   Clear
                 </button>
               </div>
             )}
             
             {displayedEdis.length === 0 ? (
               <div className="p-8 text-center bg-white">
                 <CheckCircle2 className="w-8 h-8 text-green-200 mx-auto mb-2" />
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No links found</p>
               </div>
             ) : (
               <div className="flex flex-col">
                 {/* Select All Dashboard Element */}
                 {displayedEdis.length > 0 && (
                    <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={displayedEdis.every(edi => selectedEdis.includes(edi.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span 
                        className="text-[10px] uppercase font-bold text-gray-500 tracking-widest cursor-pointer select-none" 
                        onClick={toggleSelectAll}
                      >
                        {displayedEdis.every(edi => selectedEdis.includes(edi.id)) ? 'Deselect All' : 'Select All'}
                      </span>
                    </div>
                 )}

                 <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                    {displayedEdis.map(edi => (
                       <div key={edi.id} className={`p-4 hover:bg-slate-50 transition-colors flex items-center gap-3 group relative ${edi.status === 'processed' ? 'opacity-50' : ''}`}>
                         <input 
                           type="checkbox"
                           checked={selectedEdis.includes(edi.id)}
                           onChange={() => toggleEdiSelection(edi.id)}
                           className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                         />
                         <div className="flex-1 min-w-0 pr-8">
                           <div className="flex flex-wrap items-center gap-2 mb-0.5">
                             <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                               edi.supplier === 'J Polep' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                             }`}>
                               {edi.supplier}
                             </span>
                             {edi.status === 'processed' && (
                               <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 flex items-center gap-1">
                                 <Check className="w-2 h-2" /> Complete
                               </span>
                             )}
                             <span className="text-[10px] font-bold text-gray-400">
                               {new Date(edi.created_at).toLocaleDateString()}
                             </span>
                           </div>
                           <p className="text-xs font-bold text-gray-800 truncate">{edi.file_name || 'EDI Invoice Link'}</p>
                         </div>
                         <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => toggleEdiStatus(edi.id, edi.status)}
                             className={`p-1.5 rounded-lg transition-colors ${
                               edi.status === 'processed' ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-green-50 text-green-600 hover:bg-green-100'
                             }`}
                             title={edi.status === 'processed' ? 'Mark Pending' : 'Mark Processed'}
                           >
                             <Check className="w-3.5 h-3.5" />
                           </button>
                           <a 
                             href={edi.drive_link} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                             title="Open Link"
                           >
                             <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                           <button 
                              onClick={() => handleDeleteEdi(edi.id)}
                              className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all"
                              title="Delete Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                       </div>
                    ))}
                 </div>
                 
                 {selectedEdis.length > 0 && (
                   <div className="p-4 bg-slate-50 border-t border-gray-100 flex gap-2 animate-in slide-in-from-bottom-2">
                     <button 
                        onClick={handleBatchDownload}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                     >
                       <Download className="w-3 h-3" /> Download Selected
                     </button>
                     <button 
                        onClick={handleBatchProcess}
                        className="px-3 py-2 bg-white border border-gray-200 text-green-600 hover:bg-green-50 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center transition-colors shadow-sm"
                        title="Mark as Processed"
                     >
                       <Check className="w-3.5 h-3.5" />
                     </button>
                   </div>
                 )}
               </div>
             )}
           </div>
        </div>

        {/* Cashier Schedule Calendar */}
        <div className="space-y-6">
           <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden h-full flex flex-col min-h-[400px]">
             <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <h3 className="font-bold text-gray-900">Cashier Schedule</h3>
               <Calendar className="w-4 h-4 text-gray-400" />
             </div>
             <div className="p-0 w-full bg-gray-50 flex-1 relative min-h-[400px]">
                <iframe src="https://calendar.google.com/calendar/embed?src=c_0382118d22d0b73bcc7146114d2dadc61f3b5b7ba3ca2c36fb3d4a2d2c92a670%40group.calendar.google.com&ctz=America%2FNew_York&mode=AGENDA" style={{border: 0}} width="100%" height="100%" className="absolute inset-0" frameBorder="0" scrolling="no"></iframe>
             </div>
           </div>
        </div>

      </div>
    </div>
  )
}

