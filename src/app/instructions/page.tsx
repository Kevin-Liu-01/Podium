"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Building2,
  Users,
  PlusCircle,
  Sparkles,
  ClipboardList,
  FileSpreadsheet,
  Medal,
  XCircle,
  ArrowLeft,
  GripVertical,
  Check,
  Minus,
  Server,
  MessageSquarePlus,
  Clock,
  Download,
  ArrowDown,
  User,
  LayoutGrid,
  SlidersHorizontal,
  Eye,
  Cpu,
  Shuffle,
  Target,
  Layers,
  ArrowRightLeft,
  Zap,
} from "lucide-react";

// ─── Animations ───
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// ─── Reusable UI Primitives (standalone, no context needed) ───
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`group relative rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-150 hover:border-white/20 ${className}`}
  >
    {children}
  </div>
);

const DemoCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl border border-white/5 bg-zinc-950/60 p-4 ${className}`}
  >
    {children}
  </div>
);

const DemoButton = ({
  children,
  onClick,
  className = "",
  disabled = false,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex transform cursor-pointer items-center justify-center gap-2 rounded-lg font-bold transition-all duration-300 ease-in-out focus:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const DemoInput = ({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50 ${className}`}
  />
);

const StepBadge = ({ number }: { number: number }) => (
  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-lg font-bold text-white shadow-lg shadow-orange-500/30">
    {number}
  </span>
);

const SectionTitle = ({
  step,
  title,
  icon,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
}) => (
  <div className="mb-6 flex items-center gap-4">
    <StepBadge number={step} />
    <div className="flex items-center gap-3">
      <span className="text-orange-400">{icon}</span>
      <h2 className="text-2xl font-bold text-white md:text-3xl">{title}</h2>
    </div>
  </div>
);

// ─── STEP 1: Create Event Demo ───
const CreateEventDemo = () => {
  const [name, setName] = useState("");
  const [year, setYear] = useState("2026");
  const [created, setCreated] = useState(false);
  const [events, setEvents] = useState<{ name: string; year: string }[]>([]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setEvents((prev) => [...prev, { name: name.trim(), year }]);
    setCreated(true);
    setTimeout(() => setCreated(false), 2000);
    setName("");
  };

  return (
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-orange-500/50 bg-zinc-900/50 p-5 shadow-lg shadow-orange-500/10">
          <h3 className="mb-4 text-center text-lg font-bold text-white">
            Launch New Event
          </h3>
          <div className="space-y-3">
            <DemoInput
              placeholder="Event Name (e.g., HackPrinceton)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <DemoInput
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <DemoButton
              onClick={handleCreate}
              className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700"
            >
              <PlusCircle className="h-4 w-4" /> Create Event
            </DemoButton>
          </div>
        </div>
        <div className="space-y-3">
          <AnimatePresence>
            {created && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400"
              >
                Event created successfully!
              </motion.div>
            )}
          </AnimatePresence>
          {events.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-lg backdrop-blur-md"
            >
              <h4 className="font-bold text-white">
                {ev.name} {ev.year}
              </h4>
              <p className="mt-1 text-xs text-zinc-400">
                Click to open &rarr;
              </p>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-700 p-8">
              <p className="text-center text-sm text-zinc-500">
                Your events will appear here. Try creating one!
              </p>
            </div>
          )}
        </div>
      </div>
    </DemoCard>
  );
};

