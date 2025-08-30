import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const colors = {
  success: 'bg-green-100 text-green-800 border-green-400',
  error: 'bg-red-100 text-red-800 border-red-400',
  info: 'bg-blue-100 text-blue-800 border-blue-400',
};

const Notification: React.FC<NotificationProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded shadow border-l-4 ${colors[type]} animate-fadeIn`}> 
      <span>{message}</span>
      <button className="ml-4 text-lg font-bold text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
    </div>
  );
};

export default Notification;
