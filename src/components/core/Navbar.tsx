import React, { useState, useEffect } from "react";
import {
  Trophy,
  Users,
  ClipboardList,
  Building2,
  Calendar,
  FileSpreadsheet,
  Server,
  Download,
  LayoutGrid,
  Loader,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useExport } from "../../hooks/useExport";
import type { Page } from "../../lib/types";
import { CustomDropdown } from "../ui/CustomDropdown";
import Tooltip from "../ui/Tooltip";
import Image from "next/image";

// A small hook to get formatted time, updating every second.
const useClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // Formatting for "HH:MM AM/PM"
  return time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const Navbar = () => {
  const { page, setPage, floors, events, currentEvent, setCurrentEventId } =
    useAppContext();
  // Get isExporting state from the hook
  const { exportToCSV, isExporting } = useExport();
  const [isScrolled, setIsScrolled] = useState(false);
  const currentTime = useClock();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update download handler to be async and pass the current event
  const handleDownload = async () => {
    if (currentEvent) {
      await exportToCSV(currentEvent);
    }
  };

  const NavButton = ({
    targetPage,
    label,
    icon,
  }: {
    targetPage: Page;
    label: string;
    icon: React.ReactNode;
  }) => {
    const isActive = page === targetPage;
    return (
      <Tooltip content={label} position="bottom">
        <button
          onClick={() => setPage(targetPage)}
          className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-300 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
            isActive
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white [filter:drop-shadow(0_0_6px_theme(colors.orange.500))]"
              : "bg-white/5 text-zinc-300 shadow-inner shadow-white/10 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="h-4 w-4">{icon}</span>
          <span className="hidden lg:block">{label}</span>
        </button>
      </Tooltip>
    );
  };

  const navVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.005, ease: "easeIn" },
    },
  };

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled
          ? "mx-auto w-full max-w-full md:top-0"
          : "mx-auto max-w-7xl px-4 md:top-4"
      }`}
    >
      <div
        className={`group relative mx-auto border-b border-zinc-700/50 bg-zinc-900/70 p-3 px-4 shadow-2xl shadow-black/50 transition-all duration-500 ease-in-out md:border ${
          isScrolled
            ? "backdrop-blur-xl"
            : "border-transparent bg-transparent shadow-none md:rounded-2xl"
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute inset-0 -z-10 h-full bg-zinc-900/80 transition-colors duration-300 group-hover:bg-zinc-900"></div>
          <div className="absolute top-0 left-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),rgba(249,115,22,0)_50%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
          <div className="absolute top-0 left-[-100%] h-full w-1/2 -skew-x-45 bg-white/5 transition-all duration-700 group-hover:left-[150%]"></div>
        </div>

        <div className="mx-auto flex h-full min-h-[44px] max-w-7xl items-center justify-between">
          <div className="flex flex-shrink-0 items-center gap-4">
            <Tooltip content="Return to Event Selection" position="bottom">
              <div
                className="group flex cursor-pointer items-center space-x-2.5 px-2"
                onClick={() => setCurrentEventId(null)}
              >
                <Trophy className="size-6 text-orange-400 [filter:drop-shadow(0_0_8px_theme(colors.amber.500/0.8))] transition-transform duration-300 group-hover:scale-110 hover:rotate-12" />
                <div className="h-6 w-px bg-white/30"></div>

                <h1 className="hidden items-center bg-gradient-to-br from-white to-zinc-400 bg-clip-text py-2 pr-3 text-xl font-bold text-transparent sm:flex">
                  <Image
                    src="/princeton.png"
                    alt="Princeton P"
                    className="inline h-4 w-4 align-middle"
                    width={32}
                    height={32}
                  />
                  ODIUM
                </h1>
              </div>
            </Tooltip>

            {!currentEvent && (
              <div className="hidden items-center gap-2.5 rounded-md bg-black/20 px-3 py-1 text-sm shadow-inner shadow-white/10 lg:flex">
                <Clock className="size-4 text-zinc-500" />
                <span className="font-bold text-zinc-400">
                  {// user location
                  Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone.split("/")[1]
                    ?.replace("_", " ")}
                </span>
                <div className="h-4 w-px bg-white/10"></div>
                <span className="font-mono font-medium text-zinc-200">
                  {currentTime}
                </span>
              </div>
            )}

            {currentEvent && (
              <div className="hidden w-full min-w-48 md:block">
                <Tooltip content="Switch Event" position="bottom">
                  <div>
                    <CustomDropdown
                      value={currentEvent.id}
                      onChange={(id) => setCurrentEventId(id)}
                      options={events.map((e) => ({
                        value: e.id,
                        label: e.name,
                      }))}
                      placeholder="Select Event"
                      icon={<Calendar className="h-4 w-4 text-zinc-400" />}
                    />
                  </div>
                </Tooltip>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {currentEvent ? (
              <motion.div
                key="controls"
                variants={navVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center space-x-1 rounded-xl bg-black/20 p-1 shadow-inner shadow-white/10"
              >
                <NavButton
                  targetPage="admin"
                  label="Setup"
                  icon={<Users className="size-4" />}
                />
                <NavButton
                  targetPage="teams"
                  label="Teams"
                  icon={<Server className="size-4" />}
                />
                <div className="h-5 w-px bg-white/10"></div>
                <NavButton
                  targetPage="assignments"
                  label="Assignments"
                  icon={<ClipboardList className="size-4" />}
                />
                {floors.map((floor) => (
                  <NavButton
                    key={floor.id}
                    targetPage={floor.id}
                    label={floor.name}
                    icon={<Building2 className="size-4" />}
                  />
                ))}
                <div className="h-5 w-px bg-white/10"></div>
                <NavButton
                  targetPage="results"
                  label="Results"
                  icon={<FileSpreadsheet className="size-4" />}
                />
                <Tooltip content="Download Results CSV" position="bottom">
                  <div>
                    <button
                      onClick={handleDownload}
                      disabled={isExporting}
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-300 shadow-inner shadow-white/10 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-700"
                    >
                      {isExporting ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </button>
                  </div>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                key="home"
                variants={navVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center gap-4 rounded-lg bg-black/20 px-4 py-2 text-sm shadow-inner shadow-white/10"
              >
                <LayoutGrid className="size-4 text-zinc-400" />
                <span className="text-zinc-300">Select an event to begin</span>
                <div className="h-4 w-px bg-white/10"></div>
                <span className="font-semibold text-orange-400">
                  {events.length}
                </span>
                <span className="text-zinc-400">Events Loaded</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
