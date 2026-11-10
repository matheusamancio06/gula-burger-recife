// Avalia se o cardápio de pedidos já pode receber pedidos reais. Função pura: usada pelo `npm run check:pedidos`.
// A página /pedir/ segue a mesma regra (número válido + nenhum produto com `isDemo`) para liberar o envio.
import { isValidWhatsappNumber, normalizeWhatsappNumber } from './whatsapp.js';
import { validateSchedule } from '../hours.js';
import { getPauseStatus, validatePause } from '../availability.js';

const PLACEHOLDER_TEXT = /a confirmar|demonstrativ/i;

/**
 * blockers: o que impede o envio de pedidos (a página continua em modo demonstrativo).
 * warnings: o que não impede, mas costuma ser esquecido (preço ausente, texto provisório).
 */
export function evaluateOrderReadiness({ whatsappNumber, menu, services, units = [], pause = null, now = new Date() }) {
  const blockers = [];
  const warnings = [];
  const number = normalizeWhatsappNumber(whatsappNumber);

  if (services && !Object.values(services).some(Boolean)) {
    blockers.push('Nenhuma modalidade ativa: deixe retirada ou entrega como true em siteConfig.orders.services.');
  }

  if (!String(whatsappNumber ?? '').trim()) {
    blockers.push('Falta o número do WhatsApp: preencha siteConfig.orders.whatsappNumber em src/siteConfig.js.');
  } else if (!isValidWhatsappNumber(number)) {
    blockers.push(`O número "${whatsappNumber}" não parece válido. Use DDD + número, por exemplo (81) 99999-9999.`);
  }

  // Horário das unidades: erro de digitação bloqueia (faixa inválida seria tratada como "fechado"); horário ausente só avisa.
  units.forEach((unit) => {
    const problems = validateSchedule(unit.schedule);
    if (problems.length) blockers.push(`Horário da unidade ${unit.name} (siteConfig.units): ${problems.join('; ')}.`);
    else if (!unit.schedule) warnings.push(`Horário da unidade ${unit.name} não informado: o site não bloqueia pedidos fora do horário (siteConfig.units[].schedule).`);
  });

  // Pausa de pedidos: configuração errada bloqueia; pausa ligada agora e itens esgotados só avisam (são decisões do dia a dia).
  const pauseProblems = validatePause(pause, units.map((unit) => unit.id));
  if (pauseProblems.length) blockers.push(`Pausa de pedidos (siteConfig.orders.pause): ${pauseProblems.join('; ')}.`);
  const pausedNow = units.filter((unit) => getPauseStatus(pause, unit.id, now).paused).map((unit) => unit.name);
  if (getPauseStatus(pause, undefined, now).paused) warnings.push('PAUSA LIGADA: os pedidos de todas as unidades estão pausados agora (siteConfig.orders.pause).');
  else if (pausedNow.length) warnings.push(`PAUSA LIGADA para: ${pausedNow.join(', ')} (siteConfig.orders.pause).`);
  const soldOut = menu.filter((product) => product.available === false);
  if (soldOut.length) warnings.push(`${soldOut.length} produto(s) marcado(s) como esgotado(s): ${soldOut.map((product) => product.name).join(', ')}.`);

  const demoProducts = menu.filter((product) => product.isDemo);
  if (demoProducts.length) {
    blockers.push(`${demoProducts.length} de ${menu.length} produtos do cardápio de pedidos ainda são demonstrativos (isDemo) em src/order/orderMenu.js.`);
  }

  menu.filter((product) => !product.isDemo).forEach((product) => {
    if (!Number.isFinite(product.price)) warnings.push(`"${product.name}" está sem preço (price): o total do pedido ficará "a confirmar".`);
    if (PLACEHOLDER_TEXT.test(product.note || '')) warnings.push(`"${product.name}" ainda tem uma descrição provisória.`);
    (product.optionGroups || []).forEach((group) => group.options.forEach((option) => {
      if (!Number.isFinite(option.price)) warnings.push(`A opção "${option.label}" de "${product.name}" está sem preço (use 0 se não tiver custo).`);
    }));
  });

  return { ready: blockers.length === 0, number, blockers, warnings };
}
