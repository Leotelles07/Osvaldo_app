/**
 * Tela de ranking: os 5 melhores jogadores, cada linha com a posição, o
 * rostinho do Osvaldo na cor que a pessoa usou no recorde, o nome e os pontos.
 * Se o jogador logado está fora do top 5, a linha dele aparece embaixo.
 */
import type { Ranking } from '../data/cloud';
import type { LeaderboardEntry } from '../data/schema';
import { drawFurFace } from './furHeads';

const FACE_PX = 40;

const pad = (value: number): string => String(Math.max(0, value)).padStart(4, '0');

function row(entry: LeaderboardEntry, position: number, isMe: boolean): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'ranking-row';
  if (position === 1) li.classList.add('is-first');
  if (isMe) li.classList.add('is-me');
  li.setAttribute(
    'aria-label',
    `${position}º lugar: ${entry.name}${isMe ? ' (você)' : ''}, ${entry.bestScore} ${entry.bestScore === 1 ? 'ponto' : 'pontos'}`,
  );

  const pos = document.createElement('span');
  pos.className = 'ranking-row__pos';
  pos.textContent = `${position}º`;

  const face = document.createElement('canvas');
  face.className = 'ranking-row__face';
  face.setAttribute('aria-hidden', 'true');
  drawFurFace(face, entry.furColor, FACE_PX);

  // O nome encurta com reticências; a tag "você" fica sempre inteira.
  const name = document.createElement('span');
  name.className = 'ranking-row__name';
  const nick = document.createElement('span');
  nick.className = 'ranking-row__nick';
  nick.textContent = entry.name; // textContent: o nome é do jogador, nunca vira HTML
  name.append(nick);
  if (isMe) {
    const you = document.createElement('span');
    you.className = 'ranking-row__you';
    you.textContent = 'você';
    name.append(you);
  }

  const score = document.createElement('span');
  score.className = 'ranking-row__score';
  score.textContent = pad(entry.bestScore);

  for (const child of [pos, face, name, score]) child.setAttribute('aria-hidden', 'true');
  li.append(pos, face, name, score);
  return li;
}

export interface RankingView {
  showLoading(): void;
  showError(): void;
  show(ranking: Ranking, me: LeaderboardEntry | null): void;
}

export function bindRanking(list: HTMLOListElement, status: HTMLElement): RankingView {
  const setStatus = (text: string) => {
    status.textContent = text;
    status.hidden = !text;
  };

  return {
    showLoading() {
      list.replaceChildren();
      setStatus('Carregando o ranking…');
    },
    showError() {
      list.replaceChildren();
      setStatus('Não deu para carregar o ranking agora. Confira a internet e tente de novo.');
    },
    show({ top, myRank }, me) {
      const rows = top.map((entry, index) => row(entry, index + 1, entry.uid === me?.uid));
      const inTop = top.some((entry) => entry.uid === me?.uid);
      if (me && me.bestScore > 0 && !inTop && myRank !== null) {
        const gap = document.createElement('li');
        gap.className = 'ranking-gap';
        gap.setAttribute('aria-hidden', 'true');
        gap.textContent = '• • •';
        rows.push(gap as HTMLLIElement, row(me, myRank, true));
      }
      list.replaceChildren(...rows);
      setStatus(top.length === 0 ? 'Ninguém pontuou ainda. Seja o primeiro!' : '');
    },
  };
}
