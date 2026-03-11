import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const bgMap: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
};

// ============================================
// Global toast state
// ============================================

type ToastListener = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
const listeners: Set<ToastListener> = new Set();

function notify() {
  listeners.forEach(fn => fn([...toasts]));
}

export function toast(type: ToastType, message: string, duration = 4000) {
  const id = `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, type, message, duration }];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notify();
    }, duration);
  }
}

toast.success = (msg: string) => toast('success', msg);
toast.error = (msg: string) => toast('error', msg);
toast.warning = (msg: string) => toast('warning', msg);
toast.info = (msg: string) => toast('info', msg);

// ============================================
// Toast Container Component
// ============================================

export function ToastContainer() {
  const [items, setItems] = useState<ToastData[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-up ${bgMap[item.type]}`}
        >
          <div className="flex-shrink-0 mt-0.5">{iconMap[item.type]}</div>
          <p className="text-sm text-gray-800 flex-1">{item.message}</p>
          <button
            onClick={() => dismiss(item.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
