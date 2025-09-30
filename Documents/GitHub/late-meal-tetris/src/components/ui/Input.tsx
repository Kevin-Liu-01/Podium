import React from "react";

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    {...props}
    className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50 focus:outline-none ${className}`}
  />
);
