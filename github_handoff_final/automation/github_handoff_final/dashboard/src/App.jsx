import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import DailySummary from './pages/DailySummary'
import DailyReport from './pages/DailyReport'

import DataBrowser from './pages/DataBrowser'
import LotteryAudit from './pages/LotteryAudit'
import FuelManagement from './pages/FuelManagement'
import CashOperations from './pages/CashOperations'
import { Fuel, LayoutDashboard, FileSpreadsheet, CheckSquare, Search, Database, CalendarSearch, RadioTower, Ticket, Banknote, Share2 } from 'lucide-react'

function App() {
  const location = useLocation()
  
  const navLinkClass = (path) => 
    location.pathname === path 
      ? "border-petrola-600 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2 mr-8">
                <div className="bg-petrola-600 p-2 rounded-lg">
                  <Fuel className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">Petrola</h1>
                  <p className="text-xs text-gray-500 font-medium -mt-1">Snap Mart Ops</p>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className={navLinkClass("/")}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Daily Ops
                </Link>
                <Link to="/fuel" className={navLinkClass("/fuel")}>
                  <RadioTower className="h-4 w-4 mr-2" />
                  Fuel Management
                </Link>
                <Link to="/cash" className={navLinkClass("/cash")}>
                  <Banknote className="h-4 w-4 mr-2" />
                  Cash & Shifts
                </Link>
                <Link to="/lottery" className={navLinkClass("/lottery")}>
                  <Ticket className="h-4 w-4 mr-2" />
                  Lottery Audit
                </Link>
                <Link to="/daily-summary" className={navLinkClass("/daily-summary")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Daily Summary
                </Link>

                <Link to="/data-browser" className={navLinkClass("/data-browser")}>
                  <Database className="h-4 w-4 mr-2" />
                  Raw Data
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fuel" element={<FuelManagement />} />
          <Route path="/cash" element={<CashOperations />} />
          <Route path="/lottery" element={<LotteryAudit />} />
          <Route path="/daily-report" element={<DailyReport />} />
          <Route path="/daily-summary" element={<DailySummary />} />
          <Route path="/data-browser" element={<DataBrowser />} />
        </Routes>
      </main>

      <Toaster position="top-right" />
    </div>
  )
}

export default App
