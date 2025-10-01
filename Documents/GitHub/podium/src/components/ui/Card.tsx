import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={`group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-150 hover:border-orange-500/50 ${className}`}
  >
    {/* --- Background & Glint Effects --- */}
    {/* Base background color with hover transition */}
    <div className="absolute inset-0 -z-10 bg-zinc-900/80 transition-colors duration-300 group-hover:bg-zinc-900"></div>
    {/* Orange radial glow on hover */}
    <div className="absolute top-0 left-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),rgba(249,115,22,0)_50%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
    {/* Sweeping metallic glint on hover */}
    <div className="absolute top-0 left-[-100%] h-full w-1/2 -skew-x-45 bg-white/5 transition-all duration-700 group-hover:left-[150%]"></div>

    {/* The card's actual content */}
    {children}
  </div>
);
