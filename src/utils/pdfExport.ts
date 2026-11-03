import { jsPDF } from 'jspdf';
import { DrawnTeam, MatchRules, Player } from '../types/pelada';

export interface PdfExportOptions {
  players: Player[];
  rules: MatchRules;
  drawnTeams: DrawnTeam[];
  camouflageStars?: boolean;
  roomCode?: string;
}

/**
 * Generates and downloads a formatted A4 PDF report containing:
 * 1. Match configuration & formation summary
 * 2. Drawn teams with Goalkeeper and Line players
 * 3. Full confirmed player list (Goalkeepers & Outfield)
 */
export function exportPeladaPdf({
  players,
  rules,
  drawnTeams,
  camouflageStars = false,
  roomCode = 'SOC-10',
}: PdfExportOptions): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PELADAPRO — SORTEIO OFICIAL & LISTA', margin, 14);

  doc.setTextColor(226, 232, 240); // Slate 200
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const limitLabel = rules.goalLimit ? `${rules.goalLimit} Gols` : 'Sem limite';
  doc.text(
    `Modalidade: ${rules.linePlayersPerTeam} na Linha + ${rules.goalkeepersPerTeam} no Gol  |  Tempo: ${rules.durationMinutes} min  |  Limite: ${limitLabel}`,
    margin,
    22
  );
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text(`Sala: ${roomCode}  |  Gerado em: ${dateStr}`, margin, 28);

  y = 44;

  // Section 1: Drawn Teams
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`1. TIMES SORTEADOS (${drawnTeams.length} EQUIPES)`, margin, y);
  y += 6;

  drawnTeams.forEach((team, idx) => {
    const teamHeight = 16 + (team.linePlayers.length + (team.goalkeeper ? 1 : 0)) * 5.5;
    ensureSpace(teamHeight);

    const statusTag =
      idx === 0
        ? 'Titular - Time A'
        : idx === 1
        ? 'Titular - Time B'
        : `Proximo da Fila #${idx - 1}`;

    const avgDisplay = camouflageStars ? '4.2' : team.averageRating.toFixed(1);

    // Card header box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, teamHeight - 3, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${team.name} (${statusTag})`, margin + 4, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Forca Media: ${avgDisplay} estrelas`,
      pageWidth - margin - 4,
      y + 6.5,
      { align: 'right' }
    );

    let memberY = y + 12.5;

    if (rules.goalkeepersPerTeam > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // Amber 700
      const gkName = team.goalkeeper ? team.goalkeeper.name : 'Vaga de Goleiro Aberta';
      doc.text(`GOL: ${gkName}`, margin + 6, memberY);
      memberY += 5.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    team.linePlayers.forEach((lp, lpIdx) => {
      const num = String(lpIdx + 1).padStart(2, '0');
      doc.text(`${num}. ${lp.name} (${lp.rating}*)`, margin + 6, memberY);
      memberY += 5.2;
    });

    y += teamHeight + 2;
  });

  // Section 2: Confirmed Attendance List
  ensureSpace(35);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);

  const confirmed = players.filter((p) => p.confirmed);
  const gks = confirmed.filter((p) => p.isGoalkeeper);
  const outfield = confirmed.filter((p) => !p.isGoalkeeper);

  doc.text(
    `2. LISTA DE PRESENCA CONFIRMADA (${confirmed.length} ATLETAS)`,
    margin,
    y
  );
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(`Goleiros Confirmados (${gks.length}):`, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  if (gks.length === 0) {
    doc.text('- Nenhum goleiro fixo cadastrado', margin + 3, y);
    y += 5;
  } else {
    gks.forEach((gk, i) => {
      ensureSpace(6);
      doc.text(`${i + 1}. ${gk.name} (${gk.rating}*)`, margin + 3, y);
      y += 5;
    });
  }

  y += 3;
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(`Jogadores de Linha Confirmados (${outfield.length}):`, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  // Two-column layout for outfield players
  const colWidth = (pageWidth - margin * 2) / 2;
  for (let i = 0; i < outfield.length; i += 2) {
    ensureSpace(6);
    const leftP = outfield[i];
    doc.text(
      `${String(i + 1).padStart(2, '0')}. ${leftP.name} (${leftP.rating}*)`,
      margin + 3,
      y
    );

    const rightP = outfield[i + 1];
    if (rightP) {
      doc.text(
        `${String(i + 2).padStart(2, '0')}. ${rightP.name} (${rightP.rating}*)`,
        margin + 3 + colWidth,
        y
      );
    }
    y += 5;
  }

  const fileName = `peladapro-sorteio-${roomCode.toLowerCase()}.pdf`;
  doc.save(fileName);
  return fileName;
}
