import React, { useState, useMemo } from "react";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Project, Review } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface ScoreEntryFormProps {
  assignment: Assignment;
  onBack: () => void;
}

const ScoreEntryForm = ({ assignment, onBack }: ScoreEntryFormProps) => {
  const { projects, judges, currentEvent, showToast } = useAppContext();
  const [rankings, setRankings] = useState<{
    [projectId: string]: Review["rank"];
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const judge = useMemo(
    () => judges.find((j) => j.id === assignment.judgeId),
    [judges, assignment],
  );

  const assignedProjects = useMemo(
    () =>
      assignment.projectIds
        .map((id) => projects.find((p) => p.id === id))
        .filter((p): p is Project => !!p),
    [assignment, projects],
  );

  const handleRankChange = (projectId: string, rank: Review["rank"]) => {
    setRankings((prev) => ({ ...prev, [projectId]: rank }));
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

    assignedProjects.forEach((project) => {
      const rank = rankings[project.id] ?? 0;
      const score = scores[rank];
      const newReview: Review = { judgeId: assignment.judgeId, score, rank };
      const newReviewedBy = [...project.reviewedBy, newReview];
      const newTotalScore = project.totalScore + score;
      const newAverageScore = newTotalScore / newReviewedBy.length;

      batch.update(doc(db, `events/${currentEvent!.id}/projects`, project.id), {
        reviewedBy: newReviewedBy,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
      });
    });

    batch.update(
      doc(db, `events/${currentEvent!.id}/assignments`, assignment.id),
      {
        submitted: true,
      },
    );

    if (judge) {
      batch.update(doc(db, `events/${currentEvent!.id}/judges`, judge.id), {
        currentAssignmentId: "",
        completedAssignments: judge.completedAssignments + 1,
      });
    }

    try {
      await batch.commit();
      showToast(`Scores for ${judge?.name}'s assignment submitted!`, "success");
      onBack();
    } catch (e) {
      console.error(e);
      showToast("Failed to submit scores.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enter Scores for {judge?.name}</h2>
        <Button
          onClick={onBack}
          className="bg-gradient-to-br from-zinc-500 to-zinc-600 transition-all duration-150 hover:from-zinc-600 hover:to-zinc-700"
        >
          &larr; Back to Assignments
        </Button>
      </div>
      <p className="mb-6 text-zinc-400">
        Enter the reported rankings for each project in this assignment.
      </p>
      <div className="space-y-4">
        {assignedProjects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between rounded-lg bg-zinc-800 p-4"
          >
            <p className="font-bold">{project.name}</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 0].map((r) => {
                const rank = r as Review["rank"];
                const labels: { [key in Review["rank"]]: string } = {
                  1: "1st",
                  2: "2nd",
                  3: "3rd",
                  0: "Unranked",
                };
                return (
                  <Button
                    key={r}
                    onClick={() => handleRankChange(project.id, rank)}
                    className={
                      rankings[project.id] === rank
                        ? "bg-emerald-600"
                        : "bg-zinc-600"
                    }
                  >
                    {labels[rank]}
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
          className="w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700 md:w-auto"
        >
          {isLoading ? "Submitting..." : "Submit All Scores for Assignment"}
        </Button>
      </div>
    </Card>
  );
};

export default ScoreEntryForm;
