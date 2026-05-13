import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import useWindowTitle from '../../hooks/useWindowTitle'
import ClientPortalLayout from '../../layouts/ClientPortalLayout'
import { clientPortfolioService } from '../../services/clientPortfolioService'
import { fmt } from '../../utils/formatting'
import { ClientInvestModal, ClientWithdrawModal } from '../../components/funds/FundModals'

const PERF_PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
]

function periodDates(months) {
  const to   = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  }
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <p className="text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl font-light tabular-nums ${highlight ?? 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}

export default function ClientFundDetailPage() {
  const { id } = useParams()
  useWindowTitle('Fund Detail | AnkaBanka')

  const [fund, setFund]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]       = useState(false)
  const [modal, setModal]       = useState(null) // 'invest' | 'withdraw'

  const [myPosition, setMyPosition] = useState(null)

  const [securities, setSecurities]               = useState([])
  const [securitiesLoading, setSecuritiesLoading] = useState(true)

  const [perfPeriod, setPerfPeriod]   = useState(PERF_PERIODS[0])
  const [perfData, setPerfData]       = useState([])
  const [perfLoading, setPerfLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    setError(false)
    try {
      const data = await clientPortfolioService.getFund(id)
      setFund(data)
    } catch (e) {
      if (e?.response?.status === 404) setNotFound(true)
      else setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadPosition = useCallback(async () => {
    try {
      const positions = await clientPortfolioService.getMyFundPositions()
      const pos = positions.find(p => String(p.fundId) === String(id))
      setMyPosition(pos ?? null)
    } catch {
      setMyPosition(null)
    }
  }, [id])

  const loadSecurities = useCallback(async () => {
    setSecuritiesLoading(true)
    try {
      const data = await clientPortfolioService.getFundSecurities(id)
      setSecurities(Array.isArray(data) ? data : [])
    } catch {
      setSecurities([])
    } finally {
      setSecuritiesLoading(false)
    }
  }, [id])

  const loadPerformance = useCallback(async (period) => {
    setPerfLoading(true)
    const { from, to } = periodDates(period.months)
    try {
      const data = await clientPortfolioService.getFundPerformance(id, from, to)
      setPerfData(data)
    } catch {
      setPerfData([])
    } finally {
      setPerfLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadPosition() }, [loadPosition])
  useEffect(() => { loadSecurities() }, [loadSecurities])
  useEffect(() => { loadPerformance(perfPeriod) }, [loadPerformance, perfPeriod])

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading fund…</p>
        </div>
      </ClientPortalLayout>
    )
  }

  if (notFound || error) {
    return (
      <ClientPortalLayout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{notFound ? 'Fund not found.' : 'Failed to load fund.'}</p>
            <Link to="/client/investment/funds" className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 hover:underline">← Back to Funds</Link>
          </div>
        </div>
      </ClientPortalLayout>
    )
  }

  const profitColor = (fund.profit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'

  return (
    <ClientPortalLayout>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <div className="max-w-5xl mx-auto">

        <Link to="/client/investment/funds" className="inline-flex items-center gap-1 text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-8">
          ← Investment Funds
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-2">Investment Fund</p>
            <h1 className="font-serif text-4xl font-light text-slate-900 dark:text-white mb-3">{fund.name}</h1>
          </div>
          <span className={`mt-2 px-3 py-1 text-xs font-medium rounded-full ${fund.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            {fund.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="w-10 h-px bg-violet-500 dark:bg-violet-400 mb-6" />

        {fund.description && (
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 max-w-2xl">{fund.description}</p>
        )}

        <div className="flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400 mb-8">
          {fund.managerName && <span>Manager: <span className="text-slate-900 dark:text-white font-medium">{fund.managerName}</span></span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <StatCard label="Fund Value"        value={fmt(fund.fundValue ?? 0, 'RSD')} />
          <StatCard label="Profit"            value={`${(fund.profit ?? 0) >= 0 ? '+' : ''}${fmt(fund.profit ?? 0, 'RSD')}`} highlight={profitColor} />
          <StatCard label="Min. Contribution" value={fmt(fund.minimumContribution ?? 0, 'RSD')} />
        </div>

        {myPosition && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Your Investment"   value={fmt(myPosition.totalInvestedAmount ?? 0, 'RSD')} />
            <StatCard label="Current Value"     value={fmt(myPosition.currentPositionValue ?? 0, 'RSD')} />
          </div>
        )}
        {!myPosition && <div className="mb-8" />}

        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button onClick={() => setModal('invest')} className="btn-primary text-xs px-5 py-2">Invest</button>
          {myPosition && (
            <button onClick={() => setModal('withdraw')} className="text-xs px-5 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
              Withdraw
            </button>
          )}
        </div>

        {/* Securities table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400">Securities Holdings</p>
          </div>
          {securitiesLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">Loading securities…</div>
          ) : securities.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No securities in this fund.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Ticker', 'Price', 'Change', 'Volume', 'Initial Margin Cost', 'Acquisition Date'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {securities.map(s => {
                    const changeColor = (s.change ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    return (
                      <tr key={s.ticker} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3 font-mono font-medium text-slate-900 dark:text-white">{s.ticker}</td>
                        <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.currentPrice ?? s.price ?? 0)}</td>
                        <td className={`px-5 py-3 tabular-nums font-medium ${changeColor}`}>
                          {(s.change ?? 0) >= 0 ? '+' : ''}{fmt(s.change ?? 0)}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">{s.volume?.toLocaleString('sr-RS') ?? '—'}</td>
                        <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.initialMarginCost ?? 0)}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{s.acquisitionDate ? String(s.acquisitionDate).slice(0, 10) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <p className="text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 font-medium">Performance History</p>
            <div className="flex gap-1">
              {PERF_PERIODS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPerfPeriod(p)}
                  className={`text-xs px-3 py-1 transition-colors ${
                    perfPeriod.label === p.label
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {perfLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <p className="text-slate-400 dark:text-slate-500 text-sm">Loading…</p>
            </div>
          ) : perfData.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No performance data available.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={[...perfData].sort((a, b) => (a.date < b.date ? -1 : 1)).map(r => ({ date: String(r.date).slice(0, 10), value: r.value ?? 0 }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={80} />
                <Tooltip formatter={v => [fmt(v), 'Value']} contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }} />
                <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {modal === 'invest' && (
        <ClientInvestModal fund={fund} onClose={() => setModal(null)} onSuccess={() => { setModal(null); load(); loadPosition() }} />
      )}
      {modal === 'withdraw' && (
        <ClientWithdrawModal fund={fund} onClose={() => setModal(null)} onSuccess={() => { setModal(null); load(); loadPosition() }} />
      )}
    </div>
    </ClientPortalLayout>
  )
}
