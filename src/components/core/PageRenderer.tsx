"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
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
    <>
      <ShaderGradientCanvas
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          opacity: 0.25,
          zIndex: -1, // Place it behind all other content
        }}
      >
        <ShaderGradient
          control="query"
          urlString="https://www.shadergradient.co/customize?animate=on&axesHelper=off&bgColor1=%23000000&bgColor2=%23000000&brightness=0.8&cAzimuthAngle=270&cDistance=0.5&cPolarAngle=180&cameraZoom=4.3&color1=%2373bfc4&color2=%23ff810a&color3=%238da0ce&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide&grain=on&lightType=env&pixelDensity=1&positionX=-0.1&positionY=0&positionZ=0&range=enabled&rangeEnd=40&rangeStart=0&reflection=0.4&rotationX=0&rotationY=130&rotationZ=70&shader=defaults&type=sphere&uAmplitude=3.2&uDensity=0.8&uFrequency=5.5&uSpeed=0.3&uStrength=0.3&uTime=0&wireframe=false"
        />
      </ShaderGradientCanvas>
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
    </>
  );
};

export default PageRenderer;
