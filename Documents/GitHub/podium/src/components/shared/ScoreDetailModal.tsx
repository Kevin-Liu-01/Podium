import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { Pencil, Save, XCircle, X } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Project, Review } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface ScoreDetailModalProps {
  project: Project;
  onClose: () => void;
}

const ScoreDetailModal = ({ project, onClose }: ScoreDetailModalProps) => {
  const { judges, currentEvent, showToast } = useAppContext();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [newRank, setNewRank] = useState<Review["rank"]>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setNewRank(review.rank);
  };

  const handleCancelClick = () => {
    setEditingReview(null);
    setIsSaving(false);
  };

  const handleSaveClick = async () => {
    if (!editingReview || !currentEvent) return;
    setIsSaving(true);

    const scores: { [key in Review["rank"]]: number } = {
      0: 0,
      1: 3,
      2: 2,
      3: 1,
    };
    const oldScore = editingReview.score;
    const newScore = scores[newRank];

    const newReviewedBy = project.reviewedBy.map((review) => {
      if (review.judgeId === editingReview.judgeId) {
        return { ...review, rank: newRank, score: newScore };
      }
      return review;
    });

    const newTotalScore = project.totalScore - oldScore + newScore;
    const newAverageScore =
      newReviewedBy.length > 0 ? newTotalScore / newReviewedBy.length : 0;

    const projectRef = doc(
      db,
      `events/${currentEvent.id}/projects`,
      project.id,
    );

    try {
      await updateDoc(projectRef, {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
      });
      showToast("Review updated successfully!", "success");
      handleCancelClick();
    } catch (error) {
      console.error("Failed to update review:", error);
      showToast("Error updating review.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-2 border-orange-500">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{project.name}</h2>
                  <p className="text-sm text-zinc-400">
                    Avg Score: {project.averageScore.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-2xl text-zinc-400 hover:text-white"
                >
                  <X />
                </button>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Score Breakdown</h3>
                <div className="space-y-2">
                  {project.reviewedBy.length > 0 ? (
                    project.reviewedBy.map((review) => {
                      const judge = judges.find((j) => j.id === review.judgeId);
                      const isEditing =
                        editingReview?.judgeId === review.judgeId;
                      if (isEditing) {
                        return (
                          <div
                            key={review.judgeId}
                            className="flex flex-col gap-3 rounded-md bg-zinc-700 p-3 ring-2 ring-orange-500"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                                ></div>
                                <span>{judge?.name || "Unknown"}</span>
                              </div>
                              <div className="flex space-x-2">
                                {[1, 2, 3, 0].map((r) => {
                                  const rank = r as Review["rank"];
                                  const labels: {
                                    [key in Review["rank"]]: string;
                                  } = {
                                    1: "1st",
                                    2: "2nd",
                                    3: "3rd",
                                    0: "N/A",
                                  };
                                  return (
                                    <Button
                                      key={r}
                                      onClick={() => setNewRank(rank)}
                                      className={`px-2 py-1 text-xs ${newRank === rank ? "bg-emerald-600" : "bg-zinc-600"}`}
                                    >
                                      {labels[rank]}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={handleCancelClick}
                                className="bg-zinc-600 hover:bg-zinc-500"
                              >
                                <XCircle className="h-4 w-4" /> Cancel
                              </Button>
                              <Button
                                onClick={handleSaveClick}
                                disabled={isSaving}
                                className="bg-emerald-600 hover:bg-emerald-500"
                              >
                                <Save className="h-4 w-4" />
                                {isSaving ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={review.judgeId}
                          className="flex items-center justify-between rounded-md bg-zinc-800 p-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                            ></div>
                            <span>{judge?.name || "Unknown Judge"}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold">
                              {review.rank > 0
                                ? `Rank #${review.rank}`
                                : "Unranked"}{" "}
                              ({review.score} pts)
                            </span>
                            <button
                              onClick={() => handleEditClick(review)}
                              title="Edit Score"
                              className="text-zinc-400 transition-colors hover:text-orange-500"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-zinc-400">
                      This project has not been reviewed yet.
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
