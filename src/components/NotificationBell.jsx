import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const POLL_INTERVAL = 30_000

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell({ service, notificationsRoute = '/notifications' }) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const fetchCount = useCallback(async () => {
    try {
      const count = await service.getUnreadCount()
      setUnreadCount(count)
    } catch {
      // silent
    }
  }, [service])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.getNotifications({ page: 1, pageSize: 10 })
      const raw = data?.notifications ?? data
      setNotifications(Array.isArray(raw) ? raw : [])
      if (data?.unread_count !== undefined) setUnreadCount(data.unread_count)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [service])

  // Initial count + polling
  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchCount])

  // Load notifications when panel opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleMarkRead(notif) {
    if (!notif.is_read) {
      try {
        await service.markRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // silent
      }
    }
    setOpen(false)
    // navigate to relevant section based on type if needed
  }

  async function handleMarkAll() {
    try {
      await service.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-700 dark:text-slate-300">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    !n.is_read ? 'bg-violet-50 dark:bg-violet-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                    )}
                    <div className={!n.is_read ? '' : 'pl-3.5'}>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
            <Link
              to={notificationsRoute}
              onClick={() => setOpen(false)}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
