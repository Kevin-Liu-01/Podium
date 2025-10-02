import React from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const Tooltip = ({
  children,
  content,
  className,
  position = "top",
}: TooltipProps) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    // By naming this group "tooltip", we isolate its hover state.
    <div className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <div
        className={cn(
          // We specifically target "group-hover/tooltip" to only react to its parent.
          "pointer-events-none absolute z-20 w-max max-w-[14rem] scale-90 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg transition-all duration-200 ease-in-out group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100",
          positionClasses[position],
        )}
      >
        {/* Triangle SVG that continues the border and bg color of the tooltip */}
        <svg
          className={cn(
            "absolute h-2 w-2",
            position === "top" &&
              "bottom-[-5px] left-1/2 -translate-x-1/2 rotate-225 border-t border-l border-zinc-800 bg-zinc-950",
            position === "bottom" &&
              "top-[-5px] left-1/2 -translate-x-1/2 rotate-225 border-r border-b border-zinc-800 bg-zinc-950",
            position === "left" &&
              "top-1/2 right-[-5px] -translate-y-1/2 rotate-225 border-b border-l border-zinc-800 bg-zinc-950",
            position === "right" &&
              "top-1/2 left-[-5px] -translate-y-1/2 rotate-225 border-t border-r border-zinc-800 bg-zinc-950",
          )}
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 10L10 0H0V10Z" />
        </svg>

        {content}
      </div>
    </div>
  );
};

export default Tooltip;
