import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MAX_HIGHLIGHTS, showcaseItems } from './showcaseData.js';
import { photoSrc, photoSrcSet } from './siteConfig.js';

// Seção "Destaques": um prato grande no centro, os outros em botões redondos ao redor. Clicar em um botão (ou usar
// Anterior/Próximo, as setas do teclado ou deslizar) coloca aquele prato no centro e troca as cores da seção inteira.
// O prato que sai do centro ocupa o lugar do botão clicado. Dados em src/showcaseData.js; só apresenta, o pedido é em /pedir/.

const items = showcaseItems.slice(0, MAX_HIGHLIGHTS);
const byId = Object.fromEntries(items.map((entry) => [entry.id, entry]));

// Posição de cada botão ao redor do prato: ângulo em graus (0 = direita, sentido horário) e distância em % da largura da área.
const SLOTS = [
  { angle: -148, radius: 46 }, { angle: 180, radius: 48 }, { angle: 148, radius: 45 },
  { angle: -34, radius: 46 }, { angle: 1, radius: 48 }, { angle: 35, radius: 45 },
];
// Pontinhos decorativos que flutuam atrás do prato (posição em % e atraso da animação).
const SPARKS = [
  { x: 8, y: 14, size: 10, delay: 0 }, { x: 90, y: 10, size: 7, delay: 1.2 }, { x: 4, y: 74, size: 8, delay: 2.1 },
  { x: 95, y: 82, size: 11, delay: .6 }, { x: 52, y: 3, size: 6, delay: 1.8 }, { x: 62, y: 98, size: 8, delay: 2.6 },
];
const CENTER_WIDTHS = [480, 720, 960];
const CENTER_SIZES = '(max-width: 860px) 78vw, 440px';

const pad = (n) => String(n).padStart(2, '0');

function Destaques({ orderUrl }) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const [center, setCenter] = useState(items[0].id);
  const [slots, setSlots] = useState(() => items.slice(1).map((entry) => entry.id));
  const [direction, setDirection] = useState(1);
  const swipe = useRef(null);

  const current = byId[center];
  const index = items.findIndex((entry) => entry.id === center);
  const many = items.length > 1;

  // Coloca um destaque no centro; o que estava no centro passa a ocupar o lugar do botão clicado.
  const select = (id, step = 1) => {
    if (id === center || !byId[id]) return;
    setDirection(step);
    setSlots((current) => current.map((slotId) => (slotId === id ? center : slotId)));
    setCenter(id);
  };
  const go = (delta) => select(items[(index + delta + items.length) % items.length].id, delta);

  // Baixa as fotos dos outros pratos quando a seção se aproxima da tela, para a troca não esperar a imagem.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      items.forEach((item) => {
        const image = new Image();
        image.sizes = CENTER_SIZES;
        const set = photoSrcSet(item.image, CENTER_WIDTHS);
        if (set) image.srcset = set;
        image.src = photoSrc(item.image, 720);
      });
    }, { rootMargin: '600px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
  };
  // Deslizar o dedo (ou arrastar) sobre o prato troca de destaque.
  const onPointerDown = (event) => { swipe.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.4) go(dx < 0 ? 1 : -1);
  };

  const enter = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.14, rotate: direction * 14 };
  const leave = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: .86, rotate: direction * -14 };
  const theme = { '--d-bg': current.theme.bg, '--d-glow': current.theme.glow, '--d-accent': current.theme.accent };

  return <section className="destaques" id="destaques" aria-labelledby="destaques-title" style={theme} ref={sectionRef}>
    <div className="destaques-sparks" aria-hidden="true">{SPARKS.map((spark, i) => <span key={i} style={{ left: `${spark.x}%`, top: `${spark.y}%`, width: spark.size, height: spark.size, animationDelay: `${spark.delay}s` }}/>)}</div>
    <div className="destaques-inner">
      <div className="destaques-head">
        <span className="script-label">A vontade começa aqui</span>
        <h2 id="destaques-title">DESTAQUES <span>DA GULA</span></h2>
      </div>

      <div className="destaques-stage-wrap">
        <div className="destaques-stage" role="group" aria-roledescription="carrossel" aria-label="Destaques da casa" tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
          <div className="destaques-ring"/>
          <div className="destaques-disc"/>
          <div className="destaques-photo">
            <AnimatePresence initial={false}>
              <motion.img
                key={current.id}
                className="destaques-photo-img"
                src={photoSrc(current.image, 720)}
                srcSet={photoSrcSet(current.image, CENTER_WIDTHS)}
                sizes={CENTER_SIZES}
                alt={current.name}
                loading="lazy"
                decoding="async"
                draggable="false"
                initial={enter}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={leave}
                transition={{ duration: reduceMotion ? .2 : .6, ease: [.2, .8, .2, 1] }}
              />
            </AnimatePresence>
          </div>
          {slots.map((id, slot) => {
            const entry = byId[id];
            const place = SLOTS[slot];
            const radians = (place.angle * Math.PI) / 180;
            return <button
              key={slot}
              type="button"
              className="destaques-sat"
              data-side={slot < 3 ? 'left' : 'right'}
              style={{ left: `${50 + Math.cos(radians) * place.radius}%`, top: `${50 + Math.sin(radians) * place.radius}%` }}
              onClick={() => select(id, slot < 3 ? -1 : 1)}
              aria-label={`Ver ${entry.name}`}
            >
              <AnimatePresence initial={false}>
                <motion.img key={id} src={photoSrc(entry.image, 200)} alt="" loading="lazy" decoding="async" draggable="false"
                  initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? .15 : .45 }}/>
              </AnimatePresence>
              <span className="destaques-tip" aria-hidden="true">{entry.name}</span>
            </button>;
          })}
        </div>

        {many && <div className="destaques-bar">
          <button type="button" className="destaques-step" onClick={() => go(-1)}><ArrowLeft size={16}/><span>Anterior</span></button>
          <div className="destaques-now"><strong>{current.name}</strong><small>{pad(index + 1)} / {pad(items.length)} · {current.category}</small></div>
          <button type="button" className="destaques-step" onClick={() => go(1)}><span>Próximo</span><ArrowRight size={16}/></button>
        </div>}
      </div>

      <div className="destaques-copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current.id} className="destaques-item" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: .25 }}>
            <p className="destaques-meta"><b>{pad(index + 1)}</b> / {pad(items.length)} · {current.category}{current.isDemo && <em>Demonstração</em>}</p>
            <h3 className="destaques-name">{current.name}</h3>
            <p className="destaques-desc">{current.description}</p>
            <p className="destaques-ingredients"><b>Ingredientes</b> {current.ingredients?.length ? current.ingredients.join(' · ') : 'A confirmar'}</p>
            <a className="button button-yellow" href={orderUrl}>Fazer pedido <ArrowRight size={16}/></a>
          </motion.div>
        </AnimatePresence>
        <p className="destaques-note">Vitrine demonstrativa: descrições e fotos aguardam a aprovação da Gula Burger. Os pedidos são feitos no cardápio de pedidos.</p>
        <p className="sr-only" aria-live="polite">Destaque {index + 1} de {items.length}: {current.name}</p>
      </div>
    </div>
  </section>;
}

export default Destaques;
