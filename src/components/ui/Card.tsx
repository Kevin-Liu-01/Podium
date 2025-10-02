import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={`group relative rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-150 hover:border-orange-500/20 ${className}`}
  >
    {children}
  </div>
);
