import React from "react";

const LoadingSpinner = () => (
  <div className="flex h-full items-center justify-center p-20">
    <div
      className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-orange-500 shadow-[0_0_15px_#f9731650]"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

export default LoadingSpinner;
