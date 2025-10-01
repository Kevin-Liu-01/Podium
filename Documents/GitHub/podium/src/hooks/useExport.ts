import { useAppContext } from "../context/AppContext";

export const useExport = () => {
  const { projects, rooms, floors, currentEvent } = useAppContext();
  const exportToCSV = (sortBy: "averageScore" | "name" = "averageScore") => {
    const sorted = [...projects].sort((a, b) => {
      if (sortBy === "averageScore") return b.averageScore - a.averageScore;
      return a.name.localeCompare(b.name);
    });

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent +=
      "Rank,Project Name,Average Score,Total Score,Review Count,Room,Floor\r\n";

    sorted.forEach((p, index) => {
      const room = rooms.find((r) => r.id === p.roomId);
      const floor = floors.find((f) => f.id === room?.floorId);
      const rank = sortBy === "averageScore" ? index + 1 : "N/A";
      const row = [
        rank,
        `"${p.name.replace(/"/g, '""')}"`,
        p.averageScore.toFixed(2),
        p.totalScore,
        p.reviewedBy.length,
        room?.number || "N/A",
        floor?.name || "N/A",
      ]
        .map(String)
        .join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentEvent?.name}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportToCSV };
};
