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
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useExport } from "../../hooks/useExport";
import type { Page } from "../../lib/types";
import { CustomDropdown } from "../ui/CustomDropdown";

const Navbar = () => {
  const { page, setPage, floors, events, currentEvent, setCurrentEventId } =
    useAppContext();
  const { exportToCSV } = useExport();
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to detect scroll and apply different styles
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      <button
        onClick={() => setPage(targetPage)}
        title={label}
        className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-300 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
          isActive
            ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_0_15px_theme(colors.orange.500)]"
            : "bg-white/5 text-zinc-300 shadow-inner shadow-white/5 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="h-4 w-4">{icon}</span>
        <span className="hidden lg:block">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 mx-auto max-w-7xl transition-all duration-300 ease-in-out md:top-4 md:px-4 ${
        isScrolled ? "md:rounded-2xl" : "md:rounded-none"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-none border-b border-zinc-700/80 bg-zinc-900/90 p-3 px-4 transition-all duration-300 md:rounded-2xl md:border ${
          isScrolled ? "backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        {/* Metallic Gloss Effect */}
        <div className="absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-400/50 to-transparent"></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-800/80 to-zinc-900/90"></div>

        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex flex-shrink-0 items-center gap-4">
            <div
              className="group flex cursor-pointer items-center space-x-2.5"
              onClick={() => setCurrentEventId(null)}
            >
              <Trophy className="size-6 text-amber-400 transition-transform group-hover:scale-110" />
              <h1 className="hidden bg-gradient-to-br from-white to-zinc-400 bg-clip-text py-2 text-xl font-bold text-transparent sm:block">
                Podium
              </h1>
            </div>

            {currentEvent && (
              <div className="w-full min-w-48">
                <CustomDropdown
                  value={currentEvent?.id || ""}
                  onChange={(id) => setCurrentEventId(id)}
                  options={events.map((e) => ({ value: e.id, label: e.name }))}
                  placeholder="Select Event"
                  icon={<Calendar className="h-4 w-4 text-zinc-400" />}
                />
              </div>
            )}
          </div>

          {currentEvent && (
            <div className="flex items-center space-x-1 rounded-xl bg-black/20 p-1 shadow-inner shadow-white/5">
              <NavButton
                targetPage="admin"
                label="Setup"
                icon={<Users className="size-4" />}
              />
              <NavButton
                targetPage="projects"
                label="Projects"
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
              <button
                onClick={() => exportToCSV()}
                title="Download CSV"
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-zinc-300 shadow-inner shadow-white/5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Download className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
