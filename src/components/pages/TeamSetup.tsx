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
  Upload,
  List,
  Hash,
  Pause,
  Play,
  CheckSquare,
  Square,
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
import Tooltip from "../ui/Tooltip";
import { Checkbox } from "../ui/Checkbox";

// Type for the team to be imported
type ParsedTeam = {
  number: number;
  name: string;
  floorId: string;
};

const TeamSetup = () => {
  // Get 'user' from context
  const { teams, floors, currentEvent, showToast, user } = useAppContext();

  const [mode, setMode] = useState<"bulkImport" | "manual" | "bulkGenerate">(
    "bulkImport",
  );
  // State for Bulk Generation
  const [totalTeams, setTotalTeams] = useState("");
  const [teamPrefix, setTeamPrefix] = useState("Team");
  const [startNumber, setStartNumber] = useState("1"); // Now also used for Auto-Import
  const [isGenerating, setIsGenerating] = useState(false);

  // State for Bulk Import
  const [bulkImportData, setBulkImportData] = useState("");
  const [importMode, setImportMode] = useState<"auto" | "manual">("manual");
  const [isImporting, setIsImporting] = useState(false);
  const [teamsToImport, setTeamsToImport] = useState<ParsedTeam[]>([]);
  const [isOverwrite, setIsOverwrite] = useState(false); // <-- [NEW] State for overwrite mode

  // State for Manual Add
  const [newTeamNumber, setNewTeamNumber] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // State for UI
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "generate" | "import" | null
  >(null);
  const [confirmContent, setConfirmContent] = useState<React.ReactNode>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [isPausing, setIsPausing] = useState<string | null>(null);

  // Effect to set default total teams based on floor ranges
  useEffect(() => {
    if (mode === "bulkGenerate" && floors && floors.length > 0) {
      const maxTeamNumber = floors.reduce(
        (max, floor) => (floor.teamNumberEnd > max ? floor.teamNumberEnd : max),
        0,
      );
      setTotalTeams(String(maxTeamNumber > 0 ? maxTeamNumber : ""));
    }
  }, [floors, mode]);

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

  const handleTogglePause = async (teamId: string) => {
    if (!currentEvent || !user) {
      showToast("Cannot update team: missing data.", "error");
      return;
    }
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      showToast("Team not found.", "error");
      return;
    }

    setIsPausing(teamId); // Start loading
    const teamRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/teams`,
      teamId,
    );
    try {
      await updateDoc(teamRef, { isPaused: !team.isPaused });
      showToast(
        `${team.name} ${!team.isPaused ? "paused" : "resumed"}.`,
        "success",
      );
    } catch (error) {
      showToast("Failed to update team status.", "error");
    } finally {
      setIsPausing(null); // Stop loading
    }
  };

  // --- Bulk Generation ---
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

    // Set confirmation details
    setConfirmTitle("Confirm Team Generation");
    setConfirmContent(
      <>
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
      </>,
    );
    setConfirmAction("generate");
    setIsConfirmOpen(true);
  };

  const executeTeamGeneration = async () => {
    if (!user || !currentEvent) return;
    setIsGenerating(true);
    try {
      const total = parseInt(totalTeams);
      const startNum = parseInt(startNumber);
      const endNum = startNum + total - 1;
      const prefix = teamPrefix.trim() || "Team";

      const teamsCollectionRef = collection(
        db,
        `users/${user.uid}/events/${currentEvent.id}/teams`,
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
          const newTeamRef = doc(teamsCollectionRef); // Auto-generate ID client-side
          addBatch.set(newTeamRef, {
            name: `${prefix} ${i}`,
            number: i,
            floorId: floor.id,
            reviewedBy: [],
            totalScore: 0,
            averageScore: 0,
            isPaused: false,
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

  // --- Revamped Bulk Import ---
  const handleImportTeamsClick = () => {
    if (floors.length === 0)
      return showToast("Please create floors with team ranges first.", "error");
    setIsImporting(true); // Indicate processing starts
    const lines = bulkImportData.trim().split("\n");
    const parsedTeams: ParsedTeam[] = [];
    const existingNumbers = new Set(teams.map((t) => t.number));
    const importNumbers = new Set<number>(); // Use Set for efficiency
    let hasError = false; // Flag to stop processing on error

    const processLine = (
      line: string,
      index: number,
      currentNumber?: number,
    ): boolean => {
      const lineNum = index + 1;
      if (!line.trim()) return true; // Skip empty lines

      let number: number;
      let name: string;

      if (importMode === "auto") {
        name = line.trim();
        number = currentNumber!; // Should be provided
        if (!name) {
          showToast(`Error on line ${lineNum}: Name cannot be empty.`, "error");
          return false;
        }
      } else {
        const parts = line.split(/[\t,:-]/, 2);
        const numberStr = parts[0]?.trim();
        name = parts[1]?.trim();
        if (!numberStr || !name) {
          showToast(
            `Error on line ${lineNum}: Invalid format. Use "Number[Separator]Name".`,
            "error",
          );
          return false;
        }
        number = parseInt(numberStr);
        if (isNaN(number) || number <= 0) {
          showToast(
            `Error on line ${lineNum}: Invalid team number "${numberStr}".`,
            "error",
          );
          return false;
        }
      }

      if (importNumbers.has(number)) {
        showToast(
          `Error on line ${lineNum}: Duplicate team number ${number} in import list.`,
          "error",
        );
        return false;
      }

      // --- [MODIFIED] Check for existing teams is now conditional ---
      if (teams.length > 0 && existingNumbers.has(number) && !isOverwrite) {
        showToast(
          `Error on line ${lineNum}: Team number ${number} already exists. To update it, check the "Overwrite Mode" box. Otherwise, clear teams first.`,
          "error",
        );
        return false;
      }
      // --- [END MODIFICATION] ---

      const floor = floors.find(
        (f) => number >= f.teamNumberStart && number <= f.teamNumberEnd,
      );
      if (!floor) {
        showToast(
          `Error on line ${lineNum}: No floor assignment found for Team #${number}. Check floor setup.`,
          "error",
        );
        return false;
      }

      importNumbers.add(number);
      parsedTeams.push({ number, name, floorId: floor.id });
      return true;
    };

    if (importMode === "auto") {
      const startNum = parseInt(startNumber);
      if (isNaN(startNum) || startNum <= 0) {
        showToast(
          "Please enter a valid starting number for auto-import.",
          "error",
        );
        setIsImporting(false);
        return;
      }
      for (let i = 0; i < lines.length; i++) {
        if (!processLine(lines[i], i, startNum + i)) {
          hasError = true;
          break;
        }
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (!processLine(lines[i], i)) {
          hasError = true;
          break;
        }
      }
    }

    setIsImporting(false); // Processing finished (error or not)
    if (hasError) return; // Stop if errors were found

    if (parsedTeams.length === 0) {
      showToast("No valid teams found to import.", "info");
      return;
    }

    setTeamsToImport(parsedTeams); // Set confirmation details
    setConfirmTitle("Confirm Team Import");

    if (isOverwrite) {
      const newCount = parsedTeams.filter(
        (t) => !existingNumbers.has(t.number),
      ).length;
      const updateCount = parsedTeams.length - newCount;
      setConfirmContent(
        <>
          <p>
            You are about to <strong className="text-white">Merge</strong>{" "}
            <strong className="text-white">{parsedTeams.length}</strong> teams.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-300">
            <li>
              <strong className="text-white">{newCount}</strong> new teams will
              be <strong className="text-emerald-400">added</strong>.
            </li>
            <li>
              <strong className="text-white">{updateCount}</strong> existing
              teams will be <strong className="text-amber-400">updated</strong>.
            </li>
          </ul>
          <p className="mt-3 font-semibold text-zinc-400">
            No teams will be deleted.
          </p>
        </>,
      );
    } else {
      setConfirmContent(
        <>
          <p>
            You are about to import{" "}
            <strong className="text-white">{parsedTeams.length}</strong> new
            teams.
          </p>
          {teams.length > 0 && (
            <p className="mt-3 font-semibold text-rose-400">
              This will DELETE all {teams.length} existing teams first. This
              action cannot be undone.
            </p>
          )}
        </>,
      );
    }

    setConfirmAction("import");
    setIsConfirmOpen(true);
  };

  const executeTeamImport = async () => {
    if (!user || !currentEvent || teamsToImport.length === 0) return;
    setIsImporting(true);
    try {
      const teamsCollectionRef = collection(
        db,
        `users/${user.uid}/events/${currentEvent.id}/teams`,
      );

      if (isOverwrite) {
        // MERGE/OVERWRITE LOGIC
        const teamNumberToId = new Map(teams.map((t) => [t.number, t.id]));
        const batch = writeBatch(db);

        for (const team of teamsToImport) {
          if (teamNumberToId.has(team.number)) {
            // This is an UPDATE
            const teamId = teamNumberToId.get(team.number)!;
            const teamRef = doc(teamsCollectionRef, teamId);
            batch.update(teamRef, {
              name: team.name,
              floorId: team.floorId,
              number: team.number, // Ensure number is also updated if case changes (though it shouldn't)
            });
          } else {
            // This is an ADD
            const newTeamRef = doc(teamsCollectionRef);
            batch.set(newTeamRef, {
              name: team.name,
              number: team.number,
              floorId: team.floorId,
              reviewedBy: [],
              totalScore: 0,
              averageScore: 0,
              isPaused: false,
            });
          }
        }
        await batch.commit();
        showToast(
          `${teamsToImport.length} teams merged successfully!`,
          "success",
        );
      } else {
        // REPLACE ALL LOGIC
        if (teams.length > 0) {
          const deleteBatch = writeBatch(db);
          const existingTeamsSnapshot = await getDocs(
            query(teamsCollectionRef),
          );
          existingTeamsSnapshot.forEach((doc) => deleteBatch.delete(doc.ref));
          await deleteBatch.commit();
        }

        const addBatch = writeBatch(db);
        for (const team of teamsToImport) {
          const newTeamRef = doc(teamsCollectionRef);
          addBatch.set(newTeamRef, {
            name: team.name,
            number: team.number,
            floorId: team.floorId,
            reviewedBy: [],
            totalScore: 0,
            averageScore: 0,
            isPaused: false,
          });
        }
        await addBatch.commit();
        showToast(
          `${teamsToImport.length} teams imported successfully!`,
          "success",
        );
      }

      setBulkImportData("");
      setTeamsToImport([]);
    } catch (error) {
      console.error("Error importing teams:", error);
      showToast("An error occurred while importing teams.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // --- Manual Add ---
  const handleAddTeam = async () => {
    if (!user || !currentEvent) return;
    const number = parseInt(newTeamNumber);
    const name = newTeamName.trim() || `Team ${number}`; // Default name if empty

    if (isNaN(number) || number <= 0)
      return showToast("Invalid team number.", "error");
    if (teams.some((t) => t.number === number))
      return showToast(`Team ${number} already exists.`, "error");

    setIsAdding(true);
    try {
      let targetFloor = floors.find(
        (f) => number >= f.teamNumberStart && number <= f.teamNumberEnd,
      );
      const basePath = `users/${user.uid}/events/${currentEvent.id}`;

      // Auto-extend logic
      if (!targetFloor && floors.length > 0) {
        // Find the floor with the highest end number
        const lastFloor = [...floors].sort(
          (a, b) => b.teamNumberEnd - a.teamNumberEnd,
        )[0];
        // Only extend if the new number is greater than the current max
        if (number > lastFloor?.teamNumberEnd) {
          targetFloor = lastFloor;
          const floorRef = doc(db, `${basePath}/floors`, lastFloor?.id ?? "");
          await updateDoc(floorRef, { teamNumberEnd: number });
          showToast(
            `Extended ${lastFloor?.name} range to include Team ${number}.`,
            "info",
          );
        }
      }

      if (!targetFloor) {
        showToast(
          `No floor range found for Team ${number}. Create or adjust floor ranges in Setup.`,
          "error",
        );
        setIsAdding(false); // Stop loading on error
        return;
      }

      await addDoc(collection(db, `${basePath}/teams`), {
        name: name,
        number,
        floorId: targetFloor.id,
        reviewedBy: [],
        totalScore: 0,
        averageScore: 0,
        isPaused: false,
      });
      showToast(`Team "${name}" (#${number}) added successfully!`, "success");
      setNewTeamNumber("");
      setNewTeamName("");
    } catch (error) {
      console.error("Error adding team:", error);
      showToast("An error occurred while adding the team.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  // --- Confirmation Dialog Handler ---
  const handleConfirm = () => {
    setIsConfirmOpen(false);
    if (confirmAction === "generate") {
      executeTeamGeneration();
    } else if (confirmAction === "import") {
      executeTeamImport();
    }
    setConfirmAction(null);
  };

  // --- Helper to handle setting selected team ---
  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* --- LEFT COLUMN: CONTROLS --- */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <MotionCard className="h-full">
            {" "}
            {/* Ensure MotionCard takes full height */}
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-zinc-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                3
              </span>
              <Users2 className="size-5" /> Create Teams
            </h2>
            <div className="mb-4 flex rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
              <Button
                onClick={() => setMode("bulkGenerate")}
                className={`w-1/3 ${
                  mode === "bulkGenerate" ? "bg-orange-600" : "bg-transparent"
                }`}
                size="sm"
              >
                <Server className="mr-1 size-4" /> {/* Added margin */}
                Generate
              </Button>
              <Button
                onClick={() => setMode("bulkImport")}
                className={`w-1/3 ${
                  mode === "bulkImport" ? "bg-orange-600" : "bg-transparent"
                }`}
                size="sm"
              >
                <Upload className="mr-1 size-4" /> {/* Added margin */}
                Import
              </Button>
              <Button
                onClick={() => setMode("manual")}
                className={`w-1/3 ${
                  mode === "manual" ? "bg-orange-600" : "bg-transparent"
                }`}
                size="sm"
              >
                <PlusCircle className="mr-1 size-4" /> {/* Added margin */}{" "}
                Manual
              </Button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex h-[calc(100%-100px)] flex-col" // Allow content to fill space
              >
                {mode === "bulkGenerate" && (
                  <div className="flex flex-1 flex-col justify-between space-y-4">
                    {" "}
                    {/* Flex column */}
                    <div>
                      {" "}
                      {/* Content Wrapper */}
                      <p className="text-sm text-zinc-400">
                        Auto-generate sequential teams (e.g., Team 1, Team
                        2...).
                      </p>
                      <Card className="mt-4 grid grid-cols-2 gap-3">
                        {" "}
                        {/* Added mt */}
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
                          <Label htmlFor="startNumGen">Start Number</Label>
                          <Input
                            id="startNumGen"
                            type="number"
                            placeholder="e.g., 1"
                            value={startNumber}
                            onChange={(e) => setStartNumber(e.target.value)}
                            min="1"
                          />
                        </div>
                      </Card>
                      <Card className="mt-4">
                        {" "}
                        {/* Added mt */}
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
                    </div>
                    <div className="mt-auto">
                      {" "}
                      {/* Button and Warning Wrapper */}
                      {teams.length > 0 && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-amber-300">
                          {" "}
                          {/* Use mb */}
                          <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
                          <p className="text-xs">
                            This will replace the{" "}
                            <strong>{teams.length} teams</strong> currently in
                            the system.
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={handleGenerateTeamsClick}
                        disabled={isGenerating || !totalTeams || !startNumber} // Add more disabled checks
                        className="w-full bg-gradient-to-br from-orange-700 to-orange-600 hover:from-orange-600 hover:to-orange-500"
                      >
                        {isGenerating ? (
                          <Loader className="mr-2 size-4 animate-spin" />
                        ) : (
                          <PlusCircle className="mr-2 size-4" />
                        )}
                        {isGenerating
                          ? "Generating..."
                          : `Generate & ${
                              teams.length > 0 ? "Replace All" : "Create Teams"
                            }`}
                      </Button>
                    </div>
                  </div>
                )}

                {mode === "bulkImport" && (
                  <div className="flex flex-1 flex-col justify-between space-y-4">
                    {" "}
                    {/* Flex column */}
                    <div>
                      {" "}
                      {/* Content Wrapper */}
                      <Card>
                        <Label className="mb-2 block">Import Mode</Label>
                        <div className="flex rounded-lg border border-zinc-700 bg-zinc-950/50 p-1">
                          <Button
                            onClick={() => setImportMode("manual")}
                            className={`flex-1 ${
                              importMode === "manual"
                                ? "bg-zinc-700"
                                : "bg-transparent text-zinc-400"
                            }`}
                            size="sm"
                          >
                            <Hash className="mr-1 size-4" /> Number & Name
                          </Button>
                          <Button
                            onClick={() => setImportMode("auto")}
                            className={`flex-1 ${
                              importMode === "auto"
                                ? "bg-zinc-700"
                                : "bg-transparent text-zinc-400"
                            }`}
                            size="sm"
                          >
                            <List className="mr-1 size-4" /> Names Only
                          </Button>
                        </div>
                      </Card>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={importMode}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 space-y-4" // Add margin top here
                        >
                          {importMode === "manual" ? (
                            <Card>
                              <Label
                                htmlFor="bulkImport"
                                className="text-orange-400"
                              >
                                Format: <code>Number[ , : - Tab ]Name</code>
                              </Label>
                              <p className="mt-1 text-xs text-zinc-400">
                                Paste teams one per line. <br />
                                e.g., <code>101,Team Rocket</code> or{" "}
                                <code>102:Team Aqua</code>
                              </p>
                            </Card>
                          ) : (
                            <Card>
                              <Label htmlFor="startNumImport">
                                Auto-Number Start
                              </Label>
                              <Input
                                id="startNumImport"
                                type="number"
                                placeholder="e.g., 1"
                                value={startNumber}
                                onChange={(e) => setStartNumber(e.target.value)}
                                min="1"
                              />
                              <p className="mt-1 text-xs text-zinc-400">
                                First team pasted will be this number, second
                                will be +1, etc.
                              </p>
                            </Card>
                          )}
                        </motion.div>
                      </AnimatePresence>
                      <motion.div
                        key={importMode + "textarea"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <textarea
                          id="bulkImport"
                          className="mt-4 flex min-h-[150px] w-full rounded-md border border-zinc-700/80 bg-zinc-950/50 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder={
                            importMode === "manual"
                              ? "101,Team Rocket\n102:Team Aqua\n103-Team Magma"
                              : "Team Rocket\nTeam Aqua\nTeam Magma"
                          }
                          value={bulkImportData}
                          onChange={(e) => setBulkImportData(e.target.value)}
                        />
                      </motion.div>
                    </div>
                    <div className="mt-auto space-y-4">
                      {" "}
                      {/* Button and Warning Wrapper */}
                      {/* --- [NEW] Overwrite Checkbox --- */}
                      <Checkbox
                        id="overwrite-check"
                        checked={isOverwrite}
                        onChange={setIsOverwrite}
                        label={
                          <>
                            <span className="font-semibold text-white">
                              Overwrite Mode (Merge)
                            </span>
                            <span className="mt-1 block text-xs text-zinc-400">
                              If a team number already exists, its name and
                              floor will be updated. No teams will be deleted.
                            </span>
                          </>
                        }
                      />
                      {/* --- [END NEW] --- */}
                      {teams.length > 0 && !isOverwrite && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-amber-300">
                          {" "}
                          {/* Use mb */}
                          <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
                          <p className="text-xs">
                            This will replace the{" "}
                            <strong>{teams.length} teams</strong> currently in
                            the system.
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={handleImportTeamsClick}
                        disabled={isImporting || !bulkImportData}
                        className="w-full bg-gradient-to-br from-orange-700 to-orange-600 hover:from-orange-600 hover:to-orange-500"
                      >
                        {isImporting ? (
                          <Loader className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 size-4" />
                        )}
                        {isImporting
                          ? "Validating..."
                          : `Validate & ${
                              isOverwrite
                                ? "Merge Teams"
                                : teams.length > 0
                                  ? "Replace All Teams"
                                  : "Import Teams"
                            }`}
                      </Button>
                    </div>
                  </div>
                )}

                {mode === "manual" && (
                  <div className="flex flex-1 flex-col justify-between space-y-4">
                    {" "}
                    {/* Flex column */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTeam();
                      }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-zinc-400">
                        Add a single team. Auto-extends floor range if needed.
                      </p>
                      <div>
                        <Label htmlFor="teamNumber">Team Number</Label>
                        <Input
                          id="teamNumber"
                          type="number"
                          placeholder="e.g., 101"
                          value={newTeamNumber}
                          onChange={(e) => setNewTeamNumber(e.target.value)}
                          required
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamName">Team Name (Optional)</Label>
                        <Input
                          id="teamName"
                          type="text"
                          placeholder="e.g., Team Rocket"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isAdding || !newTeamNumber}
                        className="w-full bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                      >
                        {isAdding ? (
                          <Loader className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 size-4" />
                        )}
                        {isAdding ? "Adding..." : "Add Team"}
                      </Button>
                    </form>
                    <div className="mt-auto"></div> {/* Spacer */}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </MotionCard>
        </div>

        {/* --- RIGHT COLUMN: TEAMS DISPLAY --- */}
        <div className="h-full lg:col-span-2">
          {" "}
          {/* Adjusted height calculation */}
          <Card className="h-[calc(100vh-8rem)] overflow-y-auto">
            {" "}
            {/* Adjusted height */}
            <div className="sticky top-[-1rem] z-10 mt-[-1rem] mb-2 py-3">
              {" "}
              {/* Sticky header */}
              <h2 className="pt-2 text-xl font-bold text-zinc-100">
                Current Teams ({teams.length})
              </h2>
            </div>
            {floors.length === 0 && (
              <Card className="flex h-[calc(100%-4rem)] flex-col items-center justify-center gap-4 text-center">
                <AlertTriangle className="size-16 text-zinc-700" />
                <p className="font-semibold text-amber-400">
                  No Floors Created
                </p>
                <p className="text-zinc-500 italic">
                  Please go to the Setup tab and add floors with team ranges
                  before adding teams.
                </p>
              </Card>
            )}
            {floors.length > 0 && teams.length === 0 && (
              <Card className="flex h-[calc(100%-4rem)] flex-col items-center justify-center gap-4 text-center">
                <Users2 className="size-16 text-zinc-700" />
                <p className="font-semibold text-zinc-400">No Teams Added</p>
                <p className="text-zinc-500 italic">
                  Use the controls on the left to generate, import, or manually
                  add teams.
                </p>
              </Card>
            )}
            {floors.length > 0 &&
              teams.length > 0 &&
              [...floors]
                .sort((a, b) => a.teamNumberStart - b.teamNumberStart) // Sort floors correctly
                .map((floor) => {
                  const teamsOnFloor = teams
                    .filter((t) => t.floorId === floor.id)
                    .sort((a, b) => a.number - b.number);
                  // Don't render floor section if no teams are on it
                  // if (teamsOnFloor.length === 0) return null;

                  return (
                    <div key={floor.id} className="mb-6">
                      <h3 className="mb-3 border-b border-zinc-700 pb-2 font-bold text-orange-400">
                        {floor.name} (Range: {floor.teamNumberStart}-
                        {floor.teamNumberEnd})
                      </h3>
                      {teamsOnFloor.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
                          {teamsOnFloor.map((team) => (
                            <MotionCard
                              key={team.id}
                              onClick={() => handleSelectTeam(team)}
                              className={`relative transform-gpu cursor-pointer rounded-lg bg-zinc-800/70 p-3 text-left shadow-md transition-all hover:-translate-y-1 hover:bg-zinc-700/90 hover:shadow-xl hover:shadow-orange-500/10 ${
                                team.isPaused ? "opacity-40 grayscale" : ""
                              }`}
                            >
                              <div className="absolute top-2 right-2 z-10">
                                <Tooltip
                                  content={
                                    team.isPaused ? "Resume Team" : "Pause Team"
                                  }
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePause(team.id);
                                    }}
                                    disabled={isPausing === team.id}
                                    className={`flex size-6 items-center justify-center rounded-full border border-zinc-900 transition-colors ${
                                      team.isPaused
                                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                        : "bg-zinc-600 text-zinc-300 hover:bg-zinc-500"
                                    }`}
                                  >
                                    {isPausing === team.id ? (
                                      <Loader className="size-3 animate-spin" />
                                    ) : team.isPaused ? (
                                      <Play className="size-3 fill-white" />
                                    ) : (
                                      <Pause className="size-3" />
                                    )}
                                  </button>
                                </Tooltip>
                              </div>

                              <p
                                className="truncate pr-6 font-bold text-white"
                                title={team.name}
                              >
                                {team.name}
                              </p>
                              <p className="text-xs text-zinc-400">
                                #{team.number}
                              </p>
                              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                                <span
                                  className="flex items-center gap-1.5"
                                  title="Average Score"
                                >
                                  <Star className="size-3 text-amber-500" />
                                  {/* Handle potential NaN/undefined */}
                                  {(team.averageScore ?? 0).toFixed(2)}
                                </span>
                                <span
                                  className="flex items-center gap-1.5"
                                  title="Number of Reviews"
                                >
                                  <MessageSquare className="size-3 text-sky-500" />
                                  {team.reviewedBy?.length ?? 0}
                                </span>
                              </div>
                            </MotionCard>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-2 text-sm text-zinc-500 italic">
                          No teams assigned to this floor yet.
                        </p>
                      )}
                    </div>
                  );
                })}
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
        onConfirm={handleConfirm}
        title={confirmTitle}
        icon={<AlertTriangle className="size-8 text-rose-500" />}
      >
        {confirmContent}
      </ConfirmationDialog>
    </>
  );
};

export default TeamSetup;
