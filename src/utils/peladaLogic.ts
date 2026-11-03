import {
  Championship,
  ChampionshipMatch,
  CoinTossState,
  DrawnTeam,
  MatchRules,
  Player,
  RiggingConfig,
  StandingRow,
  TopScorerRow,
} from '../types/pelada';

export const TEAM_PALETTE = [
  { name: 'Time Verde Esmeralda', shortName: 'ESM', accentHex: '#10B981' },
  { name: 'Time Azul Royal', shortName: 'AZU', accentHex: '#3B82F6' },
  { name: 'Time Amarelo Ouro', shortName: 'OUR', accentHex: '#F59E0B' },
  { name: 'Time Vermelho Coral', shortName: 'VER', accentHex: '#EF4444' },
  { name: 'Time Branco Ártico', shortName: 'BRA', accentHex: '#E2E8F0' },
  { name: 'Time Laranja Fogo', shortName: 'LAR', accentHex: '#F97316' },
];

export const DEFAULT_RULES: MatchRules = {
  linePlayersPerTeam: 5, // Society padrão: 5 na linha + 1 no gol
  goalkeepersPerTeam: 1,
  durationMinutes: 10,
  goalLimit: 2,
  extraTimeMinutes: 0,
  autoRotateWinnerStays: true,
};

export const INITIAL_PLAYERS: Player[] = [
  { id: 'p-1', name: 'Vitor (Você)', isGoalkeeper: false, rating: 5, isHost: true, confirmed: true },
  { id: 'p-2', name: 'Matheus Muralha', isGoalkeeper: true, rating: 5, confirmed: true },
  { id: 'p-3', name: 'Cássio Luva', isGoalkeeper: true, rating: 4, confirmed: true },
  { id: 'p-4', name: 'Julio Cesar', isGoalkeeper: true, rating: 4, confirmed: true },
  { id: 'p-5', name: 'Lucas Paquetá', isGoalkeeper: false, rating: 5, confirmed: true },
  { id: 'p-6', name: 'Gabriel Jesus', isGoalkeeper: false, rating: 5, confirmed: true },
  { id: 'p-7', name: 'Bruno Guimarães', isGoalkeeper: false, rating: 5, confirmed: true },
  { id: 'p-8', name: 'Rafinha Canhota', isGoalkeeper: false, rating: 5, confirmed: true },
  { id: 'p-9', name: 'Thiago Silva', isGoalkeeper: false, rating: 4, confirmed: true },
  { id: 'p-10', name: 'Danilo Lateral', isGoalkeeper: false, rating: 4, confirmed: true },
  { id: 'p-11', name: 'Pedro Queixada', isGoalkeeper: false, rating: 4, confirmed: true },
  { id: 'p-12', name: 'Marquinhos Zaga', isGoalkeeper: false, rating: 4, confirmed: true },
  { id: 'p-13', name: 'André Volante', isGoalkeeper: false, rating: 3, confirmed: true },
  { id: 'p-14', name: 'Everton Cebolinha', isGoalkeeper: false, rating: 3, confirmed: true },
  { id: 'p-15', name: 'Gerson Coringa', isGoalkeeper: false, rating: 4, confirmed: true },
  { id: 'p-16', name: 'Caio Paulista', isGoalkeeper: false, rating: 3, confirmed: true },
  { id: 'p-17', name: 'Léo Pereira', isGoalkeeper: false, rating: 3, confirmed: true },
  { id: 'p-18', name: 'Arrascaeta', isGoalkeeper: false, rating: 5, confirmed: true },
];

/**
 * Parses a raw WhatsApp or plain-text player list into structured Line Players and Goalkeepers.
 * Handles numbered lists ("1. Nome", "02 - Nome"), section headers ("GOLEIROS:", "LINHA:"),
 * inline tags ("(Goleiro)", "(GK)", "🧤"), and star ratings ("⭐️⭐️⭐️⭐️⭐️" or "(5)").
 */
