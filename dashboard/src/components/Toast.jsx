import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  };

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      if (!message) return;
      let type = 'success';
      const msgLower = String(message).toLowerCase();

      if (
        msgLower.includes('erreur') ||
        msgLower.includes('error') ||
        msgLower.includes('échoué') ||
        msgLower.includes('fail') ||
        msgLower.includes('impossible') ||
        msgLower.includes('rejet') ||
        msgLower.includes('rejeté') ||
        msgLower.includes('suppression') ||
        msgLower.includes('annulé')
      ) {
        type = 'error';
      } else if (
        msgLower.includes('veuillez') ||
        msgLower.includes('indiquer') ||
        msgLower.includes('sélectionner') ||
        msgLower.includes('obligatoire') ||
        msgLower.includes('attention') ||
        msgLower.includes('requis') ||
        msgLower.includes('motif') ||
        msgLower.includes('commentaire') ||
        msgLower.includes('doit') ||
        msgLower.includes('doivent') ||
        msgLower.includes('champ') ||
        msgLower.includes('champs')
      ) {
        type = 'warning';
      } else if (
        msgLower.includes('info') ||
        msgLower.includes('chargement') ||
        msgLower.includes('information')
      ) {
        type = 'info';
      }

      addToast(message, type);
    };

    window.showToast = (message, type = 'success', duration = 3000) => {
      addToast(message, type, duration);
    };

    return () => {
      window.alert = originalAlert;
      delete window.showToast;
    };
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} />;
      case 'error':
        return <XCircle size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} ${
              toast.isExiting ? 'exit' : ''
            }`}
          >
            <div className="toast-icon">{getIcon(toast.type)}</div>
            <div className="toast-content">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
