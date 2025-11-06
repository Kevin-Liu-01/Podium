"use client";
import React, { useState, useMemo, useEffect } from "react"; // Added useEffect
import { writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Team, Review } from "../../lib/types";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import {
  Trophy,
  Medal,
  XCircle,
  Loader2,
  Trash2,
  AlertTriangle,
  MessageSquarePlus,
  Save, // Added Save icon
} from "lucide-react";
import ConfirmationDialog from "../ui/ConfirmationDialog";

const ScoreEntryForm = ({
  assignment,
  onBack,
}: {
  assignment: Assignment;
  onBack: () => void;
}) => {
  // 1. Get 'user' from context
  const { teams, judges, currentEvent, showToast, user } = useAppContext();

  // --- State for Deletion ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // -------------------------

  // --- [UPDATED] State for Rankings ---
  // Now initialized by useEffect
  const [rankings, setRankings] = useState<{
    [teamId: string]: Review["rank"];
  }>({});
  // ------------------------------------

  const [isLoading, setIsLoading] = useState(false);

  // --- [UPDATED] State for Comments ---
  // `comments` holds the saved comments
  const [comments, setComments] = useState<{ [teamId: string]: string }>({});
  // `editingCommentText` holds text being actively edited
  const [editingCommentText, setEditingCommentText] = useState<{
    [teamId: string]: string | undefined;
  }>({});
  // `openCommentBoxIds` tracks which editors are open
  const [openCommentBoxIds, setOpenCommentBoxIds] = useState<string[]>([]);
  // ------------------------------------

  const judge = useMemo(
    () => judges.find((j) => j.id === assignment.judgeId),
    [judges, assignment],
  );
  const assignedTeams = useMemo(
    () =>
      assignment.teamIds
        .map((id) => teams.find((p) => p.id === id))
        .filter((p): p is Team => !!p)
        // [FEATURE 1] Sort by team number if order is forward,
        // or reverse team number if order is reversed (e.g., 20, 19, 18...)
        // We detect this by checking if the first team ID has a lower number
        // than the last team ID.
        .sort((a, b) => {
          const teamA = teams.find(
            (t) => t.id === assignment.teamIds[0],
          )?.number;
          const teamB = teams.find(
            (t) => t.id === assignment.teamIds[assignment.teamIds.length - 1],
          )?.number;
          // If first team number is less than last, sort ascending (normal)
          if (teamA && teamB && teamA < teamB) {
            return a.number - b.number;
          }
          // Otherwise, sort descending (reversed)
          return b.number - a.number;
        }),
    [assignment, teams],
  );

  // --- [NEW] useEffect to default rankings to 0 (Unranked) ---
  useEffect(() => {
    setRankings((prevRankings) => {
      const newRankings = { ...prevRankings };
      let changed = false;
      for (const team of assignedTeams) {
        if (newRankings[team.id] === undefined) {
          newRankings[team.id] = 0; // Default to Unranked
          changed = true;
        }
      }
      return changed ? newRankings : prevRankings;
    });
  }, [assignedTeams]);
  // -----------------------------------------------------------

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

  // --- [UPDATED] Comment Handlers ---
  const openCommentEditor = (teamId: string) => {
    // Copy saved comment to editing state
    setEditingCommentText((p) => ({ ...p, [teamId]: comments[teamId] || "" }));
    // Show editor
    setOpenCommentBoxIds((prevIds) => [...prevIds, teamId]);
  };

  const cancelComment = (teamId: string) => {
    // Hide editor
    setOpenCommentBoxIds((prevIds) => prevIds.filter((id) => id !== teamId));
    // Clear editing state
    setEditingCommentText((p) => ({ ...p, [teamId]: undefined }));
  };

  const saveComment = (teamId: string) => {
    // Copy editing state to saved state
    setComments((p) => ({ ...p, [teamId]: editingCommentText[teamId] || "" }));
    // Hide editor
    setOpenCommentBoxIds((prevIds) => prevIds.filter((id) => id !== teamId));
    // Clear editing state
    setEditingCommentText((p) => ({ ...p, [teamId]: undefined }));
  };
  // ------------------------------------

  // 2. [FIXED] handleSubmit to use correct user-centric paths
  const handleSubmit = async () => {
    if (!user || !currentEvent) {
      showToast("Error: No user or event selected.", "error");
      return;
    }
    setIsLoading(true);

    const batch = writeBatch(db);
    // 3. Define the correct base path
    const basePath = `users/${user.uid}/events/${currentEvent.id}`;
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
        comments: comments[team.id] || "", // [FEATURE 3] Add comment
      };
      const newReviewedBy = [...team.reviewedBy, newReview];
      const newTotalScore = team.totalScore + scores[rank];
      // 4. Update team doc with correct path
      batch.update(doc(db, `${basePath}/teams`, team.id), {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newTotalScore / newReviewedBy.length,
      });
    });

    // 5. Update assignment doc with correct path
    batch.update(doc(db, `${basePath}/assignments`, assignment.id), {
      submitted: true,
    });
    if (judge) {
      // 6. Update judge doc with correct path
      batch.update(doc(db, `${basePath}/judges`, judge.id), {
        currentAssignmentId: null, // Use null for consistency
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

  // --- [NEW] Handler for Deleting the Assignment ---
  const handleDeleteAssignment = async () => {
    if (!user || !currentEvent || !judge) {
      showToast("Error: Cannot delete, missing data.", "error");
      return;
    }
    setIsDeleting(true);
    const batch = writeBatch(db);
    const basePath = `users/${user.uid}/events/${currentEvent.id}`;

    // 1. Get ref to assignment
    const assignmentRef = doc(db, `${basePath}/assignments`, assignment.id);
    // 2. Get ref to judge
    const judgeRef = doc(db, `${basePath}/judges`, judge.id);

    // 3. Add operations to batch
    batch.delete(assignmentRef);
    batch.update(judgeRef, { currentAssignmentId: null }); // Free up the judge

    try {
      await batch.commit();
      showToast("Assignment deleted successfully.", "success");
      onBack(); // Go back to the previous screen
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      showToast("An error occurred while deleting.", "error");
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };
  // ------------------------------------------------

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
    // Default to 0 if not set
    const rank = rankings[teamId] ?? 0;
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
    <>
      <MotionCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Enter Scores for {judge?.name}</h2>
          <Button onClick={onBack} className="bg-zinc-600 hover:bg-zinc-500">
            &larr; Back
          </Button>
        </div>
        <div className="space-y-4">
          {assignedTeams.map((team) => {
            const isCommentOpen = openCommentBoxIds.includes(team.id);
            // Check saved comments, not editing text
            const hasComment =
              comments[team.id] && comments[team.id].length > 0;

            return (
              <div
                key={team.id}
                className={`flex flex-col gap-1 gap-x-4 rounded-lg bg-zinc-800/80 p-4 transition-all ${getRowClass(
                  team.id,
                )}`}
              >
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-lg font-bold">
                    {team.name}
                    <span className="ml-2 text-base font-normal text-zinc-400">
                      (Team {team.number})
                    </span>
                  </p>
                  <div className="flex flex-shrink-0 space-x-2">
                    {[1, 2, 3, 0].map((r) => {
                      const rank = r as Review["rank"];
                      const { label, icon, selected, base } = rankInfo[rank];
                      // Default to 0 if not set
                      const isSelected = (rankings[team.id] ?? 0) === rank;
                      return (
                        <Button
                          key={r}
                          onClick={() => handleRankSelect(team.id, rank)}
                          className={`${
                            isSelected ? selected : base
                          } flex items-center gap-2`}
                        >
                          {icon} {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* [UPDATED] Comment Section */}
                {isCommentOpen ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editingCommentText[team.id] ?? ""}
                      onChange={(e) =>
                        setEditingCommentText((p) => ({
                          ...p,
                          [team.id]: e.target.value,
                        }))
                      }
                      placeholder="Add comments (optional)..."
                      rows={2}
                      className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => cancelComment(team.id)}
                        variant="secondary"
                        size="sm"
                      >
                        <XCircle className="mr-1.5 size-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => saveComment(team.id)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                      >
                        <Save className="mr-1.5 size-4" />
                        Save Comment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => openCommentEditor(team.id)}
                    variant="ghost"
                    size="sm"
                    className="self-start text-zinc-400 hover:text-white"
                  >
                    <MessageSquarePlus className="mr-0.5 size-4" />
                    {hasComment ? "Edit Comment" : "Add Comment"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* --- [UPDATED] Footer with Delete Button --- */}
        <div className="mt-6 flex flex-col items-center gap-4 border-t border-zinc-700 pt-6 sm:flex-row sm:justify-between">
          <Button
            onClick={() => setIsConfirmOpen(true)}
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isLoading || isDeleting}
          >
            <Trash2 className="mr-2 size-4" />
            Delete Assignment
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isDeleting}
            className="w-full bg-gradient-to-br from-orange-500 to-orange-600 sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              "Submit All Scores"
            )}
          </Button>
        </div>
      </MotionCard>

      {/* --- [NEW] Confirmation Dialog --- */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment?"
        icon={<AlertTriangle className="size-6 text-rose-500" />}
        isConfirmLoading={isDeleting}
      >
        <p>
          Are you sure you want to delete this assignment for{" "}
          <strong>{judge?.name}</strong>?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          No scores will be saved, and the judge will be marked as "Assignable"
          again. This action cannot be undone.
        </p>
      </ConfirmationDialog>
    </>
  );
};
export default ScoreEntryForm;
