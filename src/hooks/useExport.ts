"use client";
import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import type { Team, Floor, Judge } from "../lib/types";

// Helper to escape CSV fields
const escapeCSV = (field: any): string => {
  const str = String(field ?? "N/A");
  // Replace all quotes with double quotes
  const escapedStr = str.replace(/"/g, '""');
  // If it contains a comma, newline, or quote, wrap it in quotes
  if (/[",\n]/.test(escapedStr)) {
    return `"${escapedStr}"`;
  }
  return escapedStr;
};

// Helper to trigger the download
const triggerCSVDownload = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const useExport = () => {
  const { teams, floors, judges, assignments, showToast } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);

  // Pre-process maps for efficiency
  const floorMap = new Map<string, Floor>(
    floors.map((floor) => [floor.id, floor]),
  );
  const judgeMap = new Map<string, Judge>(
    judges.map((judge) => [judge.id, judge]),
  );

  /**
   * Generates and exports the leaderboard CSV.
   * @param teamsToExport - An optional array of filtered/sorted teams. Defaults to ALL teams.
   * @param filename - An optional filename for the download.
   */
  const exportLeaderboard = async (
    teamsToExport: Team[] = teams,
    filename: string = "leaderboard_results.csv",
  ) => {
    setIsExporting(true);
    try {
      // Calculate ranks for the provided teams
      const teamsSortedForRanking = [...teamsToExport].sort((a, b) => {
        const scoreDiff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.number ?? 0) - (b.number ?? 0);
      });
      const rankMap = new Map<string, number>();
      teamsSortedForRanking.forEach((team, index) =>
        rankMap.set(team.id, index),
      );

      const headers = [
        "Rank",
        "Team Name",
        "Team #",
        "Floor",
        "Reviews",
        "Comment Count",
        "All Comments",
        "High Score",
        "Low Score",
        "Average Score",
      ];
      let csvContent = headers.map(escapeCSV).join(",") + "\n";

      for (const team of teamsToExport) {
        const rank = rankMap.get(team.id);
        const rankDisplay = typeof rank !== "undefined" ? rank + 1 : "N/A";
        const floorName = floorMap.get(team.floorId)?.name || "N/A";
        const scores = team.reviewedBy?.map((r) => r.score) || [];
        const high = scores.length ? Math.max(...scores).toFixed(2) : "N/A";
        const low = scores.length ? Math.min(...scores).toFixed(2) : "N/A";
        const avg = (team.averageScore ?? 0).toFixed(2);
        const reviews = team.reviewedBy?.length ?? 0;
        const commentCount = (team.reviewedBy || []).filter(
          (r) => r.comments && r.comments.trim() !== "",
        ).length;

        const allCommentsString = (team.reviewedBy || [])
          .filter((r) => r.comments && r.comments.trim() !== "")
          .map((r) => {
            const judgeName = judgeMap.get(r.judgeId)?.name || "Unknown";
            // Format as [Judge]: [Comment]
            const commentText = r.comments.replace(/"/g, '""');
            return `[${judgeName}]: ${commentText}`;
          })
          .join("\n");

        const row = [
          rankDisplay,
          team.name,
          team.number,
          floorName,
          reviews,
          commentCount,
          allCommentsString,
          high,
          low,
          avg,
        ];
        csvContent += row.map(escapeCSV).join(",") + "\n";
      }

      triggerCSVDownload(csvContent, filename);
      showToast("Export successful!", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Export failed. See console for details.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Generates and exports the review matrix CSV.
   * @param filename - An optional filename for the download.
   */
  const exportMatrix = async (filename: string = "review_matrix.csv") => {
    setIsExporting(true);
    try {
      const sortedTeamsForMatrix = [...teams].sort(
        (a, b) => a.number - b.number,
      );
      const sortedJudgesForMatrix = [...judges].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const reviewMap = new Map<string, Set<string>>();
      for (const team of sortedTeamsForMatrix) {
        reviewMap.set(team.id, new Set());
      }
      const submittedAssignments = assignments.filter((a) => a.submitted);
      for (const assignment of submittedAssignments) {
        const judgeId = assignment.judgeId;
        for (const teamId of assignment.teamIds) {
          if (reviewMap.has(teamId)) {
            reviewMap.get(teamId)!.add(judgeId);
          }
        }
      }

      const headers = [
        "Team #",
        "Team Name",
        ...sortedJudgesForMatrix.map((j) => j.name),
      ];
      let csvContent = headers.map(escapeCSV).join(",") + "\n";

      for (const team of sortedTeamsForMatrix) {
        const row: (string | number)[] = [team.number, team.name];
        const reviewedBy = reviewMap.get(team.id) || new Set();
        for (const judge of sortedJudgesForMatrix) {
          row.push(reviewedBy.has(judge.id) ? "1" : "0");
        }
        csvContent += row.map(escapeCSV).join(",") + "\n";
      }

      triggerCSVDownload(csvContent, filename);
      showToast("Export successful!", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Export failed. See console for details.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportLeaderboard, exportMatrix };
};
