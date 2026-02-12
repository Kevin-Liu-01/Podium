"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import {
  Pencil,
  Save,
  XCircle,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Team, Review } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import ConfirmationDialog from "../ui/ConfirmationDialog";
import Tooltip from "../ui/Tooltip";

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
  const [isPausing, setIsPausing] = useState(false);
  // -------------------------------

  const [editingComment, setEditingComment] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  // -------------------------------------------------

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
        ? { ...r, rank: newRank, score: newScore, comments: editingComment }
        : r,
    );
    const currentTotalScore =
      typeof team.totalScore === "number" ? team.totalScore : 0;
    const newTotalScore = currentTotalScore - oldScore + newScore;
    const newAverageScore =
      newReviewedBy.length > 0 ? newTotalScore / newReviewedBy.length : 0;

    const updatedTeamDataForState = {
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
      setEditingComment("");
    } catch (error) {
      console.error("Error updating review:", error);
      showToast("Failed to update review. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (review: Review) => {
    setReviewToDelete(review);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete || !currentEvent || !user || !team) {
      showToast("Cannot delete: Missing required data.", "error");
      return;
    }
    setIsDeleting(true);

    const oldScore = reviewToDelete.score;

    const newReviewedBy = team.reviewedBy.filter(
      (r) => r.judgeId !== reviewToDelete.judgeId,
    );
    const currentTotalScore =
      typeof team.totalScore === "number" ? team.totalScore : 0;
    const newTotalScore = currentTotalScore - oldScore;
    const newAverageScore =
      newReviewedBy.length > 0 ? newTotalScore / newReviewedBy.length : 0;

    const updatedTeamDataForState = {
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
      // Update Firestore
      await updateDoc(teamDocRef, {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
      });

      // Update Local Context State
      setTeams((currentTeams) => {
        const teamIndex = currentTeams.findIndex((t) => t.id === team.id);
        if (teamIndex === -1) return currentTeams;
        const updatedTeams = [...currentTeams];
        updatedTeams[teamIndex] = updatedTeamDataForState;
        return updatedTeams;
      });

      showToast("Review deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting review:", error);
      showToast("Failed to delete review. Please try again.", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setReviewToDelete(null);
    }
  };

  const handleTogglePause = async () => {
    if (!currentEvent || !user || !team) {
      showToast("Cannot update team: missing data.", "error");
      return;
    }
    setIsPausing(true);
    const newPausedState = !team.isPaused;
    const updatedTeamDataForState = {
      ...team,
      isPaused: newPausedState,
    };
    const teamDocRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/teams`,
      team.id,
    );

    try {
      // Update Firestore
      await updateDoc(teamDocRef, { isPaused: newPausedState });

      // Update Local Context State
      setTeams((currentTeams) => {
        const teamIndex = currentTeams.findIndex((t) => t.id === team.id);
        if (teamIndex === -1) return currentTeams;
        const updatedTeams = [...currentTeams];
        updatedTeams[teamIndex] = updatedTeamDataForState;
        return updatedTeams;
      });

      showToast(
        `${team.name} ${newPausedState ? "paused" : "resumed"}.`,
        "success",
      );
    } catch (error) {
      console.error("Error updating team pause state:", error);
      showToast("Failed to update team status.", "error");
    } finally {
      setIsPausing(false);
    }
  };

  return (
    <>
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
              <Card className="custom-scrollbar relative max-h-[80vh] overflow-y-auto border-2 border-orange-500/80">
                {/* [MOD] Close button is now absolute */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 text-2xl text-zinc-400 transition-colors hover:text-white"
                  aria-label="Close modal"
                >
                  <X />
                </button>

                <div className="mb-4 pr-10">
                  {" "}
                  {/* [MOD] Added pr-10 */}
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
                </div>

                <div className="mb-4 border-t border-b border-zinc-700 py-4">
                  <Button
                    onClick={handleTogglePause}
                    disabled={isPausing}
                    size="sm"
                    className={`w-full sm:w-auto ${
                      team.isPaused
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {isPausing ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : team.isPaused ? (
                      <Play className="mr-2 size-4" />
                    ) : (
                      <Pause className="mr-2 size-4" />
                    )}
                    {isPausing
                      ? "Updating..."
                      : team.isPaused
                        ? "Resume Team (Active)"
                        : "Pause Team (Inactive)"}
                  </Button>
                  <p className="mt-2 text-xs text-zinc-400">
                    {team.isPaused
                      ? "This team is paused. It cannot be assigned to judges."
                      : "This team is active and can be assigned to judges."}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-zinc-200">
                    Score Breakdown ({team.reviewedBy.length} Reviews)
                  </h3>
                  <div className="space-y-2">
                    {team.reviewedBy.length > 0 ? (
                      team.reviewedBy.map((review) => {
                        // Map over current team data
                        const judge = judges.find(
                          (j) => j.id === review.judgeId,
                        );
                        const isEditingThis =
                          editingReview?.judgeId === review.judgeId;
                        return (
                          <div
                            key={review.judgeId}
                            className={`rounded-md p-3 transition-colors duration-200 ${isEditingThis ? "bg-zinc-700 ring-2 ring-orange-500" : "bg-zinc-800/80"}`}
                          >
                            {isEditingThis ? (
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
                                <textarea
                                  value={editingComment}
                                  onChange={(e) =>
                                    setEditingComment(e.target.value)
                                  }
                                  placeholder="Add comments (optional)..."
                                  rows={3}
                                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50"
                                />
                                {/* Save/Cancel Buttons */}
                                <div className="flex justify-end gap-2 border-t border-zinc-600 pt-3">
                                  <Button
                                    onClick={() => setEditingReview(null)}
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
                              <div>
                                <div className="flex items-center justify-between">
                                  {/* Judge Info */}
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                                    ></div>
                                    <span>
                                      {judge?.name ?? "Unknown Judge"}
                                    </span>
                                  </div>
                                  {/* Rank/Score and Edit Button */}
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-100">
                                      {review.rank > 0
                                        ? `${review.rank}${["st", "nd", "rd"][review.rank - 1]}`
                                        : "Unranked"}
                                      <span className="ml-1 font-normal text-zinc-400">
                                        ({review.score} pts)
                                      </span>
                                    </span>
                                    <Tooltip content="Edit Score/Comment">
                                      <Button
                                        onClick={() => {
                                          setEditingReview(review);
                                          setNewRank(review.rank);
                                          setEditingComment(
                                            review.comments || "",
                                          );
                                        }}
                                        size="sm"
                                        className="text-zinc-400 transition-colors hover:text-orange-500"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </Tooltip>
                                    <Tooltip content="Delete Review">
                                      <Button
                                        onClick={() =>
                                          handleDeleteClick(review)
                                        }
                                        size="sm"
                                        className="text-zinc-400 transition-colors hover:text-rose-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </Tooltip>
                                  </div>
                                </div>
                                {review.comments && (
                                  <blockquote className="mt-3 border-l-2 border-zinc-600 pl-3 text-sm text-zinc-300 italic">
                                    {review.comments}
                                  </blockquote>
                                )}
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

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Review?"
        icon={<AlertTriangle className="size-6 text-rose-500" />}
      >
        <p>
          Are you sure you want to delete the review from{" "}
          <strong>
            {judges.find((j) => j.id === reviewToDelete?.judgeId)?.name ??
              "Unknown Judge"}
          </strong>
          ?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          This will permanently remove their score and comment. This action
          cannot be undone.
        </p>
      </ConfirmationDialog>
    </>
  );
};
export default ScoreDetailModal;
