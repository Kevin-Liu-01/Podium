import React from "react";

const LoadingSpinner = () => (
  <div className="flex h-full items-center justify-center p-20">
    <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-orange-500"></div>
  </div>
);

export default LoadingSpinner;
