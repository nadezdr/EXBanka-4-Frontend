import { useEffect, useState } from 'react'
import { accountService } from '../../services/accountService'
import { fundService } from '../../services/fundService'
import { clientApiClient } from '../../services/clientApiClient'
import { clientPortfolioService } from '../../services/clientPortfolioService'
import { fmt } from '../../utils/formatting'

// ── Invest Modal (agents — uses employee accounts) ────────────────────────────

export function InvestModal({ fund, onClose, onSuccess }) {
  const [amount, setAmount]                   = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [accounts, setAccounts]               = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [amountError, setAmountError]         = useState('')
  const [submitting, setSubmitting]           = useState(false)

  useEffect(() => {
    accountService.getAccounts()
      .then(list => {
        setAccounts(list)
        if (list.length > 0) setSourceAccountId(String(list[0].id))
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [])

  function validateAmount(val) {
    const n = Number(val)
    if (!val || isNaN(n) || n <= 0) { setAmountError('Please enter a valid amount.'); return false }
    if (fund.minimumContribution && n < fund.minimumContribution) {
      setAmountError(`Minimum contribution is ${fmt(fund.minimumContribution, 'RSD')}.`)
      return false
    }
    setAmountError(''); return true
  }

  async function handleSubmit() {
    if (!validateAmount(amount)) return
    setSubmitting(true)
    try {
      await fundService.invest(fund.id, { sourceAccountId: Number(sourceAccountId), amount: Number(amount) })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Invest</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Amount (RSD){fund.minimumContribution ? ` — minimum ${fmt(fund.minimumContribution, 'RSD')}` : ''}
            </label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountError('') }} onBlur={() => amount && validateAmount(amount)} placeholder={`${fund.minimumContribution ?? 0}`} className={`input-field w-full text-sm${amountError ? ' input-error' : ''}`} />
            {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Source Account</label>
            {accountsLoading ? <p className="text-xs text-slate-400">Loading accounts…</p> : accounts.length === 0 ? <p className="text-xs text-slate-400">No accounts available.</p> : (
              <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field w-full text-sm">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName ?? a.currencyCode}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="text-xs tracking-widest uppercase font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || accountsLoading || accounts.length === 0} className="btn-primary text-xs px-5 py-2 disabled:opacity-50">{submitting ? 'Investing…' : 'Invest'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Bank Deposit Modal (supervisors — uses bank accounts) ─────────────────────

export function BankDepositModal({ fund, onClose, onSuccess }) {
  const [amount, setAmount]               = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [accounts, setAccounts]           = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [amountError, setAmountError]     = useState('')
  const [submitting, setSubmitting]       = useState(false)

  useEffect(() => {
    accountService.getBankAccounts()
      .then(list => {
        setAccounts(list)
        if (list.length > 0) setBankAccountId(String(list[0].id))
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [])

  async function handleSubmit() {
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) { setAmountError('Please enter a valid amount.'); return }
    if (fund.minimumContribution && n < fund.minimumContribution) {
      setAmountError(`Minimum contribution is ${fmt(fund.minimumContribution, 'RSD')}.`); return
    }
    setAmountError('')
    setSubmitting(true)
    try {
      await fundService.invest(fund.id, { sourceAccountId: Number(bankAccountId), amount: n })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Bank Invest</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Amount (RSD){fund.minimumContribution ? ` — minimum ${fmt(fund.minimumContribution, 'RSD')}` : ''}
            </label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountError('') }} placeholder={`${fund.minimumContribution ?? 0}`} className={`input-field w-full text-sm${amountError ? ' input-error' : ''}`} />
            {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Bank Account</label>
            {accountsLoading ? <p className="text-xs text-slate-400">Loading accounts…</p> : accounts.length === 0 ? <p className="text-xs text-slate-400">No bank accounts available.</p> : (
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="input-field w-full text-sm">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName ?? a.currencyCode}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="text-xs tracking-widest uppercase font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || accountsLoading || accounts.length === 0 || !amount} className="btn-primary text-xs px-5 py-2 disabled:opacity-50">{submitting ? 'Investing…' : 'Invest'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Withdraw Modal (agents use personal accounts, supervisors use bank accounts) ──

export function WithdrawModal({ fund, isSupervisor, onClose, onSuccess }) {
  const [amount, setAmount]                           = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [accounts, setAccounts]                       = useState([])
  const [accountsLoading, setAccountsLoading]         = useState(true)
  const [amountError, setAmountError]                 = useState('')
  const [submitting, setSubmitting]                   = useState(false)

  useEffect(() => {
    const fetch = isSupervisor ? accountService.getBankAccounts() : accountService.getAccounts()
    fetch
      .then(list => {
        setAccounts(list)
        if (list.length > 0) setDestinationAccountId(String(list[0].id))
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [isSupervisor])

  async function handleSubmit() {
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) { setAmountError('Please enter a valid amount.'); return }
    setAmountError('')
    setSubmitting(true)
    try {
      await fundService.withdraw(fund.id, { destinationAccountId: Number(destinationAccountId), amount: n })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Withdraw</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Amount (RSD)</label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountError('') }} placeholder="0.00" className={`input-field w-full text-sm${amountError ? ' input-error' : ''}`} />
            {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Destination Account</label>
            {accountsLoading ? <p className="text-xs text-slate-400">Loading accounts…</p> : accounts.length === 0 ? <p className="text-xs text-slate-400">No accounts available.</p> : (
              <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="input-field w-full text-sm">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName ?? a.currencyCode}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="text-xs tracking-widest uppercase font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || accountsLoading || accounts.length === 0} className="btn-primary text-xs px-5 py-2 disabled:opacity-50">{submitting ? 'Withdrawing…' : 'Withdraw'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Client Invest Modal ───────────────────────────────────────────────────────

export function ClientInvestModal({ fund, onClose, onSuccess }) {
  const [amount, setAmount]                   = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [accounts, setAccounts]               = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [amountError, setAmountError]         = useState('')
  const [submitting, setSubmitting]           = useState(false)

  useEffect(() => {
    clientApiClient.get('/api/accounts/my')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.accounts ?? [])
        setAccounts(list)
        if (list.length > 0) setSourceAccountId(String(list[0].accountId))
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [])

  function validateAmount(val) {
    const n = Number(val)
    if (!val || isNaN(n) || n <= 0) { setAmountError('Please enter a valid amount.'); return false }
    if (fund.minimumContribution && n < fund.minimumContribution) {
      setAmountError(`Minimum contribution is ${fmt(fund.minimumContribution, 'RSD')}.`)
      return false
    }
    setAmountError(''); return true
  }

  async function handleSubmit() {
    if (!validateAmount(amount)) return
    setSubmitting(true)
    try {
      await clientPortfolioService.investInFund(fund.id, { sourceAccountId: Number(sourceAccountId), amount: Number(amount) })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Invest</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Amount (RSD){fund.minimumContribution ? ` — minimum ${fmt(fund.minimumContribution, 'RSD')}` : ''}
            </label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountError('') }} onBlur={() => amount && validateAmount(amount)} placeholder={`${fund.minimumContribution ?? 0}`} className={`input-field w-full text-sm${amountError ? ' input-error' : ''}`} />
            {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Source Account</label>
            {accountsLoading ? <p className="text-xs text-slate-400">Loading accounts…</p> : accounts.length === 0 ? <p className="text-xs text-slate-400">No accounts available.</p> : (
              <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field w-full text-sm">
                {accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.accountNumber} — {a.accountName ?? a.currencyCode}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="text-xs tracking-widest uppercase font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || accountsLoading || accounts.length === 0} className="btn-primary text-xs px-5 py-2 disabled:opacity-50">{submitting ? 'Investing…' : 'Invest'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Client Withdraw Modal ─────────────────────────────────────────────────────

export function ClientWithdrawModal({ fund, onClose, onSuccess }) {
  const [amount, setAmount]                         = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [accounts, setAccounts]                     = useState([])
  const [accountsLoading, setAccountsLoading]       = useState(true)
  const [amountError, setAmountError]               = useState('')
  const [submitting, setSubmitting]                 = useState(false)
  const [pending, setPending]                       = useState(false)

  useEffect(() => {
    clientApiClient.get('/api/accounts/my')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.accounts ?? [])
        setAccounts(list)
        if (list.length > 0) setDestinationAccountId(String(list[0].accountId))
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [])

  async function handleSubmit() {
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) { setAmountError('Please enter a valid amount.'); return }
    setAmountError('')
    setSubmitting(true)
    try {
      const result = await clientPortfolioService.withdrawFromFund(fund.id, { destinationAccountId: Number(destinationAccountId), amount: n })
      if (result?.pending) {
        setPending(true)
      } else {
        onSuccess()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (pending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs tracking-widest uppercase text-amber-500 mb-0.5">Payment in Progress</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 dark:text-slate-300">The fund does not have sufficient liquid assets. Your withdrawal is being processed — securities are being liquidated and funds will be transferred shortly.</p>
          </div>
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button onClick={onSuccess} className="btn-primary text-xs px-5 py-2">OK</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-0.5">Withdraw</p>
            <h2 className="font-serif text-lg font-light text-slate-900 dark:text-white">{fund.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Amount (RSD)</label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountError('') }} placeholder="0.00" className={`input-field w-full text-sm${amountError ? ' input-error' : ''}`} />
            {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Destination Account</label>
            {accountsLoading ? <p className="text-xs text-slate-400">Loading accounts…</p> : accounts.length === 0 ? <p className="text-xs text-slate-400">No accounts available.</p> : (
              <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} className="input-field w-full text-sm">
                {accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.accountNumber} — {a.accountName ?? a.currencyCode}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="text-xs tracking-widest uppercase font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || accountsLoading || accounts.length === 0} className="btn-primary text-xs px-5 py-2 disabled:opacity-50">{submitting ? 'Withdrawing…' : 'Withdraw'}</button>
        </div>
      </div>
    </div>
  )
}
