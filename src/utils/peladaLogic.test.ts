import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStandings,
  calculateTopScorers,
  createChampionshipFromTeams,
  DEFAULT_RULES,
  drawTeams,
  evaluateMatchStatus,
  exportWhatsAppList,
  flipVirtualCoin,
  INITIAL_PLAYERS,
  parseWhatsAppList,
  recordGoalScorerInMatch,
  rotateKingOfTheCourt,
} from './peladaLogic';
import { MatchRules, RiggingConfig } from '../types/pelada';

test('parseWhatsAppList extracts goalkeepers and outfield players from typical WhatsApp text', () => {
  const sampleWhatsApp = `
Pelada de Quarta 20h30
Local: Arena Society Central
Valor: R$ 25,00

GOLEIROS:
1. Marcos Muralha ✅
2 - Diego Alves 🧤

LINHA:
01. Vitor Craque ⭐️⭐️⭐️⭐️⭐️
02 - Gabriel Gol - Pago
3) Lucas Moura (5 estrelas)
4. Danilo Lateral
5. Bruno Volante (Goleiro)

LISTA DE ESPERA:
1. Zé Atrasado
  `;

  const parsed = parseWhatsAppList(sampleWhatsApp);
  assert.equal(parsed.goalkeepers.length, 3);
  assert.equal(parsed.goalkeepers[0].name, 'Marcos Muralha');
  assert.equal(parsed.goalkeepers[2].name, 'Bruno Volante');

  // Outfield includes 4 active + 1 waitlist (unconfirmed)
  const confirmedLine = parsed.linePlayers.filter((p) => p.confirmed);
  assert.equal(confirmedLine.length, 4);
  assert.equal(confirmedLine[0].name, 'Vitor Craque');
  assert.equal(confirmedLine[0].rating, 5);
  assert.equal(confirmedLine[1].name, 'Gabriel Gol');
});

test('drawTeams respects custom formation (e.g. 4+1, 5+1, 10+1)', () => {
  const customRules: MatchRules = {
    ...DEFAULT_RULES,
    linePlayersPerTeam: 4,
    goalkeepersPerTeam: 1,
  };
  const rigging: RiggingConfig = {
    enabled: false,
    mode: 'balanced',
    pinnedTeammateIds: [],
    excludedRivalIds: [],
  };

  const teams = drawTeams(INITIAL_PLAYERS, customRules, rigging, () => 0.42);
  assert.ok(teams.length >= 3);
  assert.equal(teams[0].linePlayers.length, 4);
  assert.ok(teams[0].goalkeeper !== null);
  assert.equal(teams[1].linePlayers.length, 4);
  assert.ok(teams[1].goalkeeper !== null);
});

test('drawTeams in discreet rigging mode pairs Host with top 5-star players', () => {
  const rigging: RiggingConfig = {
    enabled: true,
    mode: 'top_stars',
    pinnedTeammateIds: ['p-5', 'p-6'],
    excludedRivalIds: ['p-13'],
  };

  const teams = drawTeams(INITIAL_PLAYERS, DEFAULT_RULES, rigging, () => 0.5);
  const hostTeam = teams[0];

  // Host (p-1) must be on Team 1
  assert.ok(hostTeam.linePlayers.some((p) => p.id === 'p-1'));
  // Pinned 5-star players must be on Host's team
  assert.ok(hostTeam.linePlayers.some((p) => p.id === 'p-5'));
  assert.ok(hostTeam.linePlayers.some((p) => p.id === 'p-6'));
  // Excluded player must NOT be on Host's team
  assert.ok(!hostTeam.linePlayers.some((p) => p.id === 'p-13'));
  // Host's team must have a 5-star average rating
  assert.equal(hostTeam.averageRating, 5);
});

test('evaluateMatchStatus triggers win by goal limit (2 goals) or time up', () => {
  const ongoing = evaluateMatchStatus(1, 1, 300, 2);
  assert.equal(ongoing.isFinished, false);

  const byGoals = evaluateMatchStatus(2, 1, 300, 2);
  assert.equal(byGoals.isFinished, true);
  assert.equal(byGoals.winner, 'A');
  assert.equal(byGoals.reason, 'goal_limit');

  const byTime = evaluateMatchStatus(0, 1, 0, 2);
  assert.equal(byTime.isFinished, true);
  assert.equal(byTime.winner, 'B');
  assert.equal(byTime.reason, 'time_up');
});

test('rotateKingOfTheCourt keeps winner and promotes next waiting team from queue', () => {
  const rigging: RiggingConfig = {
    enabled: false,
    mode: 'balanced',
    pinnedTeammateIds: [],
    excludedRivalIds: [],
  };
  const teams = drawTeams(INITIAL_PLAYERS, DEFAULT_RULES, rigging, () => 0.3);
  const idA = teams[0].id;
  const idB = teams[1].id;
  const idQueue1 = teams[2].id;

  const rotated = rotateKingOfTheCourt(teams, 'B');
  assert.equal(rotated[0].id, idB); // Winner B stays on court
  assert.equal(rotated[1].id, idQueue1); // Queue #1 steps onto court
  assert.equal(rotated[rotated.length - 1].id, idA); // Loser A goes to end of queue
});

test('flipVirtualCoin, calculateStandings, recordGoalScorerInMatch and calculateTopScorers work deterministically', () => {
  const toss = flipVirtualCoin('team-1', 'cara', 'team-1', 'team-2', () => 0.2);
  assert.equal(toss.result, 'cara');
  assert.equal(toss.winnerTeamId, 'team-1');
  assert.equal(toss.ballTeamId, 'team-1');

  const teams = drawTeams(
    INITIAL_PLAYERS,
    DEFAULT_RULES,
    { enabled: false, mode: 'balanced', pinnedTeammateIds: [], excludedRivalIds: [] },
    () => 0.5
  );
  const champ = createChampionshipFromTeams('Copa Society', 'pontos_corridos', teams.slice(0, 3));

  const teamA = champ.teams[0];
  const teamB = champ.teams[1];
  const scorerA = teamA.linePlayers[0];
  const scorerB = teamB.linePlayers[0];

  let m0 = champ.matches[0];
  m0 = recordGoalScorerInMatch(m0, scorerA, teamA.id, 1);
  m0 = recordGoalScorerInMatch(m0, scorerA, teamA.id, 1);
  m0 = recordGoalScorerInMatch(m0, scorerB, teamB.id, 1);
  champ.matches[0] = m0;

  assert.equal(champ.matches[0].scoreA, 2);
  assert.equal(champ.matches[0].scoreB, 1);
  assert.equal(champ.matches[0].status, 'finished');

  const table = calculateStandings(champ.teams, champ.matches);
  assert.equal(table[0].teamId, teamA.id);
  assert.equal(table[0].points, 3);
  assert.equal(table[0].goalDifference, 1);

  const topScorers = calculateTopScorers(champ.teams, champ.matches);
  assert.equal(topScorers.length, 2);
  assert.equal(topScorers[0].playerId, scorerA.id);
  assert.equal(topScorers[0].goals, 2);
  assert.equal(topScorers[1].playerId, scorerB.id);
  assert.equal(topScorers[1].goals, 1);

  const exported = exportWhatsAppList(INITIAL_PLAYERS, DEFAULT_RULES, teams);
  assert.ok(exported.includes('TIMES SORTEADOS'));
});