export function parseWhatsAppList(rawText: string): {
  linePlayers: Omit<Player, 'id'>[];
  goalkeepers: Omit<Player, 'id'>[];
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const linePlayers: Omit<Player, 'id'>[] = [];
  const goalkeepers: Omit<Player, 'id'>[] = [];

  let currentSection: 'line' | 'gk' | 'ignore' = 'line';

  const ignoreHeaderRegex =
    /^(pelada|futebol|society|data|hor[aá]rio|local|valor|pix|regras|mensalistas|confirmados|lista de presen[cç]a)/i;
  const gkSectionRegex = /^(goleiros?|gol|gk| arqueiros?)[:\s-]*$/i;
  const lineSectionRegex = /^(linha|jogadores de linha|atletas|linha confirmados)[:\s-]*$/i;
  const waitlistSectionRegex = /^(espera|lista de espera|suplentes|fora|desistentes)[:\s-]*$/i;

  for (const rawLine of lines) {
    const cleanHeaderCheck = rawLine.replace(/[⚽️🧤🔥✅📋🏆*-]/g, '').trim();
    if (!cleanHeaderCheck) continue;

    if (gkSectionRegex.test(cleanHeaderCheck)) {
      currentSection = 'gk';
      continue;
    }
    if (lineSectionRegex.test(cleanHeaderCheck)) {
      currentSection = 'line';
      continue;
    }
    if (waitlistSectionRegex.test(cleanHeaderCheck)) {
      currentSection = 'ignore';
      continue;
    }

    // Skip metadata lines like "Data: 10/11", "Local: Arena Society", "Valor: R$ 25"
    if (
      ignoreHeaderRegex.test(cleanHeaderCheck) &&
      ! /^\d+[\s.)-]+/.test(rawLine)
    ) {
      continue;
    }

    // Count stars if provided
    const starMatches = rawLine.match(/[⭐★]/g);
    const explicitRatingMatch = rawLine.match(/\((\d)\s*estrelas?\)|\[(\d)\]/i);
    let rating = 4;
    if (starMatches && starMatches.length >= 1) {
      rating = Math.min(5, Math.max(1, starMatches.length));
    } else if (explicitRatingMatch) {
      const parsed = Number(explicitRatingMatch[1] || explicitRatingMatch[2]);
      rating = Math.min(5, Math.max(1, parsed));
    }

    // Check inline goalkeeper markers (explicit tags or emoji, not surname "Gol")
    const inlineGkRegex =
      /\((goleiro|gol|gk|g)\)|\[(goleiro|gol|gk|g)\]|[-–:]\s*(goleiro|gk)\b|🧤/i;
    const isGk = currentSection === 'gk' || inlineGkRegex.test(rawLine);

    // Strip numbering, bullets, emojis, inline gk tags
    let cleanedName = rawLine
      .replace(/^\s*\d+\s*[.)-:]+\s*/, '')
      .replace(/^\s*[-•*👉✅⚽️🧤]+\s*/, '')
      .replace(/\((goleiro|gol|gk|g|confirmado|pago|ok)\)/gi, '')
      .replace(/\[(goleiro|gol|gk|g)\]/gi, '')
      .replace(/[-–:]\s*(goleiro|gk)\b/gi, '')
      .replace(/[⭐★✅🧤⚽️🔥💰✔️]+/g, '')
      .replace(/\(\d\s*estrelas?\)|\[\d\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove trailing dash or status words like "- Pago" or "- OK"
    cleanedName = cleanedName.replace(/\s+[-–]\s*(pago|ok|confirmado|pendente)$/i, '').trim();

    if (!cleanedName || cleanedName.length < 2) {
      continue;
    }

    const playerObj: Omit<Player, 'id'> = {
      name: cleanedName,
      isGoalkeeper: isGk,
      rating,
      confirmed: currentSection !== 'ignore',
    };

    if (isGk) {
      goalkeepers.push(playerObj);
    } else {
      linePlayers.push(playerObj);
    }
  }

  return { linePlayers, goalkeepers };
}

