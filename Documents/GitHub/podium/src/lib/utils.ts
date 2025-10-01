const JUDGE_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-fuchsia-500",
  "bg-rose-500",
];

export const getColorForJudge = (judgeId: string): string => {
  let hash = 0;
  for (let i = 0; i < judgeId.length; i++) {
    hash = judgeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % JUDGE_COLORS.length);
  return JUDGE_COLORS[index];
};
