import React, { useState, useEffect } from "react";
import { getCountFromServer, collection } from "firebase/firestore";
import { Users, Server, Building2 } from "lucide-react";
import { db } from "../../firebase/config";
import type { Event } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import MotionCard from "../ui/MotionCard";

const EventCard = ({ event }: { event: Event }) => {
  const { setCurrentEventId } = useAppContext();
  const [stats, setStats] = useState({ judges: 0, projects: 0, rooms: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsStatsLoading(true);
      const collections = ["judges", "projects", "rooms"];
      try {
        const counts = await Promise.all(
          collections.map((col) =>
            getCountFromServer(collection(db, `events/${event.id}/${col}`)),
          ),
        );
        setStats({
          judges: counts[0].data().count,
          projects: counts[1].data().count,
          rooms: counts[2].data().count,
        });
      } catch (error) {
        console.error("Failed to fetch event stats:", error);
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchStats();
  }, [event.id]);

  return (
    <MotionCard
      className="group flex cursor-pointer flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10"
      onClick={() => setCurrentEventId(event.id)}
    >
      <div>
        <h2 className="text-lg font-bold text-white transition-colors group-hover:text-orange-300">
          {event.name}
        </h2>
        <p className="text-sm text-zinc-400">{event.id}</p>
      </div>

      <div className="mt-4 flex justify-between text-sm text-zinc-300">
        {isStatsLoading ? (
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-zinc-700"></div>
        ) : (
          <>
            <span className="flex items-center gap-1.5" title="Judges">
              <Users className="h-4 w-4 text-sky-500" />
              {stats.judges}
            </span>
            <span className="flex items-center gap-1.5" title="Projects">
              <Server className="h-4 w-4 text-emerald-500" />
              {stats.projects}
            </span>
            <span className="flex items-center gap-1.5" title="Rooms">
              <Building2 className="h-4 w-4 text-amber-500" />
              {stats.rooms}
            </span>
          </>
        )}
      </div>
    </MotionCard>
  );
};

export default EventCard;
