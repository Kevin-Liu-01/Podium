"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  writeBatch,
  collection,
  getDocs,
  query,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Server,
  AlertTriangle,
  PlusCircle,
  Star,
  MessageSquare,
  Plus,
  Users2,
  Loader,
  ChevronsRight,
} from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Team } from "../../lib/types";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import ScoreDetailModal from "../shared/ScoreDetailModal";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import ConfirmationDialog from "../ui/ConfirmationDialog";

const TeamSetup = () => {
  const { teams, floors, currentEvent, showToast } = useAppContext();
  const [mode, setMode] = useState<"bulk" | "manual">("bulk");

  // State for Bulk Generation
  const [totalTeams, setTotalTeams] = useState(""); // Default is now empty
  const [teamPrefix, setTeamPrefix] = useState("Team");
  const [startNumber, setStartNumber] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);

  // State for Manual Add
  const [newTeamNumber, setNewTeamNumber] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // State for UI
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- NEW: Effect to set default total teams based on floor ranges ---
  useEffect(() => {
    if (floors && floors.length > 0) {
      const maxTeamNumber = floors.reduce(
        (max, floor) => (floor.teamNumberEnd > max ? floor.teamNumberEnd : max),
        0,
      );
      setTotalTeams(String(maxTeamNumber));
    }
  }, [floors]); // This effect runs whenever the floors data changes

  // Memoized value for the bulk generator summary
  const generationSummary = useMemo(() => {
    const start = parseInt(startNumber) || 0;
    const total = parseInt(totalTeams) || 0;
    if (start <= 0 || total <= 0) return null;
    const end = start + total - 1;
    const prefix = teamPrefix.trim() || "Team";
    return {
      startText: `${prefix} ${start}`,
      endText: `${prefix} ${end}`,
    };
  }, [totalTeams, teamPrefix, startNumber]);

  // This function now only does validation and opens the dialog
  const handleGenerateTeamsClick = () => {
    const total = parseInt(totalTeams);
    const startNum = parseInt(startNumber);

    if (isNaN(total) || total <= 0)
      return showToast("Please enter a valid total number of teams.", "error");
    if (isNaN(startNum) || startNum <= 0)
      return showToast("Please enter a valid starting number.", "error");
    if (floors.length === 0)
      return showToast("Please create floors with team ranges first.", "error");

    const endNum = startNum + total - 1;
    for (let i = startNum; i <= endNum; i++) {
      const hasFloor = floors.some(
        (f) => i >= f.teamNumberStart && i <= f.teamNumberEnd,
      );
      if (!hasFloor) {
        showToast(
          `Error: No floor assignment found for Team #${i}. Please check floor setup.`,
          "error",
        );
        return;
      }
    }
    // If all checks pass, open the confirmation dialog
    setIsConfirmOpen(true);
  };

  // This function contains the actual database operations
  const executeTeamGeneration = async () => {
    setIsGenerating(true);
    try {
      const total = parseInt(totalTeams);
      const startNum = parseInt(startNumber);
      const endNum = startNum + total - 1;
      const prefix = teamPrefix.trim() || "Team";

      const teamsCollectionRef = collection(
        db,
        `events/${currentEvent!.id}/teams`,
      );

      if (teams.length > 0) {
        const deleteBatch = writeBatch(db);
        const existingTeamsSnapshot = await getDocs(query(teamsCollectionRef));
        existingTeamsSnapshot.forEach((doc) => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
      }

      const addBatch = writeBatch(db);
      for (let i = startNum; i <= endNum; i++) {
        const floor = floors.find(
          (f) => i >= f.teamNumberStart && i <= f.teamNumberEnd,
        );
        if (floor) {
          const newTeamRef = doc(teamsCollectionRef);
          addBatch.set(newTeamRef, {
            name: `${prefix} ${i}`,
            number: i,
            floorId: floor.id,
            reviewedBy: [],
            totalScore: 0,
            averageScore: 0,
          });
        }
      }
      await addBatch.commit();
      showToast(`${total} teams generated successfully!`, "success");
    } catch (error) {
      console.error("Error generating teams:", error);
      showToast("An error occurred while generating teams.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddTeam = async () => {
    const number = parseInt(newTeamNumber);
    if (isNaN(number) || number <= 0)
      return showToast("Invalid team number.", "error");
    if (teams.some((t) => t.number === number))
      return showToast(`Team ${number} already exists.`, "error");

    setIsAdding(true);
    try {
      let targetFloor = floors.find(
        (f) => number >= f.teamNumberStart && number <= f.teamNumberEnd,
      );

      // Auto-extend logic
      if (!targetFloor && floors.length > 0) {
        const lastFloor = [...floors].sort(
          (a, b) => b.teamNumberEnd - a.teamNumberEnd,
        )[0];
        if (number > lastFloor.teamNumberEnd) {
          targetFloor = lastFloor;
          const floorRef = doc(
            db,
            `events/${currentEvent!.id}/floors`,
            lastFloor.id,
          );
          await updateDoc(floorRef, { teamNumberEnd: number });
          showToast(
            `Extended ${lastFloor.name} range to include Team ${number}.`,
            "info",
          );
        }
      }

      if (!targetFloor)
        return showToast(
          `No floor range found for Team ${number}. Please check Setup.`,
          "error",
        );

      await addDoc(collection(db, `events/${currentEvent!.id}/teams`), {
        name: `Team ${number}`,
        number,
        floorId: targetFloor.id,
        reviewedBy: [],
        totalScore: 0,
        averageScore: 0,
      });
      showToast(`Team ${number} added successfully!`, "success");
      setNewTeamNumber("");
    } catch (error) {
      console.error("Error adding team:", error);
      showToast("An error occurred while adding the team.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* --- LEFT COLUMN: CONTROLS --- */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <MotionCard>
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-zinc-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                3
              </span>
              <Users2 className="size-5" /> Create Teams
            </h2>
            <div className="mb-4 flex rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
              <Button
                onClick={() => setMode("bulk")}
                className={`w-1/2 ${mode === "bulk" ? "bg-orange-600" : "bg-transparent"}`}
                size="sm"
              >
                <Server className="size-4" /> Bulk Generate
              </Button>
              <Button
                onClick={() => setMode("manual")}
                className={`w-1/2 ${mode === "manual" ? "bg-orange-600" : "bg-transparent"}`}
                size="sm"
              >
                <PlusCircle className="size-4" /> Manual Add
              </Button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "bulk" ? (
                  <div className="space-y-4">
                    <Card className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="prefix">Team Prefix</Label>
                        <Input
                          id="prefix"
                          placeholder="e.g., Team"
                          value={teamPrefix}
                          onChange={(e) => setTeamPrefix(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="startNum">Start Number</Label>
                        <Input
                          id="startNum"
                          type="number"
                          placeholder="e.g., 1"
                          value={startNumber}
                          onChange={(e) => setStartNumber(e.target.value)}
                          min="1"
                        />
                      </div>
                    </Card>
                    <Card>
                      <Label htmlFor="totalTeams">
                        Total Number of Teams to Create
                      </Label>
                      <Input
                        id="totalTeams"
                        type="number"
                        placeholder="e.g., 100"
                        value={totalTeams}
                        onChange={(e) => setTotalTeams(e.target.value)}
                        min="1"
                      />
                      {generationSummary && (
                        <div className="mt-3 text-center text-sm text-zinc-400">
                          Will create{" "}
                          <code className="rounded bg-zinc-800 px-1.5 py-1 text-orange-400">
                            {generationSummary.startText}
                          </code>{" "}
                          <ChevronsRight className="inline-block size-4" />{" "}
                          <code className="rounded bg-zinc-800 px-1.5 py-1 text-orange-400">
                            {generationSummary.endText}
                          </code>
                        </div>
                      )}
                    </Card>

                    <Button
                      onClick={handleGenerateTeamsClick}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-br from-orange-700 to-orange-600 hover:from-orange-600 hover:to-orange-500"
                    >
                      {isGenerating ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <PlusCircle className="size-4" />
                      )}
                      {isGenerating
                        ? "Generating..."
                        : `Generate & ${teams.length > 0 ? "Replace All" : "Create Teams"}`}
                    </Button>
                    {teams.length > 0 && (
                      <div className="!mt-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-amber-300">
                        <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
                        <p className="text-xs">
                          This will replace the{" "}
                          <strong>{teams.length} teams</strong> currently in the
                          system.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTeam();
                    }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-zinc-400">
                      Add a single team. If the number is outside existing floor
                      ranges, the last floor's range will be auto-extended.
                    </p>
                    <Input
                      type="number"
                      placeholder="Enter Team Number"
                      value={newTeamNumber}
                      onChange={(e) => setNewTeamNumber(e.target.value)}
                    />
                    <Button
                      type="submit"
                      disabled={isAdding}
                      className="w-full bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                    >
                      {isAdding ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      {isAdding ? "Adding..." : "Add Team"}
                    </Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </MotionCard>
        </div>

        {/* --- RIGHT COLUMN: TEAMS DISPLAY --- */}
        <div className="h-full lg:col-span-2">
          <Card className="h-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-[-1rem] z-10 mt-[-1rem] mb-2 flex items-center justify-between bg-zinc-900/50 py-2 backdrop-blur-lg">
              <h2 className="text-xl font-bold text-zinc-100">
                Current Teams ({teams.length})
              </h2>
            </div>
            {floors.length > 0 && teams.length > 0 ? (
              [...floors]
                .sort((a, b) => a.teamNumberStart - b.teamNumberEnd)
                .map((floor) => {
                  const teamsOnFloor = teams
                    .filter((t) => t.floorId === floor.id)
                    .sort((a, b) => a.number - b.number);

                  if (teamsOnFloor.length === 0) return null;

                  return (
                    <div key={floor.id} className="mb-6">
                      <h3 className="mb-3 border-b border-zinc-700 pb-2 font-bold text-orange-400">
                        {floor.name} (Range: {floor.teamNumberStart}-
                        {floor.teamNumberEnd})
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
                        {teamsOnFloor.map((team) => (
                          <MotionCard
                            key={team.id}
                            onClick={() => setSelectedTeam(team)}
                            className="transform-gpu cursor-pointer rounded-lg bg-zinc-800/70 p-3 text-left shadow-md transition-all hover:-translate-y-1 hover:bg-zinc-700/90 hover:shadow-xl hover:shadow-orange-500/10"
                          >
                            <p className="font-bold text-white">{team.name}</p>
                            <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                              <span
                                className="flex items-center gap-1.5"
                                title="Average Score"
                              >
                                <Star className="size-3 text-amber-500" />
                                {team.averageScore.toFixed(2)}
                              </span>
                              <span
                                className="flex items-center gap-1.5"
                                title="Number of Reviews"
                              >
                                <MessageSquare className="size-3 text-sky-500" />
                                {team.reviewedBy.length}
                              </span>
                            </div>
                          </MotionCard>
                        ))}
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-4">
                <Users2 className="size-16 text-zinc-700" />
                <p className="text-center text-zinc-500 italic">
                  No teams have been generated yet.
                  <br />
                  Use the controls on the left to get started.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
      {selectedTeam && (
        <ScoreDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          executeTeamGeneration();
        }}
        title="Confirm Team Generation"
        icon={<AlertTriangle className="size-8 text-rose-500" />}
      >
        <p>
          You are about to generate{" "}
          <strong className="text-white">{totalTeams}</strong> teams, from{" "}
          <strong className="text-white">{generationSummary?.startText}</strong>{" "}
          to{" "}
          <strong className="text-white">{generationSummary?.endText}</strong>.
        </p>
        {teams.length > 0 && (
          <p className="mt-3 font-semibold text-rose-400">
            This will DELETE all {teams.length} existing teams first. This
            action cannot be undone.
          </p>
        )}
      </ConfirmationDialog>
    </>
  );
};

export default TeamSetup;
