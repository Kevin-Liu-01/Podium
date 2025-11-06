import React, { useState, useEffect } from "react";
import {
  getCountFromServer,
  collection,
  type Timestamp,
} from "firebase/firestore";
import {
  Users,
  Server,
  Building2,
  Trash2,
  Download,
  Loader,
} from "lucide-react";
import { db } from "../../firebase/config";
import type { Event } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import { useExport } from "../../hooks/useExport";
import MotionCard from "../ui/MotionCard";
import Tooltip from "../ui/Tooltip";

interface EventCardProps {
  event: Event;
  onDelete: (eventId: string) => void;
}

const EventCard = ({ event, onDelete }: EventCardProps) => {
  // 1. Get the 'user' object from the context
  const { setCurrentEventId, currentEventId, user } = useAppContext();
  const { exportToCSV } = useExport();
  const [stats, setStats] = useState({ judges: 0, teams: 0, floors: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const isActive = event.id === currentEventId;

  useEffect(() => {
    // 2. If there's no user, don't try to fetch
    if (!user) {
      setIsStatsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsStatsLoading(true);
      try {
        // 3. Define the new, correct base path
        const basePath = `users/${user.uid}/events/${event.id}`;
        const collections = ["judges", "teams", "floors"];

        const counts = await Promise.all(
          collections.map((col) =>
            getCountFromServer(collection(db, `${basePath}/${col}`)),
          ),
        );
        setStats({
          judges: counts[0].data().count,
          teams: counts[1].data().count,
          floors: counts[2].data().count,
        });
      } catch (error) {
        console.error("Failed to fetch event stats:", error);
        setStats({ judges: 0, teams: 0, floors: 0 }); // Clear stats on error
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchStats();
  }, [event.id, user]); // 4. Add 'user' to the dependency array

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(event.id);
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    // Note: Your 'useExport' hook will ALSO need to be updated
    // to use the user.uid to find the correct data.
    await exportToCSV(event);
    setIsDownloading(false);
  };

  const eventDate = event.createdAt
    ? event.createdAt.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not available";

  return (
    <MotionCard
      onClick={() => setCurrentEventId(event.id)}
      className={`group relative flex h-full cursor-pointer flex-col justify-between p-4 transition-all duration-300 ${
        isActive
          ? "border-2 border-orange-500/80 bg-orange-900/10 shadow-2xl shadow-orange-500/20"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      {/* Top Section: Title, Date, and Status */}
      <div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Tooltip content="This is the currently active event">
              <div className="flex items-center">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500"></span>
                </span>
              </div>
            </Tooltip>
          )}
          <h2 className="truncate text-lg font-bold text-white transition-colors group-hover:text-orange-500">
            {event.name}
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-400">{eventDate}</p>
        <p className="mt-1 text-xs text-zinc-600 group-hover:text-zinc-500">
          {event.id}
        </p>
      </div>

      {/* Footer: Stats and Action Buttons */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-black/30 p-2 shadow-inner shadow-white/5">
        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          {isStatsLoading ? (
            <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-700"></div>
          ) : (
            <>
              <Tooltip content={`${stats.judges} Judges`}>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-sky-400" />
                  {stats.judges}
                </span>
              </Tooltip>
              <Tooltip content={`${stats.teams} Teams`}>
                <span className="flex items-center gap-1.5">
                  <Server className="size-4 text-emerald-400" />
                  {stats.teams}
                </span>
              </Tooltip>
              <Tooltip content={`${stats.floors} Floors`}>
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4 text-amber-400" />
                  {stats.floors}
                </span>
              </Tooltip>
            </>
          )}
        </div>

        {/* Action Buttons (Appear on Hover) */}
        <div className="flex scale-0 gap-2 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <Tooltip content="Download Results CSV">
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800/70 hover:text-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isDownloading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
          <Tooltip content="Delete Event">
            <button
              onClick={handleDeleteClick}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-900/50 text-red-400 hover:bg-red-800/70 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </MotionCard>
  );
};

export default EventCard;
