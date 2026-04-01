import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Database, Save, Edit2, X, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

const RAW_TABLES = [
  { id: 'tank_readings', name: 'Tank Readings' },
  { id: 'fuel_quotes', name: 'Fuel Quotes' },
  { id: 'fuel_bol', name: 'Fuel BOL' },
  { id: 'fuel_invoices', name: 'Fuel Invoices' },
  { id: 'automated_till_reports', name: 'Automated Till Reports' },
  { id: 'automated_ebt_settlements', name: 'Automated EBT Settlements' },
  { id: 'automated_loomis_data', name: 'Automated Loomis Drops' },
  { id: 'automated_agk_summary', name: 'Automated AGK Summary' },
  { id: 'automated_lottery_data', name: 'Automated Lottery Data' },
  { id: 'automated_hisably_lottery_tickets', name: 'Automated Hisably Tickets' },
  { id: 'automated_ticket_activations', name: 'Automated Ticket Activations' },
  { id: 'automated_hisably_activations', name: 'Automated Hisably Activs' },
  { id: 'dashboard_financials', name: 'Dashboard Financials' },
  { id: 'edi_links', name: 'EDI Links' },
  { id: 'instant_ticket_audit', name: 'Instant Ticket Audit' }
]

export default function DataBrowser() {
  const [selectedTable, setSelectedTable] = useState(RAW_TABLES[0].id)
  const [data, setData] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0
    let aVal = a[sortConfig.key]
    let bVal = b[sortConfig.key]
    if (aVal === null) aVal = ''
    if (bVal === null) bVal = ''
    if (!isNaN(aVal) && !isNaN(bVal) && aVal !== '' && bVal !== '') {
       aVal = Number(aVal)
       bVal = Number(bVal)
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  useEffect(() => {
    fetchTableData(selectedTable)
  }, [selectedTable])

  async function fetchTableData(tableName) {
    try {
      setLoading(true)
      setEditingId(null)
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: false })
        .limit(50)

      if (error) {
        // Handle mock fallback for unset local env
        const mockRows = [
          { id: 'mock-1', created_at: '2026-03-20T12:00:00Z', note: 'Mock data since Supabase keys are missing' },
          { id: 'mock-2', created_at: '2026-03-19T12:00:00Z', note: 'Add real keys to .env to see real Make.com data' },
        ]
        setData(mockRows)
        setColumns(Object.keys(mockRows[0]))
        return
      }

      if (rows && rows.length > 0) {
        setColumns(Object.keys(rows[0]))
        setData(rows)
      } else {
        setColumns([])
        setData([])
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load table data')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (row) => {
    setEditingId(row.id)
    setEditFormData({ ...row })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditFormData({})
  }

  const handleEditChange = (e, col) => {
    setEditFormData(prev => ({ ...prev, [col]: e.target.value }))
  }

  const saveEdit = async () => {
    try {
      const { error } = await supabase
        .from(selectedTable)
        .update(editFormData)
        .eq('id', editingId)
      
      if (error) {
        if (editingId.toString().startsWith('mock')) {
          toast.error("Cannot save edits on Mock Data. Please link your Supabase .env")
          cancelEditing()
          return
        }
        throw error
      }
      
      toast.success('Row updated successfully!')
      setEditingId(null)
      fetchTableData(selectedTable)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Raw Data Browser</h2>
        <p className="text-sm text-gray-500 mt-2 md:mt-0">View & correct data flowing from your Make.com automations.</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 sm:px-6 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Database className="w-5 h-5 mr-3 text-petrola-600" />
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-petrola-500 focus:border-petrola-500 sm:text-sm rounded-md shadow-sm font-medium"
            >
              {RAW_TABLES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => fetchTableData(selectedTable)} className="text-sm text-petrola-600 hover:text-petrola-800 font-medium">
            Refresh Data
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-petrola-500" /></div>
        ) : data.length === 0 ? (
           <div className="text-center py-20">
             <Database className="mx-auto h-12 w-12 text-gray-300" />
             <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
             <p className="mt-1 text-sm text-gray-500">Wait for Make.com to push data into `{selectedTable}`.</p>
           </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Actions</th>
                  {columns.map(col => (
                    <th 
                      key={col} 
                      onClick={() => handleSort(col)}
                      className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-200 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                         <span>{col.replace(/_/g, ' ')}</span>
                         <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === col ? 'text-petrola-600' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'}`} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((row) => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr key={row.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-900" title="Save"><Save className="w-4 h-4"/></button>
                            <button onClick={cancelEditing} className="text-red-600 hover:text-red-900" title="Cancel"><X className="w-4 h-4"/></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(row)} className="text-petrola-600 hover:text-petrola-900" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                      
                      {columns.map(col => (
                        <td key={col} className={`px-4 py-3 ${col === 'id' ? 'text-gray-400 text-xs' : 'text-gray-900 whitespace-nowrap'}`}>
                          {isEditing && col !== 'id' && col !== 'created_at' ? (
                            <input
                              type="text"
                              value={editFormData[col] || ''}
                              onChange={(e) => handleEditChange(e, col)}
                              className="block w-full min-w-[120px] rounded-md border-gray-300 shadow-sm focus:border-petrola-500 focus:ring-petrola-500 sm:text-sm border px-2 py-1"
                            />
                          ) : (
                            row[col] === null ? <span className="text-gray-400 italic">null</span> : String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
