import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import type { Floor, Judge, Team, Assignment } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import TeamCard from "../shared/TeamCard";
import ScoreDetailModal from "../shared/ScoreDetailModal";
import ScoreEntryForm from "../shared/ScoreEntryForm";
import { Button } from "../ui/Button";

const FloorDashboard = ({ floor }: { floor: Floor }) => {
  const { teams, judges, assignments } = useAppContext();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );

  const floorTeams = useMemo(
    () =>
      teams
        .filter((t) => t.floorId === floor.id)
        .sort((a, b) => a.number - b.number),
    [teams, floor.id],
  );

  const { judgesOut, judgesAvailable, judgesFinished } = useMemo(() => {
    const floorJudges = judges.filter((j) => j.floorId === floor.id);
    const teamsOnFloor = teams.filter((t) => t.floorId === floor.id);
    const allSubmittedAssignments = assignments.filter((a) => a.submitted);

    const out = floorJudges.filter((j) => j.currentAssignmentId);
    const available = floorJudges.filter((j) => !j.currentAssignmentId);

    const finished: Judge[] = [];
    const stillAssignable: Judge[] = [];

    for (const judge of available) {
      const judgedTeamIds = new Set(
        allSubmittedAssignments
          .filter((a) => a.judgeId === judge.id)
          .flatMap((a) => a.teamIds),
      );
      const candidateTeams = teamsOnFloor.filter(
        (t) => !judgedTeamIds.has(t.id),
      );

      let isPossible = false;
      if (candidateTeams.length >= 5) {
        for (let i = 0; i <= candidateTeams.length - 5; i++) {
          const window = candidateTeams.slice(i, i + 5);
          if (window[4].number - window[0].number <= 15) {
            isPossible = true;
            break;
          }
        }
      }
      if (isPossible) {
        stillAssignable.push(judge);
      } else {
        finished.push(judge);
      }
    }

    return {
      judgesOut: out,
      judgesAvailable: stillAssignable,
      judgesFinished: finished,
    };
  }, [judges, teams, assignments, floor.id]);

  const JudgeList = ({
    title,
    judges: judgeList,
    color,
  }: {
    title: string;
    judges: Judge[];
    color: string;
  }) => (
    <MotionCard>
      <h2 className={`mb-3 text-lg font-semibold ${color}`}>
        {title} ({judgeList.length})
      </h2>
      <div className="max-h-40 space-y-2 overflow-y-auto pr-2">
        {judgeList.length > 0 ? (
          judgeList.map((judge) => (
            <div
              key={judge.id}
              className="flex items-center gap-3 rounded-md bg-zinc-800 p-2 text-sm"
            >
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${getColorForJudge(judge.id)}`}
              ></span>
              <span className="font-medium">{judge.name}</span>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500 italic">
            No judges in this category.
          </p>
        )}
      </div>
    </MotionCard>
  );

  if (assignmentToScore) {
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{floor.name} Dashboard</h1>
        <p className="text-lg text-zinc-400">{floorTeams.length} Teams</p>
      </div>

      <motion.div
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Judges Out Card with "Enter Scores" Button */}
        <MotionCard>
          <h2 className="mb-3 text-lg font-semibold text-amber-400">
            Judges Out ({judgesOut.length})
          </h2>
          <div className="max-h-40 space-y-2 overflow-y-auto pr-2">
            {judgesOut.length > 0 ? (
              judgesOut.map((judge) => {
                const assignment = assignments.find(
                  (a) => a.id === judge.currentAssignmentId,
                );
                return (
                  <div
                    key={judge.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800 p-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${getColorForJudge(judge.id)}`}
                      ></span>
                      <span className="font-medium">{judge.name}</span>
                    </div>
                    {assignment && (
                      <Button
                        onClick={() => setAssignmentToScore(assignment)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        Scores
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-zinc-500 italic">
                No judges are currently out.
              </p>
            )}
          </div>
        </MotionCard>

        <JudgeList
          title="Available Judges"
          judges={judgesAvailable}
          color="text-emerald-400"
        />
        <JudgeList
          title="Finished on Floor"
          judges={judgesFinished}
          color="text-sky-400"
        />
      </motion.div>

      <p className="mb-4 text-zinc-400">
        Click on a team to see detailed scores.
      </p>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {floorTeams.map((team) => (
          <motion.div variants={fadeInUp} key={team.id}>
            <TeamCard team={team} onClick={() => setSelectedTeam(team)} />
          </motion.div>
        ))}
      </motion.div>

      {selectedTeam && (
        <ScoreDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
};

export default FloorDashboard;
