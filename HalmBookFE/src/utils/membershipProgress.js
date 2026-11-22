// Missing summaries are unknown, never a zero-progress member account.
export function membershipProgress(summary, level = 1) {
  if (!summary) return null;
  const thresholds = { 1: [10, 500], 2: [50, 2500], 3: [150, 10000] };
  const [booksTarget, pointsTarget] = thresholds[level] || [150, 10000];
  const booksRequired = summary.booksRequiredForNext ?? booksTarget;
  const pointsRequired = summary.pointsRequiredForNext ?? pointsTarget;
  const books = summary.booksReadCount ?? 0;
  const points = summary.totalPoints ?? 0;
  const maxTier = level >= 4;
  const percent = maxTier ? 100 : summary.overallProgressPercent ?? Math.max(
    booksRequired > 0 ? books / booksRequired * 100 : 0,
    pointsRequired > 0 ? points / pointsRequired * 100 : 0,
  );
  return {
    booksRequired,
    booksRemaining: maxTier ? 0 : Math.max(0, summary.booksRemainingForNext ?? booksRequired - books),
    pointsRemaining: maxTier ? 0 : Math.max(0, summary.pointsRemainingForNext ?? pointsRequired - points),
    percent: Math.min(100, Math.max(0, percent)),
  };
}
