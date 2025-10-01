import React from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "../../lib/animations";

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const MotionCard = ({ children, className = "", onClick }: MotionCardProps) => (
  <motion.div
    variants={fadeInUp}
    onClick={onClick}
    className={`rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-black/40 backdrop-blur-md ${className}`}
  >
    {children}
  </motion.div>
);

export default MotionCard;
