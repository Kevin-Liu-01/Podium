import { CheckSquare, Square } from "lucide-react";

export const Checkbox = ({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label
    htmlFor={id}
    className="flex cursor-pointer items-start space-x-3 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-3 transition-colors hover:border-zinc-600"
  >
    {checked ? (
      <CheckSquare className="size-5 flex-shrink-0 text-orange-500" />
    ) : (
      <Square className="size-5 flex-shrink-0 text-zinc-600" />
    )}
    <input
      id={id}
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <div className="flex-1 text-sm text-zinc-300">{label}</div>
  </label>
);
