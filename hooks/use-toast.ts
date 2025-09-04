import { useState, useCallback } from 'react'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface Toast extends ToastProps {
  id: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...props,
      id
    }

    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after duration
    const duration = props.duration || 5000
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id))
    }, duration)

    // For now, just use console.log for demonstration
    if (props.variant === 'destructive') {
      console.error(`❌ ${props.title}`, props.description)
    } else {
      console.log(`✅ ${props.title}`, props.description)
    }

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter(t => t.id !== id))
  }, [])

  return {
    toast,
    dismiss,
    toasts
  }
}