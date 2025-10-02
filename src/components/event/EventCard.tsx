import React, { useState, useEffect } from "react";
import { getCountFromServer, collection } from "firebase/firestore";
import { Users, Server, Building2, Trash2 } from "lucide-react";
import { db } from "../../firebase/config";
import type { Event } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import MotionCard from "../ui/MotionCard";

interface EventCardProps {
  event: Event;
  onDelete: (eventId: string) => void;
}

const EventCard = ({ event, onDelete }: EventCardProps) => {
  const { setCurrentEventId } = useAppContext();
  const [stats, setStats] = useState({ judges: 0, teams: 0, floors: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsStatsLoading(true);
      const collections = ["judges", "teams", "floors"];
      try {
        const counts = await Promise.all(
          collections.map((col) =>
            getCountFromServer(collection(db, `events/${event.id}/${col}`)),
          ),
        );
        setStats({
          judges: counts[0].data().count,
          teams: counts[1].data().count,
          floors: counts[2].data().count,
        });
      } catch (error) {
        console.error("Failed to fetch event stats:", error);
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchStats();
  }, [event.id]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    onDelete(event.id);
  };

  return (
    <MotionCard
      onClick={() => setCurrentEventId(event.id)}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden p-5"
    >
      {/* Delete Button */}
      <button
        onClick={handleDeleteClick}
        className="absolute top-3 right-3 z-10 scale-0 rounded-full bg-red-900/50 p-1.5 text-red-400 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 hover:bg-red-800/70 hover:text-red-300"
        title="Delete Event"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Card Content */}
      <div>
        <h2 className="text-lg font-bold text-white transition-colors group-hover:text-orange-300">
          {event.name}
        </h2>
        <p className="text-sm text-zinc-400">{event.id}</p>
      </div>

      <div className="mt-4 rounded-lg bg-black/30 p-2 shadow-inner shadow-white/5">
        <div className="flex justify-around text-sm text-zinc-300">
          {isStatsLoading ? (
            <div className="h-5 w-full animate-pulse rounded-full bg-zinc-700"></div>
          ) : (
            <>
              <span className="flex items-center gap-1.5" title="Judges">
                <Users className="size-4 text-sky-400" />
                {stats.judges}
              </span>
              <span className="flex items-center gap-1.5" title="Teams">
                <Server className="size-4 text-emerald-400" />
                {stats.teams}
              </span>
              <span className="flex items-center gap-1.5" title="Floors">
                <Building2 className="size-4 text-amber-400" />
                {stats.floors}
              </span>
            </>
          )}
        </div>
      </div>
    </MotionCard>
  );
};

export default EventCard;
