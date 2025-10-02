import { useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase/config";
import type { Event, Team, Floor } from "../lib/types";

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Fetches all necessary data for a specific event and compiles it into a CSV file for download.
   * @param event The event object to export data for.
   * @param sortBy The criteria to sort the final results by.
   */
  const exportToCSV = async (
    event: Event,
    sortBy: "averageScore" | "name" = "averageScore",
  ) => {
    if (!event) return;
    setIsExporting(true);

    try {
      // 1. Fetch all teams and floors for the specified event
      const teamsSnapshot = await getDocs(
        query(collection(db, `events/${event.id}/teams`)),
      );
      const floorsSnapshot = await getDocs(
        query(collection(db, `events/${event.id}/floors`)),
      );

      const teams: Team[] = teamsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Team,
      );
      const floors: Floor[] = floorsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Floor,
      );
      const floorsMap = new Map(floors.map((f) => [f.id, f.name]));

      // 2. Sort the data as requested
      const sortedTeams = [...teams].sort((a, b) => {
        if (sortBy === "averageScore") {
          return b.averageScore - a.averageScore;
        }
        return a.name.localeCompare(b.name);
      });

      // 3. Build CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent +=
        "Rank,Team Name,Average Score,Total Score,Review Count,Floor\r\n";

      sortedTeams.forEach((team, index) => {
        const floorName = floorsMap.get(team.floorId) || "N/A";
        const rank = sortBy === "averageScore" ? index + 1 : "N/A";
        const row = [
          rank,
          `"${team.name.replace(/"/g, '""')}"`, // Handle quotes in names
          team.averageScore.toFixed(2),
          team.totalScore,
          team.reviewedBy.length,
          floorName,
        ].join(",");
        csvContent += row + "\r\n";
      });

      // 4. Trigger the download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${event.name}_results.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      // You could add a showToast call here if you pass it into the hook
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToCSV, isExporting };
};
