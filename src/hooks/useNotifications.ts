import { useState, useCallback } from 'react'
import { type NotificationType, type Notification } from '../types/notifications'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const notification: Notification = { id, type, message }
    
    setNotifications(prev => [...prev, notification])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const showSuccess = useCallback((message: string) => {
    addNotification('success', message)
  }, [addNotification])

  const showError = useCallback((message: string) => {
    addNotification('error', message)
  }, [addNotification])

  const showWarning = useCallback((message: string) => {
    addNotification('warning', message)
  }, [addNotification])

  const showInfo = useCallback((message: string) => {
    addNotification('info', message)
  }, [addNotification])

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification
  }
}