// ─── STEP 2: Admin Setup Demo ───
const AdminSetupDemo = () => {
  const [floorName, setFloorName] = useState("");
  const [teamStart, setTeamStart] = useState("");
  const [teamEnd, setTeamEnd] = useState("");
  const [floors, setFloors] = useState([
    { name: "Floor 1", range: "1 - 30" },
    { name: "Floor 2", range: "31 - 60" },
  ]);
  const [unassigned, setUnassigned] = useState(["Charlie", "Diana"]);
  const [floor1Judges, setFloor1Judges] = useState(["Alice"]);
  const [floor2Judges, setFloor2Judges] = useState(["Bob"]);

  const handleAddFloor = () => {
    if (!floorName.trim() || !teamStart || !teamEnd) return;
    setFloors((prev) => [
      ...prev,
      { name: floorName, range: `${teamStart} - ${teamEnd}` },
    ]);
    setFloorName("");
    setTeamStart("");
    setTeamEnd("");
  };

  const handleAutoDistribute = () => {
    const half = Math.ceil(unassigned.length / 2);
    setFloor1Judges((prev) => [...prev, ...unassigned.slice(0, half)]);
    setFloor2Judges((prev) => [...prev, ...unassigned.slice(half)]);
    setUnassigned([]);
  };

  return (
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Floors */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-200">
            <Building2 className="size-4 text-orange-400" /> Manage Floors
          </h3>
          <div className="space-y-2">
            <DemoInput
              placeholder="Floor Name"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
            />
            <div className="flex gap-2">
              <DemoInput
                type="number"
                placeholder="Start #"
                value={teamStart}
                onChange={(e) => setTeamStart(e.target.value)}
              />
              <DemoInput
                type="number"
                placeholder="End #"
                value={teamEnd}
                onChange={(e) => setTeamEnd(e.target.value)}
              />
            </div>
            <DemoButton
              onClick={handleAddFloor}
              className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
            >
              <PlusCircle className="h-4 w-4" /> Add Floor
            </DemoButton>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-zinc-900/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">
                    Floor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">
                    Team Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {floors.map((f, i) => (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-3 py-2 font-medium text-white">
                      {f.name}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{f.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Judges DnD */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-200">
            <Users className="size-4 text-orange-400" /> Assign Judges to Floors
          </h3>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Drag judges to floors, or auto-distribute
            </span>
            <DemoButton
              onClick={handleAutoDistribute}
              disabled={unassigned.length === 0}
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
              size="sm"
            >
              <Sparkles className="size-3" /> Auto-Distribute
            </DemoButton>
          </div>
          <div className="space-y-2">
            {/* Unassigned */}
            <div className="rounded-lg border border-dashed border-zinc-600 bg-zinc-800/50 p-3">
              <p className="mb-2 text-xs font-semibold text-zinc-400">
                Unassigned ({unassigned.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((j) => (
                  <span
                    key={j}
                    className="flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-white"
                  >
                    <GripVertical className="size-3 text-zinc-500" /> {j}
                  </span>
                ))}
                {unassigned.length === 0 && (
                  <span className="text-xs text-zinc-600 italic">
                    All judges assigned!
                  </span>
                )}
              </div>
            </div>
            {/* Floor zones */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-400">
                  Floor 1
                </p>
                <div className="flex flex-wrap gap-1">
                  {floor1Judges.map((j) => (
                    <span
                      key={j}
                      className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-400">
                  Floor 2
                </p>
                <div className="flex flex-wrap gap-1">
                  {floor2Judges.map((j) => (
                    <span
                      key={j}
                      className="rounded-md bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-300"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoCard>
  );
};

// ─── STEP 3: Teams Demo ───
const TeamsDemo = () => {
  const [prefix, setPrefix] = useState("Team");
  const [startNum, setStartNum] = useState("1");
  const [count, setCount] = useState("5");
  const [teams, setTeams] = useState<{ number: number; name: string }[]>([]);
  const [mode, setMode] = useState<"generate" | "import">("generate");
  const [importText, setImportText] = useState("");

  const handleGenerate = () => {
    const start = parseInt(startNum) || 1;
    const total = parseInt(count) || 5;
    const newTeams = Array.from({ length: total }, (_, i) => ({
      number: start + i,
      name: `${prefix} ${start + i}`,
    }));
    setTeams(newTeams);
  };

  const handleImport = () => {
    const lines = importText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const newTeams = lines.map((line, i) => ({
      number: i + 1,
      name: line,
    }));
    setTeams(newTeams);
  };

  return (
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="mb-4 flex gap-2">
        <DemoButton
          onClick={() => setMode("generate")}
          className={`${mode === "generate" ? "bg-orange-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
          size="sm"
        >
          Generate Teams
        </DemoButton>
        <DemoButton
          onClick={() => setMode("import")}
          className={`${mode === "import" ? "bg-orange-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
          size="sm"
        >
          Import Teams
        </DemoButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          {mode === "generate" ? (
            <div className="space-y-3">
              <DemoInput
                placeholder="Prefix (e.g., Team)"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
              <div className="flex gap-2">
                <DemoInput
                  type="number"
                  placeholder="Start #"
                  value={startNum}
                  onChange={(e) => setStartNum(e.target.value)}
                />
                <DemoInput
                  type="number"
                  placeholder="Count"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>
              <DemoButton
                onClick={handleGenerate}
                className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
              >
                <PlusCircle className="h-4 w-4" /> Generate Teams
              </DemoButton>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Paste team names, one per line:\nCyberSquad\nDataDragons\nCodeCrafters"}
                rows={5}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50"
              />
              <DemoButton
                onClick={handleImport}
                className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
              >
                <PlusCircle className="h-4 w-4" /> Import Teams
              </DemoButton>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-3">
          <p className="mb-2 text-xs font-semibold text-zinc-400">
            Teams ({teams.length})
          </p>
          <div className="custom-scrollbar max-h-48 space-y-1 overflow-y-auto">
            {teams.map((t) => (
              <div
                key={t.number}
                className="flex items-center justify-between rounded-lg bg-zinc-800/70 px-3 py-2 text-sm"
              >
                <span className="font-medium text-white">{t.name}</span>
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  #{t.number}
                </span>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-600 italic">
                No teams yet. Try generating or importing!
              </p>
            )}
          </div>
        </div>
      </div>
    </DemoCard>
  );
};

// ─── STEP 4: Assignments Demo ───
const AssignmentsDemo = () => {
  const allJudges = ["Alice", "Bob", "Charlie", "Diana"];
  const allTeams = Array.from({ length: 20 }, (_, i) => `Team ${i + 1}`);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<
    { judge: string; teams: string[] }[]
  >([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const toggleJudge = (j: string) =>
    setSelected((p) =>
      p.includes(j) ? p.filter((x) => x !== j) : [...p, j],
    );

  const handleGenerate = () => {
    if (selected.length === 0) return;
    setIsAssigning(true);
    setTimeout(() => {
      const newAssignments = selected.map((judge, idx) => ({
        judge,
        teams: allTeams.slice(idx * 5, idx * 5 + 5),
      }));
      setAssignments(newAssignments);
      setIsAssigning(false);
    }, 800);
  };

  return (
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-300">
                Assignable Judges
              </p>
              <DemoButton
                onClick={() =>
                  setSelected(
                    selected.length === allJudges.length ? [] : [...allJudges],
                  )
                }
                className="bg-zinc-600 text-white hover:bg-zinc-500"
                size="sm"
              >
                {selected.length === allJudges.length
                  ? "Deselect All"
                  : "Select All"}
              </DemoButton>
            </div>
            <div className="space-y-1">
              {allJudges.map((j) => (
                <label
                  key={j}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(j)}
                    onChange={() => toggleJudge(j)}
                    className="size-4 rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="text-sm font-medium text-white">{j}</span>
                </label>
              ))}
            </div>
          </div>
          <DemoButton
            onClick={handleGenerate}
            disabled={selected.length === 0 || isAssigning}
            className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
          >
            {isAssigning
              ? "Assigning..."
              : `Generate & Assign (${selected.length})`}
          </DemoButton>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-300">
            Assignment Results
          </p>
          <AnimatePresence>
            {assignments.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                    <Clock className="size-3" /> Busy
                  </span>
                  <span className="font-bold text-white">{a.judge}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.teams.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-zinc-600 px-2.5 py-0.5 text-xs text-white"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {assignments.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-zinc-700">
              <p className="text-center text-sm text-zinc-600">
                Select judges and click Generate to see assignments
              </p>
            </div>
          )}
        </div>
      </div>
    </DemoCard>
  );
};

// ─── STEP 5: Score Entry Demo ───
const ScoreEntryDemo = () => {
  const teams = [
    { id: "1", name: "CyberSquad", number: 1 },
    { id: "2", name: "DataDragons", number: 2 },
    { id: "3", name: "CodeCrafters", number: 3 },
    { id: "4", name: "ByteBuilders", number: 4 },
    { id: "5", name: "PixelPioneers", number: 5 },
  ];
  const [rankings, setRankings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleRank = (teamId: string, rank: number) => {
    setRankings((prev) => {
      const next = { ...prev };
      // If toggling off
      if (prev[teamId] === rank) {
        next[teamId] = 0;
        return next;
      }
      // Remove rank from other team
      if (rank !== 0) {
        const other = Object.keys(next).find((k) => next[k] === rank);
        if (other) next[other] = 0;
      }
      next[teamId] = rank;
      return next;
    });
  };

  const rankStyles: Record<
    0 | 1 | 2 | 3,
    { label: string; icon: React.ReactNode; selected: string; base: string }
  > = {
    1: {
      label: "1st",
      icon: <Trophy className="size-3.5" />,
      selected: "bg-amber-500 text-white shadow-lg shadow-amber-500/20",
      base: "bg-zinc-700/50 hover:bg-amber-500/60",
    },
    2: {
      label: "2nd",
      icon: <Medal className="size-3.5" />,
      selected: "bg-slate-400 text-white shadow-lg shadow-slate-400/20",
      base: "bg-zinc-700/50 hover:bg-slate-400/60",
    },
    3: {
      label: "3rd",
      icon: <Medal className="size-3.5" />,
      selected: "bg-orange-600 text-white shadow-lg shadow-orange-600/20",
      base: "bg-zinc-700/50 hover:bg-orange-600/60",
    },
    0: {
      label: "None",
      icon: <XCircle className="size-3.5" />,
      selected: "bg-zinc-500 text-white",
      base: "bg-zinc-700/50 hover:bg-zinc-500/60",
    },
  };

  const getBorderClass = (teamId: string) => {
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
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          Enter Scores for{" "}
          <span className="text-orange-400">Judge Alice</span>
        </h3>
      </div>
      <div className="space-y-2">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`flex flex-col gap-2 rounded-lg bg-zinc-800/80 p-3 transition-all sm:flex-row sm:items-center sm:justify-between ${getBorderClass(team.id)}`}
          >
            <p className="text-sm font-bold text-white">
              {team.name}
              <span className="ml-2 text-xs font-normal text-zinc-400">
                (#{team.number})
              </span>
            </p>
            <div className="flex flex-shrink-0 space-x-1.5">
              {([1, 2, 3, 0] as const).map((r) => {
                const style = rankStyles[r];
                const { label, icon, selected, base } = style;
                const isSelected = (rankings[team.id] ?? 0) === r;
                return (
                  <DemoButton
                    key={r}
                    onClick={() => handleRank(team.id, r)}
                    className={isSelected ? selected : base}
                    size="sm"
                  >
                    {icon}{" "}
                    <span className="hidden sm:inline">{label}</span>
                  </DemoButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <DemoButton className="bg-zinc-700 text-white hover:bg-zinc-600">
          <MessageSquarePlus className="size-4" /> Add Comments
        </DemoButton>
        <DemoButton
          onClick={() => {
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 2000);
          }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
        >
          Submit All Scores
        </DemoButton>
      </div>
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400"
          >
            Scores submitted successfully!
          </motion.div>
        )}
      </AnimatePresence>
    </DemoCard>
  );
};

// ─── STEP 6: Results Demo ───
const ResultsDemo = () => {
  const [viewMode, setViewMode] = useState<"leaderboard" | "matrix">(
    "leaderboard",
  );
  const mockTeams = [
    {
      rank: 0,
      name: "CyberSquad",
      number: 3,
      floor: "Floor 1",
      reviews: 4,
      high: 3.0,
      low: 2.0,
      avg: 2.75,
    },
    {
      rank: 1,
      name: "DataDragons",
      number: 7,
      floor: "Floor 1",
      reviews: 4,
      high: 3.0,
      low: 1.0,
      avg: 2.5,
    },
    {
      rank: 2,
      name: "CodeCrafters",
      number: 12,
      floor: "Floor 2",
      reviews: 3,
      high: 3.0,
      low: 1.0,
      avg: 2.33,
    },
    {
      rank: 3,
      name: "ByteBuilders",
      number: 15,
      floor: "Floor 2",
      reviews: 3,
      high: 2.0,
      low: 1.0,
      avg: 1.67,
    },
    {
      rank: 4,
      name: "PixelPioneers",
      number: 22,
      floor: "Floor 1",
      reviews: 2,
      high: 2.0,
      low: 0.0,
      avg: 1.0,
    },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="inline-block size-5 text-yellow-400" />;
      case 1:
        return <Medal className="inline-block size-5 text-gray-300" />;
      case 2:
        return <Medal className="inline-block size-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-medium text-zinc-400">{rank + 1}</span>
        );
    }
  };

  const mockJudges = ["Alice", "Bob", "Charlie", "Diana"];
  const mockMatrix: Record<string, string[]> = {
    CyberSquad: ["Alice", "Bob", "Charlie", "Diana"],
    DataDragons: ["Alice", "Bob", "Charlie", "Diana"],
    CodeCrafters: ["Alice", "Bob", "Charlie"],
    ByteBuilders: ["Alice", "Charlie", "Diana"],
    PixelPioneers: ["Bob", "Diana"],
  };

  return (
    <DemoCard>
      <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        Interactive Demo
      </p>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Final Results</h3>
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
          <DemoButton
            onClick={() => setViewMode("leaderboard")}
            className={
              viewMode === "leaderboard"
                ? "bg-orange-600 text-white"
                : "bg-transparent text-zinc-400 hover:text-white"
            }
            size="sm"
          >
            Leaderboard
          </DemoButton>
          <DemoButton
            onClick={() => setViewMode("matrix")}
            className={
              viewMode === "matrix"
                ? "bg-orange-600 text-white"
                : "bg-transparent text-zinc-400 hover:text-white"
            }
            size="sm"
          >
            Matrix
          </DemoButton>
        </div>
      </div>

      {viewMode === "leaderboard" ? (
        <div className="custom-scrollbar overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-800/90">
              <tr>
                <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  Rank
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">
                  Team
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  #
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  Floor
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  Reviews
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  High
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  Low
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/80">
              {mockTeams.map((t) => (
                <tr
                  key={t.number}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/60"
                >
                  <td className="px-3 py-2.5 text-center">
                    {getRankIcon(t.rank)}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-white">
                    {t.name}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm text-zinc-300">
                    {t.number}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm text-zinc-300">
                    {t.floor}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm text-zinc-300">
                    {t.reviews}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-medium text-blue-400">
                    {t.high.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-medium text-purple-400">
                    {t.low.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-base font-bold text-teal-400">
                    {t.avg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="custom-scrollbar overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800 text-center">
            <thead className="bg-zinc-800/90">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">
                  Team
                </th>
                {mockJudges.map((j) => (
                  <th
                    key={j}
                    className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 uppercase"
                  >
                    {j}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/80">
              {Object.entries(mockMatrix).map(([team, judges]) => (
                <tr
                  key={team}
                  className="transition-colors hover:bg-zinc-800/60"
                >
                  <td className="px-3 py-2 text-left text-sm font-semibold text-white">
                    {team}
                  </td>
                  {mockJudges.map((j) => (
                    <td key={j} className="px-3 py-2">
                      {judges.includes(j) ? (
                        <Check className="mx-auto size-5 text-emerald-400" />
                      ) : (
                        <Minus className="mx-auto size-5 text-zinc-700" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <DemoButton
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
          size="sm"
        >
          <Download className="size-3.5" /> Export CSV
        </DemoButton>
      </div>
    </DemoCard>
  );
};

// ─── FLOW CONNECTOR ───
const FlowConnector = () => (
  <div className="flex justify-center py-2">
    <div className="flex flex-col items-center">
      <div className="h-6 w-px border-l border-dashed border-orange-500/25" />
      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-orange-500/20 bg-zinc-900/80">
        <ArrowDown className="size-2.5 text-orange-500/50" />
      </div>
      <div className="h-6 w-px border-l border-dashed border-orange-500/25" />
    </div>
  </div>
);

// ─── MAIN INSTRUCTIONS PAGE ───
export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-orange-400"
          >
            <ArrowLeft className="size-4" />
            Back to Podium
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-orange-500" />
            <span className="font-bold text-white">Instructions</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <Trophy className="mx-auto size-16 text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
          <h1 className="mt-6 bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
            How to Use Podium
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Podium is a real-time hackathon judging platform. Follow the steps
            below to organize your event from start to finish. Each section
            includes an interactive demo you can try out.
          </p>

          {/* Quick Overview */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
            {[
              {
                icon: <PlusCircle className="size-5" />,
                label: "Create Event",
              },
              {
                icon: <Building2 className="size-5" />,
                label: "Setup Floors & Judges",
              },
              {
                icon: <Server className="size-5" />,
                label: "Add Teams",
              },
              {
                icon: <ClipboardList className="size-5" />,
                label: "Assign Judges",
              },
              {
                icon: <Trophy className="size-5" />,
                label: "Score Teams",
              },
              {
                icon: <FileSpreadsheet className="size-5" />,
                label: "View Results",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-3 text-left"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-zinc-300">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── STEP 1 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={1}
            title="Create Your Event"
            icon={<PlusCircle className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                After signing in, you&apos;ll land on the{" "}
                <span className="font-semibold text-orange-400">
                  Event Setup
                </span>{" "}
                screen. Here you can create a new hackathon event or select an
                existing one.
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                <li>
                  Enter an <strong className="text-zinc-200">event name</strong>{" "}
                  and <strong className="text-zinc-200">year</strong>
                </li>
                <li>
                  Each event gets a unique ID based on the name (e.g.,{" "}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-orange-300">
                    hackprinceton-2026
                  </code>
                  )
                </li>
                <li>
                  All your events appear as cards you can click to open
                </li>
              </ul>
            </div>
            <CreateEventDemo />
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 2 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={2}
            title="Setup Floors & Judges"
            icon={<Users className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                The{" "}
                <span className="font-semibold text-orange-400">
                  Admin Panel
                </span>{" "}
                (Setup) is where you configure the venue and judging staff.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-white">
                    <Building2 className="size-4 text-orange-400" /> Floors
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Each floor has a{" "}
                      <strong className="text-zinc-200">name</strong> and a{" "}
                      <strong className="text-zinc-200">team number range</strong>
                    </li>
                    <li>
                      Example: &quot;Floor 1&quot; covers teams 1-30, &quot;Floor
                      2&quot; covers teams 31-60
                    </li>
                    <li>Ranges must not overlap</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-white">
                    <Users className="size-4 text-orange-400" /> Judges
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>Add judges by name (one per line)</li>
                    <li>
                      <strong className="text-zinc-200">
                        Drag and drop
                      </strong>{" "}
                      judges between floors
                    </li>
                    <li>
                      Or use{" "}
                      <strong className="text-zinc-200">
                        Auto-Distribute
                      </strong>{" "}
                      to evenly spread them
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <AdminSetupDemo />
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 3 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={3}
            title="Add Teams"
            icon={<Server className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                The{" "}
                <span className="font-semibold text-orange-400">Teams</span>{" "}
                page lets you populate your event with participating teams.
                There are multiple ways to add them:
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-white">
                    Generate
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Set a prefix, start number, and count to auto-create teams
                    (e.g., &quot;Team 1&quot; through &quot;Team 30&quot;).
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-white">
                    Bulk Import
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Paste a list of team names (tab, comma, or colon separated)
                    for quick import from a spreadsheet.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-white">
                    Manual Add
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Add teams one at a time with a custom number and optional
                    name.
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                Teams are automatically assigned to floors based on their number
                and the floor ranges you configured. You can also{" "}
                <strong className="text-zinc-200">pause</strong> teams to
                temporarily exclude them from judging.
              </p>
            </div>
            <TeamsDemo />
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 4 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={4}
            title="Assign Judges to Teams"
            icon={<ClipboardList className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                The{" "}
                <span className="font-semibold text-orange-400">
                  Assignments
                </span>{" "}
                dashboard is where the magic happens. Select a floor, then
                assign judges to blocks of teams.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-white">
                    <Sparkles className="size-4 text-orange-400" /> Auto Mode
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Select which judges to assign, then click{" "}
                      <strong className="text-zinc-200">
                        Generate & Assign
                      </strong>
                    </li>
                    <li>
                      The algorithm assigns each judge a block of{" "}
                      <strong className="text-zinc-200">5 teams</strong>
                    </li>
                    <li>
                      It minimizes overlap and spreads reviews evenly
                    </li>
                    <li>
                      Judges who have seen most teams are automatically marked
                      as &quot;Finished&quot;
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-white">
                    <User className="size-4 text-orange-400" /> Manual Mode
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>Select a specific judge and pick teams manually</li>
                    <li>
                      Already-judged teams are grayed out to prevent duplicates
                    </li>
                    <li>Useful for edge cases or special assignments</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <Clock className="mt-0.5 size-4 flex-shrink-0 text-amber-400" />
                <p className="text-sm text-zinc-400">
                  <strong className="text-amber-300">Judge Statuses:</strong>{" "}
                  <span className="text-amber-400">Busy</span> = currently
                  assigned,{" "}
                  <span className="text-emerald-400">Assignable</span> = ready
                  for a new block,{" "}
                  <span className="text-sky-400">Finished</span> = has seen
                  nearly all teams.
                </p>
              </div>
            </div>
            <AssignmentsDemo />
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 5 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={5}
            title="Score Teams"
            icon={<Trophy className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                From the{" "}
                <span className="font-semibold text-orange-400">
                  Floor Dashboard
                </span>{" "}
                or the{" "}
                <span className="font-semibold text-orange-400">
                  Assignments
                </span>{" "}
                page, click <strong>Enter Scores</strong> on a busy judge to
                open the scoring form.
              </p>
              <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                <h4 className="mb-2 font-semibold text-white">
                  Ranking System
                </h4>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                    <Trophy className="size-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-bold text-amber-300">
                        1st Place
                      </p>
                      <p className="text-xs text-zinc-400">3 points</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-400/10 px-3 py-2">
                    <Medal className="size-4 text-slate-300" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">
                        2nd Place
                      </p>
                      <p className="text-xs text-zinc-400">2 points</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-orange-600/10 px-3 py-2">
                    <Medal className="size-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-bold text-orange-300">
                        3rd Place
                      </p>
                      <p className="text-xs text-zinc-400">1 point</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-700/30 px-3 py-2">
                    <XCircle className="size-4 text-zinc-500" />
                    <div>
                      <p className="text-sm font-bold text-zinc-300">
                        Unranked
                      </p>
                      <p className="text-xs text-zinc-400">0 points</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  Each rank is{" "}
                  <strong className="text-zinc-200">exclusive</strong> per judge
                  &mdash; only one team can be 1st, one 2nd, and one 3rd per
                  assignment. Judges can also leave optional{" "}
                  <strong className="text-zinc-200">comments</strong> on each
                  team.
                </p>
              </div>
            </div>
            <ScoreEntryDemo />
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 5.5: MONITORING VIEWS ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-lg font-bold text-white shadow-lg shadow-sky-500/30">
              <Eye className="size-5" />
            </span>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Monitoring Views & Dashboards
            </h2>
          </div>
          <Card className="mb-2 space-y-6">
            <p className="text-zinc-300">
              While judging is in progress, Podium provides several real-time
              views to monitor the state of your event at every level.
            </p>

            {/* Floor Dashboard */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <Building2 className="size-5 text-orange-400" /> Floor
                Dashboards
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Each floor gets its own dedicated dashboard tab in the navbar.
                This is your primary view during active judging.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Judge Panel (Left Side)
                  </h4>
                  <ul className="ml-4 list-disc space-y-1.5 text-sm text-zinc-400">
                    <li>
                      See all judges on this floor with real-time{" "}
                      <strong className="text-zinc-200">status badges</strong>:{" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                        <Clock className="size-2.5" /> Busy
                      </span>{" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400">
                        Assignable
                      </span>{" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-xs text-sky-400">
                        Finished
                      </span>
                    </li>
                    <li>
                      Search judges by name, filter by status, and sort by name
                      or completed assignments
                    </li>
                    <li>
                      See each busy judge&apos;s{" "}
                      <strong className="text-zinc-200">
                        actively assigned teams
                      </strong>{" "}
                      listed as badges
                    </li>
                    <li>
                      Track{" "}
                      <strong className="text-zinc-200">
                        how many teams each judge has reviewed
                      </strong>{" "}
                      out of the total on the floor
                    </li>
                    <li>
                      Click{" "}
                      <strong className="text-zinc-200">Enter Scores</strong> on
                      any busy judge to immediately open the scoring form
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Team Grid (Right Side)
                  </h4>
                  <ul className="ml-4 list-disc space-y-1.5 text-sm text-zinc-400">
                    <li>
                      Cards for every active team showing review count and
                      assigned judge avatars
                    </li>
                    <li>
                      <strong className="text-zinc-200">Filter</strong> teams by
                      All / Assigned / Unassigned
                    </li>
                    <li>
                      <strong className="text-zinc-200">Sort</strong> by team
                      number, most seen, or least seen
                    </li>
                    <li>
                      Click any team card to see its full{" "}
                      <strong className="text-zinc-200">
                        score detail breakdown
                      </strong>
                    </li>
                    <li>
                      <strong className="text-zinc-200">Pause</strong> or
                      unpause teams that leave early or have issues
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Judge Details Modal */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <SlidersHorizontal className="size-5 text-orange-400" /> Judge
                Details Modal
              </h3>
              <p className="mb-3 text-sm text-zinc-400">
                Click the{" "}
                <span className="inline-flex items-center gap-1 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-white">
                  <SlidersHorizontal className="size-3" /> settings
                </span>{" "}
                icon on any judge to open their detailed view.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-amber-300">
                    Currently Evaluating
                  </h4>
                  <p className="text-xs text-zinc-400">
                    See the exact teams the judge is currently assigned to.
                    Remove individual teams from the assignment, or cancel the
                    entire assignment.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-emerald-300">
                    Completed History
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Full list of all teams this judge has already reviewed, with
                    their total completed assignment count.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-sky-300">
                    Move to Another Floor
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Reassign a judge to a different floor (one-time switch). Only
                    available when the judge has no active assignment.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Status Matrix */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <LayoutGrid className="size-5 text-orange-400" /> Team Status
                Matrix
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Click the{" "}
                <span className="inline-flex items-center gap-1 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-white">
                  <LayoutGrid className="size-3" /> grid
                </span>{" "}
                icon on the Floor Dashboard or the Assignment Dashboard to open a
                bird&apos;s-eye view of all teams on a floor.
              </p>
              {/* Mock matrix visualization */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  <span className="font-semibold text-zinc-300">Legend:</span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="inline-block size-5 rounded-full bg-zinc-700" />{" "}
                    Not Seen
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="inline-block size-5 rounded-full bg-orange-900" />
                    <span className="inline-block size-5 rounded-full bg-orange-700" />
                    <span className="inline-block size-5 rounded-full bg-orange-500" />{" "}
                    Seen (intensity = review count)
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="relative inline-block size-5 rounded-full bg-orange-600">
                      <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-900 bg-cyan-400" />
                    </span>{" "}
                    Actively Assigned
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 24 }, (_, i) => {
                    const seenValues = [0, 3, 1, 2, 0, 4, 1, 0, 3, 2, 1, 0, 2, 3, 0, 1, 4, 2, 0, 1, 3, 0, 2, 1];
                    const seen = seenValues[i] ?? 0;
                    const isActive = [2, 5, 9, 16].includes(i);
                    const lightness = seen === 0 ? 0 : 25 + ((seen - 1) / 3) * 35;
                    return (
                      <div
                        key={i}
                        className="relative flex size-8 items-center justify-center rounded-full border border-white/10"
                        style={{
                          backgroundColor:
                            seen === 0
                              ? "rgb(63 63 70 / 0.8)"
                              : `hsl(24, 95%, ${lightness}%)`,
                        }}
                      >
                        <span className="text-xs font-bold text-white/50">
                          {i + 1}
                        </span>
                        {isActive && (
                          <span className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-900 bg-cyan-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Each dot represents a team. Hover over any dot to see team
                  details, review count, and active assignment status.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <LayoutGrid className="mt-0.5 size-4 flex-shrink-0 text-sky-400" />
                <p className="text-sm text-zinc-400">
                  <strong className="text-sky-300">Per-Judge Matrix:</strong> You
                  can also view a judge-specific matrix by clicking the grid icon
                  on an individual judge. This shows only the assignments
                  belonging to that judge, so you can see exactly which teams
                  they&apos;ve covered.
                </p>
              </div>
            </div>
          </Card>
        </motion.section>

        <FlowConnector />

        {/* ─── STEP 6 ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          <SectionTitle
            step={6}
            title="View Results & Export"
            icon={<FileSpreadsheet className="size-6" />}
          />
          <Card className="mb-2 space-y-4">
            <div className="space-y-3 text-zinc-300">
              <p>
                The{" "}
                <span className="font-semibold text-orange-400">Results</span>{" "}
                page gives you a complete overview of all scores.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 font-semibold text-white">
                    Leaderboard View
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Teams ranked by{" "}
                      <strong className="text-zinc-200">average score</strong>
                    </li>
                    <li>See high, low, and average scores per team</li>
                    <li>Filter by floor, search by name or number</li>
                    <li>Sort by average, high, low, or team number</li>
                    <li>Click any team to see detailed score breakdown</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/30 p-4">
                  <h4 className="mb-2 font-semibold text-white">
                    Matrix View
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>Teams vs. Judges grid showing who reviewed whom</li>
                    <li>Quickly spot gaps in coverage</li>
                    <li>Exportable as CSV for external analysis</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <Download className="mt-0.5 size-4 flex-shrink-0 text-blue-400" />
                <p className="text-sm text-zinc-400">
                  <strong className="text-blue-300">Export:</strong> Both the
                  leaderboard and matrix can be exported as{" "}
                  <strong className="text-zinc-200">CSV files</strong> for
                  sharing with organizers, sponsors, or for recordkeeping.
                </p>
              </div>
            </div>
            <ResultsDemo />
          </Card>
        </motion.section>

        {/* ─── Tips & Tricks ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16"
        >
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-lg font-bold text-white shadow-lg shadow-emerald-500/30">
              ?
            </span>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Tips & Best Practices
            </h2>
          </div>
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <h4 className="mb-1 font-semibold text-white">
                    Before the Event
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Create your event and set up all floors with the correct
                      team ranges
                    </li>
                    <li>Add all judges and assign them to floors in advance</li>
                    <li>
                      Generate or import teams once table assignments are
                      finalized
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <h4 className="mb-1 font-semibold text-white">
                    During Judging
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Use <strong className="text-zinc-200">Auto Mode</strong>{" "}
                      to quickly assign judges in rounds
                    </li>
                    <li>
                      Monitor judge statuses on the Assignment Dashboard
                    </li>
                    <li>
                      Use{" "}
                      <strong className="text-zinc-200">
                        Floor Dashboards
                      </strong>{" "}
                      for a per-floor view of progress
                    </li>
                    <li>
                      Pause teams that leave early or have issues
                    </li>
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <h4 className="mb-1 font-semibold text-white">
                    Scoring Tips
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Judges should rank their{" "}
                      <strong className="text-zinc-200">
                        top 3 out of 5
                      </strong>{" "}
                      teams per assignment
                    </li>
                    <li>
                      Encourage judges to leave comments for the top teams
                    </li>
                    <li>
                      Scores update in real-time across all connected devices
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-4">
                  <h4 className="mb-1 font-semibold text-white">
                    After Judging
                  </h4>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-400">
                    <li>
                      Check the{" "}
                      <strong className="text-zinc-200">Results</strong> page
                      for the final leaderboard
                    </li>
                    <li>
                      Use the Matrix view to verify all teams were reviewed
                    </li>
                    <li>Export CSVs for your records before closing the event</li>
                    <li>
                      Click on individual teams to see their full review
                      breakdown
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ─── ALGORITHM DEEP DIVE ─── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16"
        >
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-violet-500/30">
              <Cpu className="size-5" />
            </span>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              How the Assignment Algorithm Works
            </h2>
          </div>
          <Card className="space-y-8">
            <p className="text-zinc-300">
              When you click{" "}
              <strong className="text-orange-400">
                Generate &amp; Assign
              </strong>
              , Podium runs a multi-pass algorithm that distributes teams across
              judges as fairly and spread-out as possible. Here&apos;s a breakdown
              of every step.
            </p>

            {/* Step 1: Shuffle */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  1
                </span>
                <Shuffle className="size-5 text-violet-400" />
                Shuffle Judge Order
              </h3>
              <p className="text-sm text-zinc-400">
                The selected judges are{" "}
                <strong className="text-zinc-200">
                  randomly shuffled
                </strong>{" "}
                using the Fisher-Yates algorithm before any assignments are made.
                This prevents the same judges from always getting &quot;first
                pick&quot; of the best teams, and ensures fairness across
                multiple rounds of assignment.
              </p>
            </div>

            {/* Step 2: Exclusive vs Overlap */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  2
                </span>
                <Layers className="size-5 text-violet-400" />
                Detect Exclusive vs. Overlap Mode
              </h3>
              <p className="mb-3 text-sm text-zinc-400">
                The algorithm checks whether there are enough teams for each
                judge to get an entirely unique block of 5:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4">
                  <h4 className="mb-1 text-sm font-semibold text-emerald-300">
                    Exclusive Mode
                  </h4>
                  <p className="text-xs text-zinc-400">
                    When{" "}
                    <code className="rounded bg-zinc-800 px-1 py-0.5 text-emerald-300">
                      floor(availableTeams / 5) &ge; numJudges
                    </code>
                    , each judge&apos;s 5 teams are{" "}
                    <strong className="text-zinc-200">
                      locked exclusively
                    </strong>{" "}
                    &mdash; no two judges in the same batch see the same team.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-4">
                  <h4 className="mb-1 text-sm font-semibold text-amber-300">
                    Overlap Mode
                  </h4>
                  <p className="text-xs text-zinc-400">
                    When there aren&apos;t enough teams for exclusive blocks,
                    overlap is allowed. Instead of locking teams, the algorithm
                    uses a{" "}
                    <strong className="text-zinc-200">pressure map</strong> to
                    minimize how many judges see the same team.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Candidate Selection */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  3
                </span>
                <Target className="size-5 text-violet-400" />
                Build Candidate Pool per Judge
              </h3>
              <p className="mb-3 text-sm text-zinc-400">
                For each judge, the algorithm filters out teams they&apos;ve
                already reviewed in prior submitted assignments. This creates
                their{" "}
                <strong className="text-zinc-200">candidate pool</strong> of
                teams they haven&apos;t yet seen.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-400">
                <code>
{`// For each judge:
`}<span className="text-violet-400">candidateTeams</span>{` = `}<span className="text-zinc-300">allTeamsOnFloor</span>{`
  .filter(team => `}<span className="text-rose-400">!</span>{`judge.alreadyJudged.includes(team))
  .filter(team => `}<span className="text-rose-400">!</span>{`lockedByOtherJudge(team))

// If fewer than 5 candidates remain, judge is skipped ("Finished")`}
                </code>
              </pre>
            </div>

            {/* Step 4: Two-Pass Scoring */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  4
                </span>
                <Zap className="size-5 text-violet-400" />
                Two-Pass Window Scoring
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                The algorithm slides a window of 5 consecutive teams across the
                candidate pool and scores each possible block. It uses a{" "}
                <strong className="text-zinc-200">two-pass</strong> approach:
              </p>

              {/* Pass descriptions */}
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-violet-500/10 bg-violet-500/5 p-4">
                  <h4 className="mb-2 text-sm font-bold text-violet-300">
                    Pass 1: Strict
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Finds the best block that does{" "}
                    <strong className="text-zinc-200">not</strong> share 4 or
                    more teams with any existing assignment (submitted or active).
                    This prevents judges from seeing nearly identical groups.
                  </p>
                </div>
                <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-4">
                  <h4 className="mb-2 text-sm font-bold text-orange-300">
                    Pass 2: Relaxed
                  </h4>
                  <p className="text-xs text-zinc-400">
                    If Pass 1 finds nothing (all blocks are too similar), re-runs
                    without the similarity check. This ensures every judge gets{" "}
                    <strong className="text-zinc-200">something</strong>, even if
                    it overlaps more.
                  </p>
                </div>
              </div>

              {/* Scoring formula */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-5">
                <h4 className="mb-3 text-sm font-bold text-white">
                  Scoring Formula
                </h4>
                <p className="mb-3 text-sm text-zinc-400">
                  Each candidate window of 5 teams is scored. The{" "}
                  <strong className="text-zinc-200">lowest score wins</strong>:
                </p>

                {/* Formula display */}
                <div className="mb-4 rounded-lg bg-zinc-950 p-4 text-center font-mono">
                  <p className="text-lg text-white">
                    <span className="text-orange-400">totalScore</span> ={" "}
                    <span className="text-sky-400">pressureScore</span>{" "}
                    <span className="text-zinc-500">&times;</span>{" "}
                    <span className="text-amber-400">1000</span>{" "}
                    <span className="text-zinc-500">+</span>{" "}
                    <span className="text-emerald-400">closenessPenalty</span>
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-sky-500/10 bg-sky-500/5 p-4">
                    <h5 className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-xs font-bold text-sky-400">
                        P
                      </span>
                      Pressure Score
                    </h5>
                    <p className="mb-2 text-xs text-zinc-400">
                      Sum of review counts for all 5 teams in the window:
                    </p>
                    <div className="rounded bg-zinc-950 p-2 font-mono text-xs text-sky-300">
                      pressureScore = team1.reviews + team2.reviews + ... +
                      team5.reviews
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      This ensures judges are sent to teams that have been{" "}
                      <strong className="text-zinc-300">
                        reviewed the fewest times
                      </strong>
                      , balancing coverage across all teams.
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4">
                    <h5 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-xs font-bold text-emerald-400">
                        C
                      </span>
                      Closeness Penalty
                    </h5>
                    <p className="mb-2 text-xs text-zinc-400">
                      The spread of team numbers within the window:
                    </p>
                    <div className="rounded bg-zinc-950 p-2 font-mono text-xs text-emerald-300">
                      closenessPenalty = lastTeam.number -
                      firstTeam.number
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Prefers tightly grouped teams so judges don&apos;t have to
                      walk far between adjacent tables. A block of teams 5-9
                      scores{" "}
                      <strong className="text-zinc-300">4</strong> (closeness),
                      while 5-20 scores{" "}
                      <strong className="text-zinc-300">15</strong>.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                  <Zap className="mt-0.5 size-4 flex-shrink-0 text-violet-400" />
                  <p className="text-sm text-zinc-400">
                    <strong className="text-violet-300">
                      Why multiply pressure by 1000?
                    </strong>{" "}
                    This ensures review balance is{" "}
                    <strong className="text-zinc-200">
                      always prioritized
                    </strong>{" "}
                    over physical closeness. A block with fewer total reviews will
                    always beat a closer block that has more reviews. The
                    closeness penalty is only a tiebreaker.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5: Spread Logic */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  5
                </span>
                <Shuffle className="size-5 text-violet-400" />
                Spread Logic: Shuffled Search Order
              </h3>
              <p className="mb-3 text-sm text-zinc-400">
                To prevent assignments from clustering at the beginning of the
                team list, the algorithm{" "}
                <strong className="text-zinc-200">
                  shuffles the order it searches through window positions
                </strong>
                . Instead of always checking windows starting at team 1, then
                team 2, etc., it randomizes which starting positions are
                evaluated first.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-400">
                <code>
{`// Instead of checking windows [0,1,2,3,4,5...]
// We shuffle to [4,1,5,0,3,2...] so the search
// doesn't always favor early team numbers

`}<span className="text-violet-400">shuffledIndices</span>{` = `}<span className="text-zinc-300">{`shuffle([0, 1, 2, ..., candidateTeams.length - 5])`}</span>
                </code>
              </pre>
              <p className="mt-3 text-sm text-zinc-400">
                When multiple windows have the{" "}
                <strong className="text-zinc-200">same score</strong>, the first
                one found (in the shuffled order) wins. This means even when all
                teams have zero reviews, the assignments will be naturally spread
                out across the floor.
              </p>
            </div>

            {/* Step 6: Reversal & Locks */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  6
                </span>
                <ArrowRightLeft className="size-5 text-violet-400" />
                Overlap Reversal &amp; Team Locking
              </h3>
              <p className="mb-3 text-sm text-zinc-400">
                After selecting a block of 5 teams for a judge, two final
                safeguards kick in:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-orange-300">
                    Reversal (Overlap Mode)
                  </h4>
                  <p className="text-xs text-zinc-400">
                    If two judges in the same batch get the same 5-team block
                    (only possible in overlap mode), the second judge&apos;s block
                    is{" "}
                    <strong className="text-zinc-200">reversed</strong>. So if
                    Judge A visits teams 5→6→7→8→9, Judge B visits 9→8→7→6→5.
                    This prevents judges from colliding at the same table at the
                    same time.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-emerald-300">
                    Team Locking (Exclusive Mode)
                  </h4>
                  <p className="text-xs text-zinc-400">
                    In exclusive mode, once a block of 5 teams is assigned to a
                    judge, those teams are{" "}
                    <strong className="text-zinc-200">locked</strong> for the
                    rest of the batch. No other judge in this round can be
                    assigned overlapping teams.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 7: Batch Deduplication */}
            <div className="rounded-xl border border-white/5 bg-zinc-800/30 p-5">
              <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-400">
                  7
                </span>
                <Sparkles className="size-5 text-violet-400" />
                Cross-Batch Deduplication
              </h3>
              <p className="text-sm text-zinc-400">
                Every newly assigned block within the same batch is added to the
                list of{" "}
                <strong className="text-zinc-200">
                  existing block signatures
                </strong>{" "}
                before the next judge is processed. This means each subsequent
                judge in the batch also avoids blocks that overlap &ge; 4 teams
                with blocks assigned earlier in the{" "}
                <strong className="text-zinc-200">same</strong> generate
                operation, not just historical ones. The result: maximum team
                coverage diversity across all judges.
              </p>
            </div>

            {/* Visual summary */}
            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-5">
              <h3 className="mb-4 text-center text-lg font-bold text-white">
                Algorithm Summary
              </h3>
              <div className="flex flex-wrap justify-center gap-2 text-xs font-medium">
                {[
                  { label: "Shuffle Judges", color: "bg-violet-500/20 text-violet-300 border-violet-500/20" },
                  { label: "Detect Mode", color: "bg-sky-500/20 text-sky-300 border-sky-500/20" },
                  { label: "Build Candidates", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
                  { label: "Score Windows", color: "bg-orange-500/20 text-orange-300 border-orange-500/20" },
                  { label: "Strict Pass", color: "bg-violet-500/20 text-violet-300 border-violet-500/20" },
                  { label: "Relaxed Pass", color: "bg-amber-500/20 text-amber-300 border-amber-500/20" },
                  { label: "Lock / Reverse", color: "bg-rose-500/20 text-rose-300 border-rose-500/20" },
                  { label: "Commit", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <span
                      className={`rounded-full border px-3 py-1.5 ${step.color}`}
                    >
                      {step.label}
                    </span>
                    {i < 7 && (
                      <span className="flex items-center text-zinc-600">
                        →
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ─── CTA ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 mb-8 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-3 text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50"
          >
            <Trophy className="size-5" />
            Get Started with Podium
          </Link>
          <p className="mt-4 text-sm text-zinc-500">
            Ready to organize your hackathon? Head back and create your first
            event.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
