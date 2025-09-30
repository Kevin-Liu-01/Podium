import React, { useState, useEffect, useRef } from "react";
import { ChevronsUpDown } from "lucide-react";

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
}

export const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  icon,
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-left text-sm text-zinc-200 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {icon}
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        <ChevronsUpDown className="ml-1 h-4 w-4 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/80 p-1 shadow-lg backdrop-blur-xl">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-orange-600 hover:text-white"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="p-2 text-sm text-zinc-400">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
