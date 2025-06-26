import { NotificationData } from '@/lib/types';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NotificationToastProps {
  notification: NotificationData | null;
  onClose: () => void;
}

export const NotificationToast = ({ notification, onClose }: NotificationToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      if (notification.autoHide !== false) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300); // Wait for animation to complete
        }, 4000);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle, bgColor: 'bg-profit-green', textColor: 'text-dark-bg' };
      case 'error':
        return { icon: AlertCircle, bgColor: 'bg-loss-red', textColor: 'text-white' };
      case 'warning':
        return { icon: AlertTriangle, bgColor: 'bg-warning-orange', textColor: 'text-dark-bg' };
      case 'info':
      default:
        return { icon: Info, bgColor: 'bg-accent-purple', textColor: 'text-white' };
    }
  };

  const { icon: Icon, bgColor, textColor } = getIconAndColor(notification.type);

  return (
    <div 
      className={`fixed top-20 left-4 right-4 ${bgColor} ${textColor} p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{notification.title}</span>
        </div>
        <button 
          className={`${textColor} hover:opacity-70 transition-opacity`}
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {notification.message && (
        <p className="mt-1 text-sm opacity-80">{notification.message}</p>
      )}
    </div>
  );
};
