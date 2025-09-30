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
    className={`flex transform items-center justify-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-in-out hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-600 ${className}`}
  >
    {children}
  </button>
);
