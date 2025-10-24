"use client";
import React, { useState, useMemo } from "react"; // Added useMemo
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { Pencil, Save, XCircle, X, Loader2 } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Team, Review } from "../../lib/types"; // Using types from lib
import { getColorForJudge } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const ScoreDetailModal = ({
  team: teamProp, // Initial team data passed as prop
  onClose,
}: {
  team: Team | null;
  onClose: () => void;
}) => {
  // Get user, teams array, and setTeams from context
  const { judges, currentEvent, showToast, user, teams, setTeams } =
    useAppContext();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [newRank, setNewRank] = useState<Review["rank"]>(0);
  const [isSaving, setIsSaving] = useState(false);

  // --- Find the LATEST team data from context based on the prop ID ---
  const currentTeamData = useMemo(() => {
    // Find the team in the global state that matches the ID passed in props
    return teams.find((t) => t.id === teamProp?.id);
  }, [teams, teamProp?.id]); // Re-run when global teams or the prop ID changes
  // ------------------------------------------------------------------

  // Use the dynamically found team data for rendering.
  // If the prop is null (modal closing) or the team isn't found in context yet, return null.
  if (!teamProp || !currentTeamData) {
    return null;
  }

  // Use currentTeamData for calculations and display from now on
  const team = currentTeamData;

  const handleSaveClick = async () => {
    // Guard clauses remain the same
    if (!editingReview || !currentEvent || !user || !team) {
      showToast("Cannot save: Missing required data.", "error");
      return;
    }
    setIsSaving(true);

    const scores: Record<Review["rank"], number> = { 0: 0, 1: 3, 2: 2, 3: 1 };
    const newScore = scores[newRank];
    const oldScore = editingReview.score;

    // Calculate updates based on the CURRENT team data
    const newReviewedBy = team.reviewedBy.map((r) =>
      r.judgeId === editingReview.judgeId
        ? { ...r, rank: newRank, score: newScore }
        : r,
    );
    const currentTotalScore =
      typeof team.totalScore === "number" ? team.totalScore : 0;
    const newTotalScore = currentTotalScore - oldScore + newScore;
    const newAverageScore =
      newReviewedBy.length > 0 ? newTotalScore / newReviewedBy.length : 0;

    const updatedTeamDataForState = {
      // Renamed variable for clarity
      ...team,
      reviewedBy: newReviewedBy,
      totalScore: newTotalScore,
      averageScore: newAverageScore,
    };

    const teamDocRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/teams`,
      team.id,
    );

    try {
      // Update Firestore (payload remains the same)
      await updateDoc(teamDocRef, {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
      });

      // Update Local Context State IMMEDIATELY for instant UI feedback
      setTeams((currentTeams) => {
        const teamIndex = currentTeams.findIndex((t) => t.id === team.id);
        if (teamIndex === -1) return currentTeams;
        const updatedTeams = [...currentTeams];
        updatedTeams[teamIndex] = updatedTeamDataForState; // Use the calculated data
        return updatedTeams;
      });

      showToast("Review updated successfully!", "success");
      setEditingReview(null);
    } catch (error) {
      console.error("Error updating review:", error);
      showToast("Failed to update review. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Condition uses teamProp (initial trigger) but rendering uses team (current data) */}
      {teamProp && (
        <motion.div
          key="score-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="score-detail-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Render using the dynamically found 'team' */}
            <Card className="max-h-[80vh] overflow-y-auto border-2 border-orange-500/80">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="flex flex-wrap items-center text-2xl font-bold text-white">
                    {team.name}
                    <span className="mt-1 ml-2 inline-block rounded-full bg-zinc-800 px-2 py-1 text-base font-normal text-orange-400 md:mt-0">
                      #{team.number}
                    </span>
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Avg Score: {(team.averageScore ?? 0).toFixed(2)} | Total
                    Score: {team.totalScore ?? 0}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-2xl text-zinc-400 hover:text-white"
                  aria-label="Close modal"
                >
                  <X />
                </button>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-zinc-200">
                  Score Breakdown ({team.reviewedBy.length} Reviews)
                </h3>
                <div className="space-y-2">
                  {team.reviewedBy.length > 0 ? (
                    team.reviewedBy.map((review) => {
                      // Map over current team data
                      const judge = judges.find((j) => j.id === review.judgeId);
                      const isEditingThis =
                        editingReview?.judgeId === review.judgeId;
                      return (
                        <div
                          key={review.judgeId}
                          className={`rounded-md p-3 transition-colors duration-200 ${isEditingThis ? "bg-zinc-700 ring-2 ring-orange-500" : "bg-zinc-800/80"}`}
                        >
                          {isEditingThis ? (
                            /* --- Editing UI --- */
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                {/* Judge Info */}
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                                  ></div>
                                  <span className="font-semibold">
                                    {judge?.name ?? "Unknown Judge"}
                                  </span>
                                </div>
                                {/* Rank Buttons */}
                                <div className="flex flex-wrap gap-1">
                                  {[1, 2, 3, 0].map((r) => (
                                    <Button
                                      key={r}
                                      onClick={() =>
                                        setNewRank(r as Review["rank"])
                                      }
                                      size="sm"
                                      className={`min-w-[50px] ${newRank === r ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-zinc-600 hover:bg-zinc-500"}`}
                                    >
                                      {" "}
                                      {r > 0
                                        ? `${r}${["st", "nd", "rd"][r - 1]}`
                                        : "N/A"}{" "}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              {/* Save/Cancel Buttons */}
                              <div className="flex justify-end gap-2 border-t border-zinc-600 pt-3">
                                <Button
                                  onClick={() => setEditingReview(null)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  {" "}
                                  <XCircle className="mr-1 h-4 w-4" />{" "}
                                  Cancel{" "}
                                </Button>
                                <Button
                                  onClick={() => void handleSaveClick()}
                                  disabled={isSaving}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  size="sm"
                                >
                                  {isSaving ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="mr-1 h-4 w-4" />
                                  )}
                                  {isSaving ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* --- Display UI --- */
                            <div className="flex items-center justify-between">
                              {/* Judge Info */}
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                                ></div>
                                <span>{judge?.name ?? "Unknown Judge"}</span>
                              </div>
                              {/* Rank/Score and Edit Button */}
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-zinc-100">
                                  {review.rank > 0
                                    ? `${review.rank}${["st", "nd", "rd"][review.rank - 1]}`
                                    : "Unranked"}
                                  <span className="ml-1 font-normal text-zinc-400">
                                    ({review.score} pts)
                                  </span>
                                </span>
                                <Button
                                  onClick={() => {
                                    setEditingReview(review);
                                    setNewRank(review.rank);
                                  }}
                                  title="Edit Score"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-zinc-400 transition-colors hover:text-orange-500"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-4 text-center text-sm text-zinc-500 italic">
                      No reviews submitted for this team yet.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default ScoreDetailModal;
