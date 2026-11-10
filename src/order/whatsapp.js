// Montagem do pedido enviado pelo WhatsApp. Funções puras, sem React, para ficarem fáceis de testar.
// O número que recebe os pedidos fica em siteConfig.orders.whatsappNumber.

// Só dígitos, com DDI + DDD (ex.: 5581999999999). Aceita de 12 a 15 dígitos.
export const isValidWhatsappNumber = (number) => typeof number === 'string' && /^\d{12,15}$/.test(number);

/**
 * Deixa o número no formato do wa.me (só dígitos, com DDI). Aceita como foi copiado:
 * '(81) 99999-9999', '81 99999-9999', '+55 81 99999-9999', '5581999999999'.
 * Sem DDI (10 ou 11 dígitos, como número brasileiro) acrescenta o 55. Vazio ou null devolve ''.
 */
export function normalizeWhatsappNumber(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

/**
 * Texto do pedido. Usa a formatação do WhatsApp (*negrito*) e uma linha por informação.
 * lines: [{ quantity, name, options: string[], notes }]
 * total: texto já formatado ("R$ 52,00") ou null quando algum valor ainda não é conhecido.
 */
export function buildOrderMessage({ brandName, unit, service, customerName, address, lines, total }) {
  const parts = [`*Novo pedido — ${brandName}*`, ''];
  parts.push(`*Unidade:* ${clean(unit)}`);
  parts.push(`*Atendimento:* ${clean(service)}`);
  parts.push(`*Nome:* ${clean(customerName)}`);
  if (clean(address)) parts.push(`*Endereço:* ${clean(address)}`);
  parts.push('', '*Itens*');
  lines.forEach((line) => {
    parts.push(`${line.quantity}x ${clean(line.name)}`);
    (line.options || []).forEach((option) => parts.push(`   • ${clean(option)}`));
    if (clean(line.notes)) parts.push(`   Obs.: ${clean(line.notes)}`);
  });
  parts.push('', total ? `*Total:* ${total}` : '*Total:* a confirmar', '', 'Pedido montado pelo site.');
  return parts.join('\n');
}

export const buildWhatsappUrl = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
