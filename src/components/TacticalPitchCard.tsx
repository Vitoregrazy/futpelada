import React from 'react';
import { DrawnTeam, MatchRules } from '../types/pelada';

interface TacticalPitchCardProps {
  team: DrawnTeam;
  index: number;
  rules: MatchRules;
  camouflageStars?: boolean;
  onSendToMatch?: () => void;
}

/**
 * Computes tactical (x, y) percentage coordinates on a vertical half/full pitch
 * for any number of line players (from 1 to 11).
 */
function getFormationCoordinates(count: number): { x: number; y: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y: 45 }];
  if (count === 2)
    return [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ];
  if (count === 3)
    return [
      { x: 50, y: 66 },
      { x: 25, y: 36 },
      { x: 75, y: 36 },
    ];
  if (count === 4)
    return [
      { x: 30, y: 68 },
      { x: 70, y: 68 },
      { x: 28, y: 34 },
      { x: 72, y: 34 },
    ];
  if (count === 5)
    // Classic 5+1 Society (2 defenders, 1 central mid, 2 forwards)
    return [
      { x: 26, y: 70 },
      { x: 74, y: 70 },
      { x: 50, y: 48 },
      { x: 25, y: 26 },
      { x: 75, y: 26 },
    ];
  if (count === 6)
    return [
      { x: 25, y: 72 },
      { x: 75, y: 72 },
      { x: 22, y: 48 },
      { x: 50, y: 50 },
      { x: 78, y: 48 },
      { x: 50, y: 24 },
    ];
  if (count === 7)
    return [
      { x: 24, y: 72 },
      { x: 50, y: 74 },
      { x: 76, y: 72 },
      { x: 32, y: 48 },
      { x: 68, y: 48 },
      { x: 30, y: 24 },
      { x: 70, y: 24 },
    ];

  // For 8 to 11+ players (e.g. 10+1 Campo: 4-3-3 or proportional rows)
  const defenders = Math.min(4, Math.ceil(count * 0.38));
  const midfielders = Math.min(4, Math.ceil((count - defenders) * 0.55));
  const forwards = Math.max(1, count - defenders - midfielders);

  const coords: { x: number; y: number }[] = [];
  const distributeRow = (rowCount: number, yPos: number) => {
    for (let i = 0; i < rowCount; i++) {
      const x = rowCount === 1 ? 50 : 18 + (i * 64) / (rowCount - 1);
      coords.push({ x, y: yPos });
    }
  };

  distributeRow(defenders, 72);
  distributeRow(midfielders, 48);
  distributeRow(forwards, 24);
  return coords.slice(0, count);
}

export const TacticalPitchCard: React.FC<TacticalPitchCardProps> = ({
  team,
  index,
  rules,
  camouflageStars = false,
}) => {
  const coords = getFormationCoordinates(team.linePlayers.length);
  const slotLabel =
    index === 0
      ? 'Titular · Time A'
      : index === 1
      ? 'Titular · Time B'
      : `Próximo da Fila #${index - 1}`;

  const displayedAverage = camouflageStars ? '4.2' : team.averageRating.toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{slotLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {team.linePlayers.length} linha + {team.goalkeeper ? '1 gol' : '0 gol'}
            </span>
            {team.consecutiveWins ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 tabular-nums">
                  {team.consecutiveWins}V seguidas
                </span>
              </>
            ) : null}
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-0.5 flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: team.accentHex }}
              aria-hidden="true"
            />
            {team.name}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Força Média</div>
          <div className="text-sm font-mono font-semibold text-amber-400 tabular-nums">
            {displayedAverage} ★
          </div>
        </div>
      </div>

      {/* Tactical SVG Pitch Preview */}
      <div
        className="relative w-full h-52 rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-950/60 select-none"
        data-testid={`tactical-pitch-${team.id}`}
      >
        <svg
          viewBox="0 0 200 140"
          className="w-full h-full object-cover opacity-35"
          aria-hidden="true"
        >
          {/* Turf stripes */}
          <rect x="0" y="0" width="200" height="28" fill="#064e3b" />
          <rect x="0" y="28" width="200" height="28" fill="#065f46" />
          <rect x="0" y="56" width="200" height="28" fill="#064e3b" />
          <rect x="0" y="84" width="200" height="28" fill="#065f46" />
          <rect x="0" y="112" width="200" height="28" fill="#064e3b" />
          {/* Pitch Lines */}
          <rect
            x="8"
            y="6"
            width="184"
            height="128"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="1.2"
          />
          <line x1="8" y1="70" x2="192" y2="70" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="70" r="18" fill="none" stroke="#a7f3d0" strokeWidth="1.2" />
          {/* Penalty Box Bottom (GK Area) */}
          <rect
            x="54"
            y="104"
            width="92"
            height="30"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="1.2"
          />
          {/* Top Attack Goal */}
          <rect
            x="72"
            y="6"
            width="56"
            height="14"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="1.2"
          />
        </svg>

        {/* Outfield Players on Pitch */}
        {team.linePlayers.map((player, i) => {
          const pos = coords[i] || { x: 50, y: 50 };
          const firstName = player.name.split(' ')[0];
          return (
            <div
              key={player.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-950 shadow-md border border-white/80 tabular-nums"
                style={{ backgroundColor: team.accentHex }}
              >
                {i + 2}
              </div>
              <span className="mt-0.5 px-1.5 py-0.2 bg-slate-950/85 text-slate-100 text-[10px] font-medium rounded whitespace-nowrap max-w-[78px] truncate">
                {firstName}
              </span>
            </div>
          );
        })}

        {/* Goalkeeper on Pitch */}
        {rules.goalkeepersPerTeam > 0 && (
          <div
            style={{ left: '50%', top: '88%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          >
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-bold border border-white shadow-md">
              GK
            </div>
            <span className="mt-0.5 px-1.5 bg-slate-950/90 text-amber-300 text-[10px] font-semibold rounded whitespace-nowrap max-w-[90px] truncate">
              {team.goalkeeper ? team.goalkeeper.name.split(' ')[0] : 'Sem Goleiro'}
            </span>
          </div>
        )}
      </div>

      {/* Player Roster List */}
      <div className="divide-y divide-slate-800/80 text-sm">
        {rules.goalkeepersPerTeam > 0 && (
          <div className="py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-semibold text-amber-400 w-6 shrink-0">
                GOL
              </span>
              <span className="font-medium text-slate-100 truncate">
                {team.goalkeeper ? team.goalkeeper.name : 'Vaga de Goleiro Aberta'}
              </span>
            </div>
            {team.goalkeeper && (
              <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                {team.goalkeeper.rating}★
              </span>
            )}
          </div>
        )}

        {team.linePlayers.map((player, idx) => (
          <div key={player.id} className="py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-slate-400 w-6 shrink-0 tabular-nums">
                {String(idx + 1).padStart(2, '0')}.
              </span>
              <span className="text-slate-200 truncate">
                {player.name}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
              {player.rating}★
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
