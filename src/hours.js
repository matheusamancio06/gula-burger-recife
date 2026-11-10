// Horário de funcionamento das unidades: aberto/fechado agora, próxima abertura e texto para exibir.
// Funções puras (sem React), usadas pelo site e pelo cardápio de pedidos. O horário de cada unidade
// fica em siteConfig.units[].schedule; schedule = null significa "horário ainda não confirmado" (nada é bloqueado).
//
// Formato de `schedule`: um array de faixas [abre, fecha] ('HH:MM') por dia da semana
// (sun, mon, tue, wed, thu, fri, sat). Dia ausente ou [] = fechado. Quem fecha depois da meia-noite usa o
// horário normal de fechamento, por exemplo ['18:00', '01:00'] (vale até 01:00 da madrugada seguinte).

export const TIME_ZONE = 'America/Recife';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DAY_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DAY_ARTICLE = ['no', 'na', 'na', 'na', 'na', 'na', 'no'];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];                    // segunda a domingo
const DAY_MINUTES = 24 * 60;
const WEEK_MINUTES = 7 * DAY_MINUTES;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
const isValidRange = (range) => Array.isArray(range) && TIME_PATTERN.test(range[0]) && TIME_PATTERN.test(range[1]);
/** Faixas válidas de um dia; qualquer valor fora do formato (texto, null...) conta como dia fechado, sem quebrar a página. */
const rangesOf = (schedule, day) => (Array.isArray(schedule?.[DAY_KEYS[day]]) ? schedule[DAY_KEYS[day]].filter(isValidRange) : []);

/** Dia da semana (0 = domingo) e minuto do dia no fuso das unidades, independente do fuso do visitante. */
export function zonedNow(date = new Date(), timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday')),
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/** Faixas da semana em minutos desde domingo 00:00. Faixas inválidas são ignoradas. */
function weekIntervals(schedule) {
  const intervals = [];
  DAY_KEYS.forEach((key, day) => {
    rangesOf(schedule, day).forEach(([open, close]) => {
      const start = day * DAY_MINUTES + toMinutes(open);
      let end = day * DAY_MINUTES + toMinutes(close);
      if (end <= start) end += DAY_MINUTES;                  // fecha depois da meia-noite
      intervals.push({ start, end });
    });
  });
  return intervals;
}

/** "18h", "18h30", "meia-noite" */
export function formatClock(minutesOfDay) {
  const hours = Math.floor(minutesOfDay / 60) % 24;
  const minutes = minutesOfDay % 60;
  if (hours === 0 && minutes === 0) return 'meia-noite';
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
}

const atClock = (label) => (label === 'meia-noite' ? 'à meia-noite' : `às ${label}`);

/**
 * Situação da unidade neste instante.
 *  - { configured: false }                       horário não informado: nada deve ser bloqueado
 *  - { configured: true, open: true, closesAt }  aberta ("23h")
 *  - { configured: true, open: false, opensAt }  fechada; opensAt = { dayDiff, label, time } ou null se nunca abre
 */
export function getOpenStatus(schedule, date = new Date()) {
  if (!schedule) return { configured: false, open: false };
  const intervals = weekIntervals(schedule);
  const { day, minutes } = zonedNow(date);
  const now = day * DAY_MINUTES + minutes;

  for (const { start, end } of intervals) {
    for (const shift of [0, -WEEK_MINUTES]) {               // -semana cobre a faixa de sábado que passa da meia-noite
      if (start + shift <= now && now < end + shift) {
        return { configured: true, open: true, closesAt: formatClock(end % DAY_MINUTES) };
      }
    }
  }

  const nextStart = intervals
    .flatMap(({ start }) => [start, start + WEEK_MINUTES])
    .filter((start) => start > now)
    .sort((a, b) => a - b)[0];
  if (nextStart === undefined) return { configured: true, open: false, opensAt: null };

  const dayIndex = Math.floor(nextStart / DAY_MINUTES);
  const weekday = dayIndex % 7;
  return {
    configured: true,
    open: false,
    opensAt: { dayDiff: dayIndex - day, label: `${DAY_ARTICLE[weekday]} ${DAY_LONG[weekday]}`, time: formatClock(nextStart % DAY_MINUTES) },
  };
}

/** "Abre hoje às 18h", "Abre amanhã às 18h", "Abre na terça-feira às 18h" ("" se nunca abre). */
export function describeOpening(status) {
  if (!status.configured || status.open || !status.opensAt) return '';
  const { dayDiff, label, time } = status.opensAt;
  const when = dayDiff === 0 ? 'hoje' : dayDiff === 1 ? 'amanhã' : label;
  return `Abre ${when} ${atClock(time)}`;
}

/** "Aberto agora · fecha às 23h" / "Fechado agora · abre amanhã às 18h" ("" se o horário não foi informado). */
export function describeStatus(status) {
  if (!status.configured) return '';
  if (status.open) return `Aberto agora · fecha ${atClock(status.closesAt)}`;
  return ['Fechado agora', describeOpening(status).toLowerCase()].filter(Boolean).join(' · ');
}

/** Linhas para exibir o horário, por exemplo ["Ter a dom · 18h às 23h"]. Vazio quando não informado. */
export function formatSchedule(schedule) {
  if (!schedule) return [];
  const labelOf = (day) => rangesOf(schedule, day)
    .map(([open, close]) => `${formatClock(toMinutes(open))} às ${formatClock(toMinutes(close))}`).join(' e ');

  const groups = [];
  DISPLAY_ORDER.forEach((day) => {
    const label = labelOf(day);
    if (!label) { groups.push(null); return; }
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.days.push(day);
    else groups.push({ label, days: [day] });
  });

  const dayNames = (days) => {
    const names = days.map((day) => DAY_SHORT[day]);
    const text = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} e ${names[1]}` : `${names[0]} a ${names[names.length - 1]}`;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  return groups.filter(Boolean).map(({ label, days }) => `${dayNames(days)} · ${label}`);
}

/** Problemas de digitação em um schedule (usado pelo npm run check:pedidos). */
export function validateSchedule(schedule) {
  if (!schedule) return [];
  const problems = [];
  Object.keys(schedule).forEach((key) => {
    if (!DAY_KEYS.includes(key)) { problems.push(`dia "${key}" desconhecido (use sun, mon, tue, wed, thu, fri, sat)`); return; }
    if (!Array.isArray(schedule[key])) { problems.push(`${key}: deve ser uma lista de faixas, por exemplo [['18:00', '23:00']]`); return; }
    schedule[key].forEach((range) => { if (!isValidRange(range)) problems.push(`${key}: faixa inválida ${JSON.stringify(range)} (use ['HH:MM', 'HH:MM'])`); });
  });
  return problems;
}
