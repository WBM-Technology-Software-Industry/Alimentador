import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export type Notification = {
  id: string
  type: NotificationType
  message: string
}

type NotificationState = {
  notifications: Notification[]
  push: (type: NotificationType, message: string) => void
  remove: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  push: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ notifications: [...s.notifications.slice(-2), { id, type, message }] }))
    setTimeout(() => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })), 4000)
  },
  remove: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))

export const notify = {
  success: (msg: string) => useNotificationStore.getState().push('success', msg),
  error:   (msg: string) => useNotificationStore.getState().push('error',   msg),
  warning: (msg: string) => useNotificationStore.getState().push('warning', msg),
  info:    (msg: string) => useNotificationStore.getState().push('info',    msg),
}
