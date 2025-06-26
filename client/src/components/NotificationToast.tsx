import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { NotificationData } from '@/lib/types';

interface NotificationToastProps {
  notification: NotificationData | null;
  onClose: () => void;
}

export const NotificationToast = ({ notification, onClose }: NotificationToastProps) => {
  useEffect(() => {
    if (notification?.autoHide) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-profit-green" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-accent-blue" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-profit-green';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-accent-blue';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 bg-dark-surface border ${getBorderColor()} rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right-5`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-white">{notification.title}</h4>
          <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};