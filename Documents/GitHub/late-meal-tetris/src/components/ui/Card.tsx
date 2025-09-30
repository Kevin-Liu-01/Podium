import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg ${className}`}
  >
    {children}
  </div>
);
