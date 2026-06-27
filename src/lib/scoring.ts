import { Match, Pick, Outcome, Predictor, LeaderboardEntry } from './types';

export function getOutcomeFromResult(result: { home: number; away: number }): Outcome {
  if (result.home > result.away) return 'home';
  if (result.home < result.away) return 'away';
  return 'draw';
}

export function scorePick(pick: Pick, match: Match): number {
  if (match.status !== 'final' || !match.result) return 0;

  const actualOutcome = getOutcomeFromResult(match.result);
  let points = 0;

  if (pick.outcome === actualOutcome) {
    points += 3;
    if (
      pick.score &&
      pick.score.home === match.result.home &&
      pick.score.away === match.result.away
    ) {
      points += 2;
    }
  }

  return points;
}

export function buildLeaderboard(
  predictors: Predictor[],
  picks: Pick[],
  matches: Match[]
): LeaderboardEntry[] {
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return predictors
    .map((predictor) => {
      const predictorPicks = picks.filter((p) => p.predictorId === predictor.id);
      let points = 0;
      let correctOutcomes = 0;
      let exactScores = 0;

      for (const pick of predictorPicks) {
        const match = matchMap.get(pick.matchId);
        if (!match || match.status !== 'final' || !match.result) continue;

        const actualOutcome = getOutcomeFromResult(match.result);
        if (pick.outcome === actualOutcome) {
          correctOutcomes++;
          points += 3;
          if (
            pick.score &&
            pick.score.home === match.result.home &&
            pick.score.away === match.result.away
          ) {
            exactScores++;
            points += 2;
          }
        }
      }

      return {
        predictor,
        points,
        correctOutcomes,
        exactScores,
        totalPicks: predictorPicks.length,
      };
    })
    .sort((a, b) => b.points - a.points || b.exactScores - a.exactScores);
}

export function isProphetMoment(pick: Pick, match: Match): boolean {
  if (!match.result) return false;
  const actualOutcome = getOutcomeFromResult(match.result);
  if (pick.outcome !== actualOutcome) return false;

  // Upset detection: away team wins or draw in a match where home is expected to win
  // For simplicity, we consider any correct "away" or "draw" prediction + exact score as prophet-worthy
  if (pick.outcome === 'away' && pick.score &&
      pick.score.home === match.result.home &&
      pick.score.away === match.result.away) {
    return true;
  }
  // Exact score on any draw
  if (pick.outcome === 'draw' && pick.score &&
      pick.score.home === match.result.home &&
      pick.score.away === match.result.away) {
    return true;
  }
  return false;
}
