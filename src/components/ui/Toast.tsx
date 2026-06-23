import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export function toast(type: ToastType, message: string, duration?: number) {
  const options = duration ? { duration } : undefined;
  switch (type) {
    case 'success':
      sonnerToast.success(message, options);
      break;
    case 'error':
      sonnerToast.error(message, options);
      break;
    case 'warning':
      sonnerToast.warning(message, options);
      break;
    case 'info':
    default:
      sonnerToast.info(message, options);
      break;
  }
}

toast.success = (msg: string, duration?: number) => {
  sonnerToast.success(msg, duration ? { duration } : undefined);
};

toast.error = (msg: string, duration?: number) => {
  sonnerToast.error(msg, duration ? { duration } : undefined);
};

toast.warning = (msg: string, duration?: number) => {
  sonnerToast.warning(msg, duration ? { duration } : undefined);
};

toast.info = (msg: string, duration?: number) => {
  sonnerToast.info(msg, duration ? { duration } : undefined);
};
