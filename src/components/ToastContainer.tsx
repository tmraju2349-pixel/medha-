import React from 'react';
import { useMedha } from '../context/MedhaContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useMedha();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toasts"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] space-y-2 w-[92%] max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="card px-4 py-3 text-sm font-semibold flex items-center gap-2.5 shadow-lift pop bg-white text-black pointer-events-auto"
        >
          <span className="text-lg">{toast.icon}</span>
          <span className="flex-1">{toast.msg}</span>
        </div>
      ))}
    </div>
  );
};
