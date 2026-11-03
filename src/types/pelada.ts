export interface Player {
  id: string;
  name: string;
  isGoalkeeper: boolean;
  rating: number; // 1 to 5 stars
  isHost?: boolean; // Marks the organizer ("Eu")
  confirmed: boolean;
}

export interface MatchRules {
  linePlayersPerTeam: number; // e.g., 3, 4, 5 (Society), 6, 7, 10 (Campo)
  goalkeepersPerTeam: number; // 0 or 1
  durationMinutes: number; // e.g., 10 min
  goalLimit: number | null; // e.g., 2 goals, or null for no limit
  extraTimeMinutes: number; // Acréscimo atual (e.g., +1, +2)
  autoRotateWinnerStays: boolean; // Rei da quadra: vencedor fica
}

export type RiggingMode = 'balanced' | 'top_stars' | 'handpicked';

export interface RiggingConfig {
  enabled: boolean;
  mode: RiggingMode;
  pinnedTeammateIds: string[]; // Jogadores que cairão obrigatoriamente no time do Host
  excludedRivalIds: string[]; // Jogadores que cairão obrigatoriamente em outros times
  camouflageStars?: boolean; // Oculta discrepância de estrelas na tela pública
}

export interface DrawnTeam {
  id: string;
  name: string;
  shortName: string;
  accentHex: string;
  goalkeeper: Player | null;
  linePlayers: Player[];
  totalRating: number;
  averageRating: number;
  slotStatus: 'team_a' | 'team_b' | 'queue';
  consecutiveWins?: number;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'extra_time' | 'card_yellow' | 'card_red' | 'period_end';
  teamId?: string;
  playerId?: string;
  playerName?: string;
  minuteMark: string;
  description: string;
  timestamp: number;
}

export interface CoinTossState {
  result: 'cara' | 'coroa' | null;
  callerTeamId: string;
  callerChoice: 'cara' | 'coroa';
  winnerTeamId: string | null;
  ballTeamId: string | null;
  fieldSideTeamA: 'Lado Norte (Esquerdo)' | 'Lado Sul (Direito)';
  fieldSideTeamB: 'Lado Norte (Esquerdo)' | 'Lado Sul (Direito)';
  flippedAt: number | null;
}

export interface LiveMatchState {
  isRunning: boolean;
  remainingSeconds: number;
  configuredMinutes: number;
  addedStoppageMinutes: number;
  scoreA: number;
  scoreB: number;
  teamAId: string;
  teamBId: string;
  events: MatchEvent[];
  winnerTeamId: string | null;
  endedReason: 'goal_limit' | 'time_up' | 'manual' | null;
}

export interface ChampionshipMatch {
  id: string;
  round: number;
  stageLabel: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'in_progress' | 'finished';
  scorers: { playerId: string; playerName: string; teamId: string; goals: number }[];
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  accentHex: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  efficiency: number;
}

export interface TopScorerRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  accentHex: string;
  goals: number;
}

export interface Championship {
  id: string;
  name: string;
  format: 'pontos_corridos' | 'mata_mata' | 'rei_da_quadra';
  pointsForWin: number;
  pointsForDraw: number;
  teams: DrawnTeam[];
  matches: ChampionshipMatch[];
  createdAt: string;
}

export interface ConnectedParticipant {
  clientId: string;
  name: string;
  role: 'host' | 'guest';
  joinedAt: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostName: string;
  players: Player[];
  rules: MatchRules;
  drawnTeams: DrawnTeam[];
  coinToss: CoinTossState;
  liveMatch: LiveMatchState;
  championship: Championship | null;
  participants: ConnectedParticipant[];
  activityFeed: { id: string; text: string; timestamp: number }[];
  updatedAt: number;
}
