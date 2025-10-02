import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { Pencil, Save, XCircle, X } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Team, Review } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const ScoreDetailModal = ({
  team,
  onClose,
}: {
  team: Team;
  onClose: () => void;
}) => {
  const { judges, currentEvent, showToast } = useAppContext();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [newRank, setNewRank] = useState<Review["rank"]>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!editingReview || !currentEvent) return;
    setIsSaving(true);

    const scores: { [key in Review["rank"]]: number } = {
      0: 0,
      1: 3,
      2: 2,
      3: 1,
    };
    const newScore = scores[newRank];
    const oldScore = editingReview.score;

    const newReviewedBy = team.reviewedBy.map((r) =>
      r.judgeId === editingReview.judgeId
        ? { ...r, rank: newRank, score: newScore }
        : r,
    );
    const newTotalScore = team.totalScore - oldScore + newScore;
    const newAverageScore =
      newReviewedBy.length > 0 ? newTotalScore / newReviewedBy.length : 0;

    try {
      await updateDoc(doc(db, `events/${currentEvent.id}/teams`, team.id), {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
      });
      showToast("Review updated!", "success");
      setEditingReview(null);
    } catch (error) {
      showToast("Error updating review.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {team && (
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
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-2 border-orange-500/80">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Team #{team.number}</h2>
                  <p className="text-sm text-zinc-400">
                    Avg Score: {team.averageScore.toFixed(2)}
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
                  {team.reviewedBy.map((review) => {
                    const judge = judges.find((j) => j.id === review.judgeId);
                    if (editingReview?.judgeId === review.judgeId) {
                      return (
                        /* Editing UI */ <div
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
                              {[1, 2, 3, 0].map((r) => (
                                <Button
                                  key={r}
                                  onClick={() =>
                                    setNewRank(r as Review["rank"])
                                  }
                                  className={`px-2 py-1 text-xs ${newRank === r ? "bg-emerald-600" : "bg-zinc-600"}`}
                                >
                                  {r > 0
                                    ? `${r}${["st", "nd", "rd"][r - 1]}`
                                    : "N/A"}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => setEditingReview(null)}
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
                      /* Display UI */ <div
                        key={review.judgeId}
                        className="flex items-center justify-between rounded-md bg-zinc-800/80 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getColorForJudge(review.judgeId)}`}
                          ></div>
                          <span>{judge?.name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">
                            {review.rank > 0
                              ? `Rank #${review.rank}`
                              : "Unranked"}{" "}
                            ({review.score} pts)
                          </span>
                          <button
                            onClick={() => {
                              setEditingReview(review);
                              setNewRank(review.rank);
                            }}
                            title="Edit Score"
                            className="text-zinc-400 transition-colors hover:text-orange-500"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
