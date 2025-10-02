import React from "react";
import type { InputMode } from "../../lib/types";

interface ToggleButtonProps {
  left: string;
  right: string;
  value: InputMode;
  onChange: (val: InputMode) => void;
}

export const ToggleButton = ({
  left,
  right,
  value,
  onChange,
}: ToggleButtonProps) => (
  <div className="flex rounded-lg bg-black/20 p-1 shadow-inner shadow-white/10">
    <button
      onClick={() => onChange("single")}
      className={`w-full rounded-md py-1 text-xs font-semibold transition-all duration-200 ${
        value === "single"
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
          : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {left}
    </button>
    <button
      onClick={() => onChange("bulk")}
      className={`w-full rounded-md py-1 text-xs font-semibold transition-all duration-200 ${
        value === "bulk"
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
          : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {right}
    </button>
  </div>
);
