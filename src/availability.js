// Pode-se pedir agora? Junta a PAUSA de pedidos (siteConfig.orders.pause) com o HORÁRIO da unidade (src/hours.js).
// Funções puras, usadas pelo site e pelo cardápio de pedidos.
//
// siteConfig.orders.pause = {
//   all: false,            true pausa os pedidos de todas as unidades
//   units: [],             ids das unidades pausadas, ex.: ['casa-forte']
//   message: '',           texto opcional para o cliente, ex.: 'Estamos com a cozinha lotada.'
//   until: null,           opcional: quando a pausa termina sozinha, ex.: '2026-12-25T18:00:00-03:00'
// }

import { TIME_ZONE, describeStatus, formatClock, getOpenStatus, describeOpening, zonedNow } from './hours.js';

export const DEFAULT_PAUSE_MESSAGE = 'Os pedidos estão pausados no momento.';

/** null = sem data; undefined = data inválida; Date = válida. */
function parseUntil(until) {
  if (!until) return null;
  const date = new Date(until);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const ymd = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/** "hoje às 18h", "amanhã às 18h", "em 25/12 às 18h" (no fuso de Recife). */
export function describeResume(until, now = new Date()) {
  const clock = formatClock(zonedNow(until).minutes);
  const day = ymd(until);
  const [, month, dayOfMonth] = day.split('-');
  const when = day === ymd(now) ? 'hoje' : day === ymd(new Date(now.getTime() + 24 * 60 * 60 * 1000)) ? 'amanhã' : `em ${dayOfMonth}/${month}`;
  return `${when} ${clock === 'meia-noite' ? 'à meia-noite' : `às ${clock}`}`;
}

/** A pausa vale para esta unidade agora? (`unitId` ausente: só a pausa geral conta.) */
export function getPauseStatus(pause, unitId, now = new Date()) {
  if (!pause) return { paused: false };
  const forAll = Boolean(pause.all);
  const forUnit = Boolean(unitId) && Array.isArray(pause.units) && pause.units.includes(unitId);
  if (!forAll && !forUnit) return { paused: false };

  const until = parseUntil(pause.until);
  if (until && until.getTime() <= now.getTime()) return { paused: false };      // voltou sozinho

  const resume = until ? describeResume(until, now) : '';
  const base = String(pause.message || '').trim() || DEFAULT_PAUSE_MESSAGE;
  return { paused: true, scope: forAll ? 'all' : 'unit', resume, message: resume ? `${base} Voltamos ${resume}.` : base };
}

/**
 * Situação de uma unidade para receber pedidos.
 *  canOrder  false quando pausada ou fechada
 *  reason    'paused' | 'closed' | null
 *  title     título curto do aviso ("Pedidos pausados", "Unidade fechada agora")
 *  message   frase explicando (para o aviso)
 *  chip      texto curto de status ("Aberto agora · fecha às 23h"); vazio se não há o que mostrar
 *  tone      'open' | 'closed' | null (cor do indicador)
 */
export function getAvailability({ unit, pause, now = new Date() }) {
  const paused = getPauseStatus(pause, unit?.id, now);
  if (paused.paused) {
    return { canOrder: false, reason: 'paused', title: 'Pedidos pausados', message: paused.message, chip: `Pedidos pausados${paused.resume ? ` · volta ${paused.resume}` : ''}`, tone: 'closed' };
  }
  const hours = getOpenStatus(unit?.schedule, now);
  if (hours.configured && !hours.open) {
    const opening = describeOpening(hours);
    return { canOrder: false, reason: 'closed', title: 'Unidade fechada agora', message: `${unit.name} está fechada agora.${opening ? ` ${opening}.` : ''}`, chip: describeStatus(hours), tone: 'closed' };
  }
  return { canOrder: true, reason: null, title: '', message: '', chip: describeStatus(hours), tone: hours.configured ? 'open' : null };
}

/** Problemas na configuração da pausa (usado pelo npm run check:pedidos). */
export function validatePause(pause, unitIds = []) {
  if (!pause) return [];
  const problems = [];
  if (pause.until && parseUntil(pause.until) === undefined) problems.push(`"until" (${JSON.stringify(pause.until)}) não é uma data válida; use, por exemplo, '2026-12-25T18:00:00-03:00'`);
  if (pause.units !== undefined && !Array.isArray(pause.units)) problems.push('"units" deve ser uma lista, por exemplo [\'casa-forte\']');
  (Array.isArray(pause.units) ? pause.units : []).filter((id) => !unitIds.includes(id)).forEach((id) => problems.push(`unidade "${id}" da pausa não existe em siteConfig.units`));
  return problems;
}
