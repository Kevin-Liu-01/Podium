"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import EventSetupPanel from "../event/EventSetupPanel";
import FloorDashboard from "../pages/FloorDashboard";
import AdminPanel from "../pages/AdminPanel";
import TeamSetup from "../pages/TeamSetup";
import AssignmentDashboard from "../pages/AssignmentDashboard";
import ResultsView from "../pages/ResultsView";

const PageRenderer = () => {
  const { isLoading, currentEvent, page, floors, setPage } = useAppContext();

  const renderContent = () => {
    if (isLoading && !currentEvent) return <EventSetupPanel />;
    if (isLoading && currentEvent) return <LoadingSpinner />;
    if (!currentEvent) return <EventSetupPanel />;

    const floor = floors.find((f) => f.id === page);
    if (floor) return <FloorDashboard floor={floor} />;

    switch (page) {
      case "admin":
        return <AdminPanel />;
      case "teams":
        return <TeamSetup />;
      case "assignments":
        return <AssignmentDashboard />;
      case "results":
        return <ResultsView />;
      default:
        if (setPage) setPage("admin");
        return <AdminPanel />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageRenderer;