/**
 * Formats the player list and/or drawn teams into a clean WhatsApp message ready to copy & share.
 */
export function exportWhatsAppList(
  players: Player[],
  rules: MatchRules,
  drawnTeams?: DrawnTeam[]
): string {
  const confirmed = players.filter((p) => p.confirmed);
  const gks = confirmed.filter((p) => p.isGoalkeeper);
  const outfield = confirmed.filter((p) => !p.isGoalkeeper);

  const lines: string[] = [];
  lines.push(`*PELADAPRO — LISTA OFICIAL (${rules.linePlayersPerTeam}+${rules.goalkeepersPerTeam})*`);
  lines.push(
    `Tempo: ${rules.durationMinutes} min | Limite: ${
      rules.goalLimit ? `${rules.goalLimit} gols` : 'Sem limite'
    }`
  );
  lines.push('');

  if (drawnTeams && drawnTeams.length > 0) {
    lines.push('*TIMES SORTEADOS:*');
    drawnTeams.forEach((team, idx) => {
      const statusTag =
        idx === 0 ? ' (Em Campo A)' : idx === 1 ? ' (Em Campo B)' : ` (Fila #${idx - 1})`;
      lines.push(`\n*${team.name}${statusTag}*`);
      if (team.goalkeeper) {
        lines.push(`Goleiro: ${team.goalkeeper.name}`);
      }
      team.linePlayers.forEach((lp, i) => {
        lines.push(`${i + 1}. ${lp.name}`);
      });
    });
    return lines.join('\n');
  }

  if (rules.goalkeepersPerTeam > 0) {
    lines.push('*GOLEIROS:*');
    if (gks.length === 0) {
      lines.push('1. (Vaga aberta)');
    } else {
      gks.forEach((gk, idx) => {
        lines.push(`${idx + 1}. ${gk.name} (Goleiro)`);
      });
    }
    lines.push('');
  }

  lines.push('*LINHA:*');
  outfield.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.name}`);
  });

  return lines.join('\n');
}

/**
 * Helper to shuffle an array deterministically or with Math.random
 */
function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Draws teams according to customizable linePlayersPerTeam + goalkeepersPerTeam.
 * Supports standard balanced sorting AND discreet "Modo Panela" (rigging) where the host
 * secretly plays with the highest-rated players or handpicked partners without anyone noticing.
 */
export function drawTeams(
  players: Player[],
  rules: MatchRules,
  rigging: RiggingConfig,
  rng: () => number = Math.random
): DrawnTeam[] {
  const confirmed = players.filter((p) => p.confirmed);
  const lineCount = Math.max(1, rules.linePlayersPerTeam);
  const gkCount = Math.max(0, Math.min(1, rules.goalkeepersPerTeam));

  const goalkeepers = confirmed.filter((p) => p.isGoalkeeper);
  const outfielders = confirmed.filter((p) => !p.isGoalkeeper);

  // Determine how many teams to form (at least 2 teams if there are enough players)
  const totalOutfieldTeams = Math.max(2, Math.ceil(outfielders.length / lineCount));
  const numTeams = Math.min(TEAM_PALETTE.length, totalOutfieldTeams);

  const teams: DrawnTeam[] = Array.from({ length: numTeams }, (_, idx) => {
    const palette = TEAM_PALETTE[idx % TEAM_PALETTE.length];
    return {
      id: `team-${idx + 1}`,
      name: palette.name,
      shortName: palette.shortName,
      accentHex: palette.accentHex,
      goalkeeper: null,
      linePlayers: [],
      totalRating: 0,
      averageRating: 0,
      slotStatus: idx === 0 ? 'team_a' : idx === 1 ? 'team_b' : 'queue',
      consecutiveWins: 0,
    };
  });

  // Find host player (or fallback to first player if rigging is enabled)
  const hostPlayer =
    confirmed.find((p) => p.isHost) ||
    (rigging.enabled && confirmed.length > 0 ? confirmed[0] : undefined);

  if (rigging.enabled && hostPlayer) {
    // Discreet Rigging ("Modo Panela"):
    // Put host's team in one of the two starting match slots (Team 0)
    const hostTeamIndex = 0;
    const hostTeam = teams[hostTeamIndex];

    const usedIds = new Set<string>();

    // 1. Place Host
    if (hostPlayer.isGoalkeeper && gkCount === 1) {
      hostTeam.goalkeeper = hostPlayer;
      usedIds.add(hostPlayer.id);
    } else {
      hostTeam.linePlayers.push(hostPlayer);
      usedIds.add(hostPlayer.id);
    }

    // 2. Assign Goalkeeper to Host Team if still needed
    if (gkCount === 1 && !hostTeam.goalkeeper) {
      const pinnedGk = goalkeepers.find(
        (gk) => !usedIds.has(gk.id) && rigging.pinnedTeammateIds.includes(gk.id)
      );
      if (pinnedGk) {
        hostTeam.goalkeeper = pinnedGk;
        usedIds.add(pinnedGk.id);
      } else {
        const sortedGks = [...goalkeepers]
          .filter((gk) => !usedIds.has(gk.id) && !rigging.excludedRivalIds.includes(gk.id))
          .sort((a, b) => b.rating - a.rating);
        if (sortedGks.length > 0) {
          hostTeam.goalkeeper = sortedGks[0];
          usedIds.add(sortedGks[0].id);
        }
      }
    }

    // 3. Assign Pinned Outfield Teammates to Host Team first
    if (rigging.mode === 'handpicked' || rigging.pinnedTeammateIds.length > 0) {
      const pinnedOutfield = outfielders.filter(
        (p) =>
          !usedIds.has(p.id) &&
          rigging.pinnedTeammateIds.includes(p.id) &&
          !rigging.excludedRivalIds.includes(p.id)
      );
      for (const teammate of pinnedOutfield) {
        if (hostTeam.linePlayers.length < lineCount) {
          hostTeam.linePlayers.push(teammate);
          usedIds.add(teammate.id);
        }
      }
    }

    // 4. Fill remaining spots on Host Team with the highest-rated players
    const eliteCandidates = [...outfielders]
      .filter((p) => !usedIds.has(p.id) && !rigging.excludedRivalIds.includes(p.id))
      .sort((a, b) => b.rating - a.rating);

    for (const elite of eliteCandidates) {
      if (hostTeam.linePlayers.length < lineCount) {
        hostTeam.linePlayers.push(elite);
        usedIds.add(elite.id);
      }
    }

    // 5. Distribute remaining goalkeepers to other teams
    if (gkCount === 1) {
      const remainingGks = shuffleArray(
        goalkeepers.filter((gk) => !usedIds.has(gk.id)),
        rng
      );
      let gkIdx = 0;
      for (let t = 0; t < teams.length; t++) {
        if (!teams[t].goalkeeper && gkIdx < remainingGks.length) {
          teams[t].goalkeeper = remainingGks[gkIdx];
          usedIds.add(remainingGks[gkIdx].id);
          gkIdx++;
        }
      }
    }

    // 6. Distribute remaining outfield players across other teams
    const remainingOutfield = shuffleArray(
      outfielders.filter((p) => !usedIds.has(p.id)),
      rng
    );

    for (const player of remainingOutfield) {
      const targetTeam =
        teams.find((t) => t.linePlayers.length < lineCount) || teams[teams.length - 1];
      targetTeam.linePlayers.push(player);
    }
  } else {
    // Standard Fair / Balanced Snake Draft
    const shuffledGks = shuffleArray(goalkeepers, rng).sort((a, b) => b.rating - a.rating);
    if (gkCount === 1) {
      for (let t = 0; t < teams.length && t < shuffledGks.length; t++) {
        teams[t].goalkeeper = shuffledGks[t];
      }
    }

    // Determine how many complete teams we can fill so active teams (Team A, Team B...) are always complete
    const completeTeamCount = Math.max(
      Math.min(2, teams.length),
      Math.min(teams.length, Math.floor(outfielders.length / lineCount))
    );
    const primaryPoolCount = Math.min(outfielders.length, completeTeamCount * lineCount);

    const shuffledOutfield = shuffleArray(outfielders, rng);
    const primaryPlayers = shuffledOutfield
      .slice(0, primaryPoolCount)
      .sort((a, b) => b.rating - a.rating);
    const overflowPlayers = shuffledOutfield.slice(primaryPoolCount);

    // Snake draft across complete teams
    let direction = 1;
    let teamCursor = 0;

    for (const player of primaryPlayers) {
      teams[teamCursor].linePlayers.push(player);
      if (completeTeamCount > 1) {
        teamCursor += direction;
        if (teamCursor >= completeTeamCount) {
          teamCursor = completeTeamCount - 1;
          direction = -1;
        } else if (teamCursor < 0) {
          teamCursor = 0;
          direction = 1;
        }
      }
    }

    // Place any overflow players into the remaining queue team(s)
    for (const extraPlayer of overflowPlayers) {
      const targetTeam =
        teams.find((t) => t.linePlayers.length < lineCount) || teams[teams.length - 1];
      targetTeam.linePlayers.push(extraPlayer);
    }
  }

  // Finalize team ratings
  return teams
    .filter((t) => t.linePlayers.length > 0 || t.goalkeeper !== null)
    .map((team, idx) => {
      const allMembers = [
        ...(team.goalkeeper ? [team.goalkeeper] : []),
        ...team.linePlayers,
      ];
      const totalRating = allMembers.reduce((sum, p) => sum + p.rating, 0);
      const averageRating =
        allMembers.length > 0 ? Number((totalRating / allMembers.length).toFixed(2)) : 0;
      return {
        ...team,
        slotStatus: idx === 0 ? 'team_a' : idx === 1 ? 'team_b' : 'queue',
        totalRating,
        averageRating,
      };
    });
}

/**
 * Evaluates whether a match has ended by Goal Limit (e.g. 2 goals) or Time Expiration.
 */
export function evaluateMatchStatus(
  scoreA: number,
  scoreB: number,
  remainingSeconds: number,
  goalLimit: number | null
): {
  isFinished: boolean;
  winner: 'A' | 'B' | 'draw' | null;
  reason: 'goal_limit' | 'time_up' | null;
} {
  if (goalLimit !== null && goalLimit > 0) {
    if (scoreA >= goalLimit) {
      return { isFinished: true, winner: 'A', reason: 'goal_limit' };
    }
    if (scoreB >= goalLimit) {
      return { isFinished: true, winner: 'B', reason: 'goal_limit' };
    }
  }

  if (remainingSeconds <= 0) {
    const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'draw';
    return { isFinished: true, winner, reason: 'time_up' };
  }

  return { isFinished: false, winner: null, reason: null };
}

/**
 * Rotates teams according to "Rei da Quadra" (Winner stays, next in queue enters).
 */
export function rotateKingOfTheCourt(
  teams: DrawnTeam[],
  winner: 'A' | 'B' | 'draw'
): DrawnTeam[] {
  if (teams.length < 2) return teams;
  if (teams.length === 2) {
    return teams.map((t, i) => ({
      ...t,
      slotStatus: i === 0 ? 'team_a' : 'team_b',
      consecutiveWins:
        (i === 0 && winner === 'A') || (i === 1 && winner === 'B')
          ? (t.consecutiveWins || 0) + 1
          : 0,
    }));
  }

  const teamA = { ...teams[0] };
  const teamB = { ...teams[1] };
  const queue = teams.slice(2).map((t) => ({ ...t }));

  const nextUp = queue.shift()!;
  let newOrder: DrawnTeam[];

  if (winner === 'B') {
    teamB.consecutiveWins = (teamB.consecutiveWins || 0) + 1;
    teamA.consecutiveWins = 0;
    newOrder = [teamB, nextUp, ...queue, teamA];
  } else {
    // Winner A or Draw (usually A stays or challenger rotates)
    teamA.consecutiveWins = winner === 'A' ? (teamA.consecutiveWins || 0) + 1 : 0;
    teamB.consecutiveWins = 0;
    newOrder = [teamA, nextUp, ...queue, teamB];
  }

  return newOrder.map((t, idx) => ({
    ...t,
    slotStatus: idx === 0 ? 'team_a' : idx === 1 ? 'team_b' : 'queue',
  }));
}

/**
 * Executes a virtual Coin Toss (Cara ou Coroa) for field side & initial ball possession.
 */
export function flipVirtualCoin(
  callerTeamId: string,
  callerChoice: 'cara' | 'coroa',
  teamAId: string,
  teamBId: string,
  rng: () => number = Math.random
): CoinTossState {
  const result: 'cara' | 'coroa' = rng() < 0.5 ? 'cara' : 'coroa';
  const callerWon = result === callerChoice;
  const otherTeamId = callerTeamId === teamAId ? teamBId : teamAId;
  const winnerTeamId = callerWon ? callerTeamId : otherTeamId;
  const loserTeamId = callerWon ? otherTeamId : callerTeamId;

  // Winner gets initial ball or side preference; loser gets the opposite
  const teamAWon = winnerTeamId === teamAId;
  return {
    result,
    callerTeamId,
    callerChoice,
    winnerTeamId,
    ballTeamId: winnerTeamId,
    fieldSideTeamA: teamAWon ? 'Lado Norte (Esquerdo)' : 'Lado Sul (Direito)',
    fieldSideTeamB: teamAWon ? 'Lado Sul (Direito)' : 'Lado Norte (Esquerdo)',
    flippedAt: Date.now(),
  };
}

/**
 * Generates a Championship schedule (Round-Robin / Pontos Corridos or Mata-Mata) from drawn teams.
 */
export function createChampionshipFromTeams(
  name: string,
  format: Championship['format'],
  teams: DrawnTeam[]
): Championship {
  const matches: ChampionshipMatch[] = [];
  let matchCounter = 1;

  if (format === 'mata_mata' && teams.length >= 4) {
    // Semifinals + Final
    matches.push({
      id: `m-${matchCounter++}`,
      round: 1,
      stageLabel: 'Semifinal 1',
      teamAId: teams[0].id,
      teamBId: teams[3].id,
      teamAName: teams[0].name,
      teamBName: teams[3].name,
      scoreA: null,
      scoreB: null,
      status: 'pending',
      scorers: [],
    });
    matches.push({
      id: `m-${matchCounter++}`,
      round: 1,
      stageLabel: 'Semifinal 2',
      teamAId: teams[1].id,
      teamBId: teams[2].id,
      teamAName: teams[1].name,
      teamBName: teams[2].name,
      scoreA: null,
      scoreB: null,
      status: 'pending',
      scorers: [],
    });
  } else {
    // Round-Robin (all vs all)
    let round = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `m-${matchCounter++}`,
          round,
          stageLabel: `${round}ª Rodada`,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          teamAName: teams[i].name,
          teamBName: teams[j].name,
          scoreA: null,
          scoreB: null,
          status: 'pending',
          scorers: [],
        });
        round++;
      }
    }
  }

  return {
    id: `champ-${Date.now()}`,
    name,
    format,
    pointsForWin: 3,
    pointsForDraw: 1,
    teams,
    matches,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calculates live tournament standings sorted by Points, Wins, Goal Difference, and Goals For.
 */
export function calculateStandings(
  teams: DrawnTeam[],
  matches: ChampionshipMatch[]
): StandingRow[] {
  const map = new Map<string, StandingRow>();

  for (const t of teams) {
    map.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      accentHex: t.accentHex,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      efficiency: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== 'finished' || m.scoreA === null || m.scoreB === null) continue;
    const rowA = map.get(m.teamAId);
    const rowB = map.get(m.teamBId);
    if (!rowA || !rowB) continue;

    rowA.played += 1;
    rowB.played += 1;
    rowA.goalsFor += m.scoreA;
    rowA.goalsAgainst += m.scoreB;
    rowB.goalsFor += m.scoreB;
    rowB.goalsAgainst += m.scoreA;

    if (m.scoreA > m.scoreB) {
      rowA.wins += 1;
      rowA.points += 3;
      rowB.losses += 1;
    } else if (m.scoreB > m.scoreA) {
      rowB.wins += 1;
      rowB.points += 3;
      rowA.losses += 1;
    } else {
      rowA.draws += 1;
      rowB.draws += 1;
      rowA.points += 1;
      rowB.points += 1;
    }
  }

  const rows = Array.from(map.values()).map((r) => {
    const goalDifference = r.goalsFor - r.goalsAgainst;
    const maxPoints = r.played * 3;
    const efficiency = maxPoints > 0 ? Math.round((r.points / maxPoints) * 100) : 0;
    return { ...r, goalDifference, efficiency };
  });

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

/**
 * Updates a ChampionshipMatch when a player's goal is added or removed,
 * automatically syncing scoreA / scoreB and marking the match as finished.
 */
export function recordGoalScorerInMatch(
  match: ChampionshipMatch,
  player: { id: string; name: string },
  teamId: string,
  delta: 1 | -1 = 1
): ChampionshipMatch {
  const existingScorers = match.scorers.map((s) => ({ ...s }));
  const idx = existingScorers.findIndex(
    (s) => s.playerId === player.id && s.teamId === teamId
  );

  if (idx >= 0) {
    existingScorers[idx].goals = Math.max(0, existingScorers[idx].goals + delta);
  } else if (delta > 0) {
    existingScorers.push({
      playerId: player.id,
      playerName: player.name,
      teamId,
      goals: delta,
    });
  }

  const cleanedScorers = existingScorers.filter((s) => s.goals > 0);
  const sumTeamA = cleanedScorers
    .filter((s) => s.teamId === match.teamAId)
    .reduce((acc, s) => acc + s.goals, 0);
  const sumTeamB = cleanedScorers
    .filter((s) => s.teamId === match.teamBId)
    .reduce((acc, s) => acc + s.goals, 0);

  const currentScoreA = match.scoreA ?? 0;
  const currentScoreB = match.scoreB ?? 0;

  const nextScoreA =
    teamId === match.teamAId
      ? Math.max(sumTeamA, Math.max(0, currentScoreA + delta))
      : Math.max(sumTeamA, currentScoreA);
  const nextScoreB =
    teamId === match.teamBId
      ? Math.max(sumTeamB, Math.max(0, currentScoreB + delta))
      : Math.max(sumTeamB, currentScoreB);

  return {
    ...match,
    scoreA: nextScoreA,
    scoreB: nextScoreB,
    status: 'finished',
    scorers: cleanedScorers,
  };
}

/**
 * Calculates the Championship Top Scorers (Ranking de Artilharia) across all matches,
 * sorted descending by goals scored and then alphabetically by player name.
 */
export function calculateTopScorers(
  teams: DrawnTeam[],
  matches: ChampionshipMatch[]
): TopScorerRow[] {
  const teamMap = new Map<string, DrawnTeam>();
  for (const t of teams) {
    teamMap.set(t.id, t);
  }

  const scorerMap = new Map<string, TopScorerRow>();

  for (const m of matches) {
    for (const s of m.scorers || []) {
      if (s.goals <= 0) continue;
      const key = `${s.teamId}:${s.playerId}`;
      const team = teamMap.get(s.teamId);
      const existing = scorerMap.get(key);
      if (existing) {
        existing.goals += s.goals;
      } else {
        scorerMap.set(key, {
          playerId: s.playerId,
          playerName: s.playerName,
          teamId: s.teamId,
          teamName: team?.name || 'Equipe',
          accentHex: team?.accentHex || '#10B981',
          goals: s.goals,
        });
      }
    }
  }

  return Array.from(scorerMap.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.playerName.localeCompare(b.playerName, 'pt-BR');
  });
}

