import React, { useState, useMemo } from "react";
import { writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Team, Review } from "../../lib/types";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { Trophy, Medal, XCircle } from "lucide-react";

const ScoreEntryForm = ({
  assignment,
  onBack,
}: {
  assignment: Assignment;
  onBack: () => void;
}) => {
  const { teams, judges, currentEvent, showToast } = useAppContext();
  const [rankings, setRankings] = useState<{
    [teamId: string]: Review["rank"];
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const judge = useMemo(
    () => judges.find((j) => j.id === assignment.judgeId),
    [judges, assignment],
  );
  const assignedTeams = useMemo(
    () =>
      assignment.teamIds
        .map((id) => teams.find((p) => p.id === id))
        .filter((p): p is Team => !!p)
        .sort((a, b) => a.number - b.number),
    [assignment, teams],
  );

  // New logic to handle exclusive podium ranks
  const handleRankSelect = (teamId: string, rank: Review["rank"]) => {
    setRankings((prevRankings) => {
      const newRankings = { ...prevRankings };

      // If the team already had this rank, un-rank it.
      if (prevRankings[teamId] === rank) {
        newRankings[teamId] = 0;
        return newRankings;
      }

      // If a podium rank is selected, find if another team already has it.
      if (rank !== 0) {
        const otherTeamWithRank = Object.keys(newRankings).find(
          (key) => newRankings[key] === rank,
        );
        // If found, demote the other team to 'Unranked'.
        if (otherTeamWithRank) {
          newRankings[otherTeamWithRank] = 0;
        }
      }

      // Assign the new rank to the clicked team.
      newRankings[teamId] = rank;
      return newRankings;
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const batch = writeBatch(db);
    const scores: { [key in Review["rank"]]: number } = {
      0: 0,
      1: 3,
      2: 2,
      3: 1,
    };

    assignedTeams.forEach((team) => {
      const rank = rankings[team.id] ?? 0;
      const newReview: Review = {
        judgeId: assignment.judgeId,
        score: scores[rank],
        rank,
      };
      const newReviewedBy = [...team.reviewedBy, newReview];
      const newTotalScore = team.totalScore + scores[rank];
      batch.update(doc(db, `events/${currentEvent!.id}/teams`, team.id), {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newTotalScore / newReviewedBy.length,
      });
    });

    batch.update(
      doc(db, `events/${currentEvent!.id}/assignments`, assignment.id),
      { submitted: true },
    );
    if (judge) {
      batch.update(doc(db, `events/${currentEvent!.id}/judges`, judge.id), {
        currentAssignmentId: "",
        completedAssignments: (judge.completedAssignments || 0) + 1,
      });
    }

    try {
      await batch.commit();
      showToast(`Scores for ${judge?.name} submitted!`, "success");
      onBack();
    } catch (e) {
      showToast("Failed to submit scores.", "error");
      console.error("Score submission error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Styling and Content for Rank Buttons ---
  const rankInfo: {
    [key in Review["rank"]]: {
      label: string;
      icon: React.ReactNode;
      selected: string;
      base: string;
    };
  } = {
    1: {
      label: "1st",
      icon: <Trophy className="size-4" />,
      selected: "bg-amber-500 text-white shadow-lg shadow-amber-500/20",
      base: "bg-zinc-700/50 hover:bg-amber-500/80",
    },
    2: {
      label: "2nd",
      icon: <Medal className="size-4" />,
      selected: "bg-slate-400 text-white shadow-lg shadow-slate-400/20",
      base: "bg-zinc-700/50 hover:bg-slate-400/80",
    },
    3: {
      label: "3rd",
      icon: <Medal className="size-4" />,
      selected: "bg-orange-600 text-white shadow-lg shadow-orange-600/20",
      base: "bg-zinc-700/50 hover:bg-orange-600/80",
    },
    0: {
      label: "Unranked",
      icon: <XCircle className="size-4" />,
      selected: "bg-zinc-500 text-white",
      base: "bg-zinc-700/50 hover:bg-zinc-500/80",
    },
  };

  const getRowClass = (teamId: string) => {
    const rank = rankings[teamId];
    switch (rank) {
      case 1:
        return "border-l-4 border-amber-400";
      case 2:
        return "border-l-4 border-slate-400";
      case 3:
        return "border-l-4 border-orange-600";
      default:
        return "border-l-4 border-transparent";
    }
  };

  return (
    <MotionCard>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enter Scores for {judge?.name}</h2>
        <Button onClick={onBack} className="bg-zinc-600 hover:bg-zinc-500">
          &larr; Back
        </Button>
      </div>
      <div className="space-y-4">
        {assignedTeams.map((team) => (
          <div
            key={team.id}
            className={`flex items-center justify-between rounded-lg bg-zinc-800/80 p-4 transition-all ${getRowClass(team.id)}`}
          >
            <p className="text-lg font-bold">Team {team.number}</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 0].map((r) => {
                const rank = r as Review["rank"];
                const { label, icon, selected, base } = rankInfo[rank];
                const isSelected = rankings[team.id] === rank;
                return (
                  <Button
                    key={r}
                    onClick={() => handleRankSelect(team.id, rank)}
                    className={`${isSelected ? selected : base} flex items-center gap-2`}
                  >
                    {icon} {label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-gradient-to-br from-orange-500 to-orange-600 md:w-auto"
        >
          {isLoading ? "Submitting..." : "Submit All Scores"}
        </Button>
      </div>
    </MotionCard>
  );
};
export default ScoreEntryForm;
