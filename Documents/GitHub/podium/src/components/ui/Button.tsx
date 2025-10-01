import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export const Button = ({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`flex transform items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 active:translate-y-0 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 ${className}`}
  >
    {children}
  </button>
);
