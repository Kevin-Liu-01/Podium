import React from "react";
import { AnimatePresence } from "framer-motion";
import type { Toast as ToastType } from "../../lib/types";
import { Toast } from "./Toast";

interface ToastContainerProps {
  toasts: ToastType[];
  removeToast: (id: number) => void;
}

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed right-5 bottom-5 z-[100] w-80 space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
