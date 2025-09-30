import React from "react";
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

  const NavButton = ({
    targetPage,
    label,
    icon,
  }: {
    targetPage: Page;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setPage(targetPage)}
      title={label}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
        page === targetPage
          ? "bg-orange-600 text-white"
          : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      <span className="h-4 w-4">{icon}</span>
      <span className="hidden font-medium lg:block">{label}</span>
    </button>
  );

  return (
    <nav className="sticky top-4 z-50 mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 px-4 shadow-lg backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex cursor-pointer items-center space-x-3"
            onClick={() => setCurrentEventId(null)}
          >
            <Trophy className="h-5 w-5 text-orange-500" />
            <h1 className="hidden text-lg font-bold text-white sm:block">
              Podium
            </h1>
          </div>

          {currentEvent && (
            <div className="w-full">
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
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 rounded-lg bg-zinc-800/50 p-1">
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
            </div>

            <div className="flex items-center space-x-1 rounded-lg bg-zinc-800/50 p-1">
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
            </div>

            <div className="flex items-center space-x-1 rounded-lg bg-zinc-800/50 p-1">
              <NavButton
                targetPage="results"
                label="Results"
                icon={<FileSpreadsheet className="size-4" />}
              />
              <button
                onClick={() => exportToCSV()}
                title="Download CSV"
                className="items-centergap-2 flex rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                <Download className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
