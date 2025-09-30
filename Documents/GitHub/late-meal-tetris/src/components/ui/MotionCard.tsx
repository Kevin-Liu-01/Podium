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
    className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg ${className}`}
  >
    {children}
  </motion.div>
);

export default MotionCard;
