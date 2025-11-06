import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  icon,
}: ConfirmationDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 pl-4 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start gap-4">
              {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <div className="mt-2 text-zinc-300">{children}</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                className="bg-orange-600 hover:bg-orange-500"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="bg-zinc-800 hover:bg-red-700"
                onClick={onConfirm}
              >
                Confirm
              </Button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-5 right-6 text-zinc-500 transition-colors hover:text-white"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;
