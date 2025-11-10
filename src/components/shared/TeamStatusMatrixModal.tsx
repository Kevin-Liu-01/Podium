"use client";
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Team, Assignment } from "../../lib/types";
import Tooltip from "../ui/Tooltip";
import { Button } from "../ui/Button";

// Calculates color based on seen count
// Uses HSL for a smooth transition from dark orange to bright orange
const getStatusColor = (
  seenCount: number,
  maxSeen: number,
): React.CSSProperties => {
  if (seenCount === 0) {
    return { backgroundColor: "rgb(63 63 70 / 0.8)" }; // zinc-700
  }
  // Clamp maxSeen to at least 1 to avoid division by zero
  const max = Math.max(1, maxSeen);
  // Normalize from 0.0 (1 seen) to 1.0 (max seen)
  const ratio = (seenCount - 1) / Math.max(1, max - 1);

  // We'll vary lightness.
  // Start at a dark orange (lightness 25%)
  // End at a bright orange (lightness 60%)
  const lightness = 25 + ratio * 35;
  return { backgroundColor: `hsl(24, 95%, ${lightness}%)` };
};

const TeamDot = ({
  team,
  isAssigned,
  seenCount,
  maxSeen,
}: {
  team: Team;
  isAssigned: boolean;
  seenCount: number;
  maxSeen: number;
}) => {
  return (
    <Tooltip
      position="top"
      content={
        <div className="text-left">
          <p className="font-bold">
            #{team.number}: {team.name}
          </p>
          <p className="text-xs">Reviews: {seenCount}</p>
          {isAssigned && (
            <p className="text-xs font-semibold text-cyan-300">
              Actively Assigned
            </p>
          )}
        </div>
      }
    >
      <div
        className="relative flex size-8 cursor-default items-center justify-center rounded-full border border-white/10"
        style={getStatusColor(seenCount, maxSeen)}
      >
        <span className="text-xs font-bold text-white/50">{team.number}</span>
        {isAssigned && (
          <div className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-900 bg-cyan-400"></div>
        )}
      </div>
    </Tooltip>
  );
};

const TeamStatusMatrixModal = ({
  isOpen,
  onClose,
  teams,
  assignments,
  floorName,
}: {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  assignments: Assignment[];
  floorName: string;
}) => {
  const { teamStatusMap, maxSeenCount } = useMemo(() => {
    const activeAssignments = assignments.filter((a) => !a.submitted);
    const activeTeamIds = new Set(activeAssignments.flatMap((a) => a.teamIds));

    const map = new Map<
      string,
      {
        seenCount: number;
        isAssigned: boolean;
      }
    >();

    let maxSeen = 0;
    for (const team of teams) {
      const seenCount = team.reviewedBy?.length ?? 0;
      if (seenCount > maxSeen) {
        maxSeen = seenCount;
      }
      map.set(team.id, {
        seenCount: seenCount,
        isAssigned: activeTeamIds.has(team.id),
      });
    }
    return { teamStatusMap: map, maxSeenCount: maxSeen };
  }, [teams, assignments]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              onClick={onClose}
              size="sm"
              className="absolute top-3 right-3"
            >
              <X className="size-5" />
            </Button>

            <h2 className="text-xl font-bold text-white">Team Status Matrix</h2>
            <p className="mb-4 text-sm text-zinc-400">
              Floor:{" "}
              <span className="font-semibold text-orange-400">{floorName}</span>
            </p>

            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <h3 className="text-sm font-semibold text-zinc-300">Legend:</h3>
              <div className="flex items-center gap-2">
                <div className="size-4 rounded-full bg-zinc-700"></div>
                <span className="text-xs text-zinc-400">Not Seen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div
                    className="size-4 rounded-full"
                    style={getStatusColor(1, 10)}
                  ></div>
                  <div
                    className="size-4 rounded-full"
                    style={getStatusColor(5, 10)}
                  ></div>
                  <div
                    className="size-4 rounded-full"
                    style={getStatusColor(10, 10)}
                  ></div>
                </div>
                <span className="text-xs text-zinc-400">
                  Seen (Dark to Bright)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative size-4 rounded-full bg-orange-500">
                  <div className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-900 bg-cyan-400"></div>
                </div>
                <span className="text-xs text-zinc-400">Actively Assigned</span>
              </div>
            </div>

            <div className="custom-scrollbar max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                {teams.map((team) => {
                  const status = teamStatusMap.get(team.id) ?? {
                    seenCount: 0,
                    isAssigned: false,
                  };
                  return (
                    <TeamDot
                      key={team.id}
                      team={team}
                      isAssigned={status.isAssigned}
                      seenCount={status.seenCount}
                      maxSeen={maxSeenCount}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamStatusMatrixModal;
