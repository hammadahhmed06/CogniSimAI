import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info'
interface NotifyOptions { description?: string; duration?: number }

const recent = new Map<string, number>()
const TTL = 4000

function dedupe(kind: ToastType, msg: string) {
  const key = kind + ':' + msg
  const now = Date.now()
  const prev = recent.get(key)
  if (prev && now - prev < TTL) return true
  recent.set(key, now)
  if (recent.size > 60) {
    for (const [k, ts] of recent) if (now - ts > TTL) recent.delete(k)
  }
  return false
}

export const notify = {
  success(message: string, opts: NotifyOptions = {}) {
    if (dedupe('success', message)) return
    toast.success(message, { description: opts.description, duration: opts.duration ?? 3000 })
  },
  error(message: string, opts: NotifyOptions = {}) {
    if (dedupe('error', message)) return
    toast.error(message, { description: opts.description, duration: opts.duration ?? 5000 })
  },
  info(message: string, opts: NotifyOptions = {}) {
    if (dedupe('info', message)) return
    toast(message, { description: opts.description, duration: opts.duration ?? 3500 })
  }
}
