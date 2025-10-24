import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  /**
   * Defines the size of the button.
   * @default 'md'
   */
  size?: "sm" | "md" | "lg";
}

export const Button = ({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
  size = "md",
}: ButtonProps) => {
  // --- Size mapping for Tailwind CSS classes ---
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex transform cursor-pointer items-center justify-center gap-2 rounded-lg font-bold transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 ${sizeStyles[size]} ${className} `}
    >
      {children}
    </button>
  );
};
