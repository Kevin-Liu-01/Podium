import React, { useEffect } from "react";
import { motion } from "framer-motion";
import type { Toast as ToastType } from "../../lib/types";

interface ToastProps {
  toast: ToastType;
  removeToast: (id: number) => void;
}

export const Toast = ({ toast, removeToast }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const colors = {
    success: "bg-emerald-600 border-emerald-400",
    error: "bg-rose-600 border-rose-400",
    info: "bg-sky-600 border-sky-400",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 150, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex items-center gap-3 rounded-lg border-l-4 p-3 text-white shadow-lg ${
        colors[toast.type]
      }`}
    >
      <span className="text-sm">{toast.message}</span>
    </motion.div>
  );
};
