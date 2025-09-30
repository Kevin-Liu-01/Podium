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
  <div className="flex rounded-md bg-zinc-800 p-0.5">
    <button
      onClick={() => onChange("single")}
      className={`w-full rounded py-1 text-xs font-semibold transition-colors ${
        value === "single"
          ? "bg-orange-600 text-white"
          : "text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {left}
    </button>
    <button
      onClick={() => onChange("bulk")}
      className={`w-full rounded py-1 text-xs font-semibold transition-colors ${
        value === "bulk"
          ? "bg-orange-600 text-white"
          : "text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {right}
    </button>
  </div>
);
