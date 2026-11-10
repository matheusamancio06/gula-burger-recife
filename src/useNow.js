import { useEffect, useState } from 'react';

/** Data/hora atual que se atualiza sozinha (a cada 30 s por padrão), para "aberto agora" mudar com a página aberta. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
