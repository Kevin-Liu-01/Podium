"use client";

import React from "react";
import { AppProvider } from "../components/core/AppProvider";
import PageRenderer from "../components/core/PageRenderer";

export default function App() {
  return (
    <AppProvider>
      <PageRenderer />
    </AppProvider>
  );
}
