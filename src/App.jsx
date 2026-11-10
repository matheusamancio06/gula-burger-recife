import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Clock3, Instagram, MapPin, Menu, Sparkles, X } from 'lucide-react';
import Destaques from './Destaques.jsx';
import { joinList, photoFormats, photoSrc, siteConfig } from './siteConfig.js';
import { formatSchedule } from './hours.js';
import { getAvailability, getPauseStatus } from './availability.js';
import { useNow } from './useNow.js';

const { instagram, orderHub, order } = siteConfig.links;
// Os textos que citam unidades acompanham siteConfig.units: com uma só (hoje, Casa Forte) ficam no singular.
const unitNames = siteConfig.units.map((unit) => unit.name);
const singleUnit = siteConfig.units.length === 1;
const heroTitleVariants = { hidden: {}, visible: { transition: { staggerChildren: .105, delayChildren: .06 } } };
const heroWordVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: .42, ease: 'easeOut' } } };
function Wordmark({ footer = false }) {
  return <a href="#inicio" className={`wordmark ${footer ? 'wordmark-footer' : ''}`} aria-label={`${siteConfig.brand.name} — início`}>
    {siteConfig.brand.logoPath
      ? <><img className="brand-logo" src={siteConfig.brand.logoPath} alt="" /><span className="logo-copy"><strong>BURGER</strong><small>RECIFE · PE</small></span></>
      : <><span className="logo-placeholder" aria-label="Logo oficial pendente">LOGO</span><span className="logo-copy"><strong>GULA BURGER</strong><small>RECIFE · PE</small></span></>}
  </a>;
}

function FeatureIcon({ name }) {
  const common = { viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };
  const shapes = {
    burger: <><path d="M4 14c0-5 5.4-9 12-9s12 4 12 9H4Z"/><path d="M10 9h.01M16 7h.01M22 10h.01M4 17h24M6 20h20M8 23h16M6 26h20"/></>,
    fries: <><path d="m7 14 3-9 4 8 3-9 4 10 3-7 2 8"/><path d="m7 15 3 12h12l3-12H7Z"/><path d="m12 18 1 5m4-5v5m4-5-1 5"/></>,
    ingredients: <><path d="M25 5C14 5 7 10 7 18c0 5 4 8 8 8 8 0 10-10 10-21Z"/><path d="M5 27c4-8 9-12 16-16"/><path d="M11 18h5m1-5v5"/></>,
    service: <><path d="M6 8h20v14H15l-6 5v-5H6V8Z"/><path d="m12 16 3 3 6-7"/></>,
  };
  return <svg {...common}>{shapes[name]}</svg>;
}

function BrandMarquee() {
  // Cada texto vem junto do seu ícone (marquee-item): com "reduzir animações" a frase quebra de linha sem separar um do outro.
  const item = (label, icon) => <span className="marquee-item"><span>{label}</span><FeatureIcon name={icon}/></span>;
  const phrase = <>{item('GULA BURGER', 'burger')}{item('RECIFE TEM GULA', 'ingredients')}{item('VEM DE GULA', 'fries')}</>;
  return <section className="brand-marquee" aria-label="Gula Burger, Recife tem Gula, vem de Gula">
    <p className="sr-only">Gula Burger. Recife tem Gula. Vem de Gula.</p>
    <div className="marquee-track" aria-hidden="true">{[0, 1].map((group) => <div className="marquee-group" key={group}>{Array.from({ length: 8 }, (_, i) => <span className="marquee-phrase" key={i}>{phrase}</span>)}</div>)}</div>
  </section>;
}

const atPageEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const reduceMotion = useReducedMotion();
  const now = useNow(60000);
  const pauseAll = getPauseStatus(siteConfig.orders.pause, undefined, now);
  const heroRef = useRef(null);
  const reveal = reduceMotion
    ? { initial: false, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
    : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .18 }, transition: { duration: .6, ease: 'easeOut' } };
  const heroEntry = reduceMotion
    ? { initial: false }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: .65, ease: 'easeOut' } };
  // Celular: o hambúrguer da foto vertical começa a ~52% da altura da imagem. A altura reservada a ele (--hero-art) acompanha o
  // tamanho do texto, assim a foto nunca passa por trás do título, do parágrafo ou dos botões, em qualquer tamanho de tela.
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const copy = hero?.querySelector('.hero-copy');
    if (!hero || !copy) return undefined;
    const narrow = window.matchMedia('(max-width: 900px)');
    const update = () => {
      if (!narrow.matches) { hero.style.removeProperty('--hero-art'); return; }
      const textBottom = copy.offsetParent.offsetTop + copy.offsetTop + copy.offsetHeight;
      hero.style.setProperty('--hero-art', `${Math.round(textBottom + 48)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(copy);
    narrow.addEventListener('change', update);
    document.fonts?.ready.then(update);
    return () => { observer.disconnect(); narrow.removeEventListener('change', update); };
  }, []);
  // Cabeçalho sólido depois do topo e item do menu da seção em leitura. A seção ativa é a última cujo topo já passou de ~1/3 da
  // tela; no fim da página, "Contato" (curta, abaixo desse ponto) é marcada pela própria posição da rolagem.
  useEffect(() => {
    const ids = ['inicio', 'destaques', 'sobre', 'unidades', 'contato'];
    const update = () => {
      setScrolled(window.scrollY > 18);
      if (atPageEnd()) { setActiveSection('contato'); return; }
      const line = window.innerHeight * .32;
      let current = ids[0];
      ids.forEach((id) => { const section = document.getElementById(id); if (section && section.getBoundingClientRect().top <= line) current = id; });
      setActiveSection(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const close = () => setMenuOpen(false);
  const nav = [['Início','#inicio'],['Destaques','#destaques'],['Sobre nós','#sobre'],[singleUnit ? 'Unidade' : 'Unidades','#unidades'],['Contato','#contato']];
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    {pauseAll.paused && <div className="pause-banner" role="status"><strong>Pedidos pausados</strong><span>{pauseAll.message}</span></div>}
    <header className={`header ${scrolled || menuOpen ? 'header-scrolled' : ''}`}>
      <div className="nav-wrap"><Wordmark />
        <nav className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Navegação principal">{nav.map(([label,href])=><a key={label} href={href} aria-current={activeSection === href.slice(1) ? 'location' : undefined} onClick={close}>{label}</a>)}<a className="mobile-order" href={order} onClick={close}>Peça agora <ArrowRight size={16}/></a></nav>
        <a className="button button-yellow header-order" href={order}>Peça agora <ArrowRight size={16}/></a>
        <button className="menu-toggle" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
      </div>
    </header>
    <main id="conteudo" tabIndex={-1}>
      <section className="hero" id="inicio" ref={heroRef}>
        <div className="hero-bg"><picture>{[['heroMobile', '(max-width: 900px)'], ['hero', undefined]].flatMap(([key, media]) => [...photoFormats(key), { src: photoSrc(key) }].map(({ type, src }) => <source key={`${key}-${src}`} media={media} type={type} srcSet={src}/>))}<img src={photoSrc('hero')} alt="Hambúrguer com queijo, bacon e rúcula numa tábua de madeira, acompanhado de batata-doce frita e molho" fetchPriority="high" decoding="async"/></picture></div>
        <div className="hero-inner">
          <motion.div className="hero-copy" {...heroEntry}>
            <div className="eyebrow"><span className="eyebrow-line"/> Recife tem Gula <span className="spark" aria-hidden="true">✳</span></div>
            <motion.h1 aria-label="A fome bateu? Vem de Gula!" variants={heroTitleVariants} initial={reduceMotion ? false : 'hidden'} animate="visible">
              <motion.span className="hero-animated-line" variants={heroWordVariants}>A FOME</motion.span>
              <motion.span className="hero-animated-line" variants={heroWordVariants}>BATEU?</motion.span>
              <motion.em variants={heroTitleVariants}><motion.span className="hero-title-desktop" variants={heroWordVariants}>VEM DE GULA!</motion.span><motion.span className="hero-title-mobile" variants={heroWordVariants}>VEM DE<br/>GULA!</motion.span></motion.em>
            </motion.h1>
            <p>Seu próximo hambúrguer favorito pode estar mais perto do que você imagina.</p>
            <div className="hero-actions"><a className="button button-yellow" href="#destaques">Ver destaques <ArrowRight size={17}/></a><a className="button button-outline" href={order}>Peça agora <ArrowRight size={16}/></a></div>
            <a className="location-note" href="#unidades"><MapPin size={15}/> {joinList(unitNames, '&')}, Recife <ArrowDown size={14}/></a>
          </motion.div>
          <motion.div className="hero-art" initial={reduceMotion ? false : {opacity:0,scale:.94,x:20}} animate={{opacity:1,scale:1,x:0}} transition={{duration:reduceMotion ? 0 : .85,ease:'easeOut'}}>
            <div className="sticker"><Sparkles size={20}/><span>HOJE<br/><b>É DIA DE</b><br/>GULA</span></div>
          </motion.div>
        </div>
        <div className="hero-bottom">
          <p className="hero-tagline"><span>GULA BURGER</span><span>UM BOM MOTIVO PRA SAIR DA ROTINA</span></p>
          <a className="hero-scroll" href="#destaques"><span>DESLIZE PARA SENTIR O SABOR</span><span className="down-line"/></a>
        </div>
      </section>
      <section className="qualities" aria-label="Diferenciais demonstrativos">{[
        ['burger', 'Hambúrguer', 'Veja os destaques'],['fries', 'Batata frita', 'Conheça nos destaques'],['ingredients', 'Ingredientes', 'Informações a confirmar'],['service', 'Atendimento', 'Consulte os canais oficiais']
      ].map(([icon,title,sub],i)=><a className="quality" key={title} href={i===3?'#unidades':'#destaques'}><span className="quality-icon"><FeatureIcon name={icon}/></span><span><strong>{title}</strong><small>{sub}</small></span><ArrowUpRight className="quality-arrow" size={16}/></a>)}</section>
      <BrandMarquee />
      <Destaques orderUrl={order} />
      <section className="feature-promo">
        <div className="promo-photo"><div className="promo-collage"><img src={photoSrc('promoBurger',850)} alt="Hambúrguer com batatas fritas" loading="lazy" decoding="async"/><img src={photoSrc('promoFries',480)} alt="Batatas fritas" loading="lazy" decoding="async"/><img src={photoSrc('promoDrink',480)} alt="Bebida gelada" loading="lazy" decoding="async"/></div><div className="promo-photo-overlay"/><span className="vertical-label">GULA BURGER · RECIFE</span><div className="promo-stamp">UM CONVITE<br/><b>PRA MATAR</b><br/>A GULA</div></div>
        <div className="promo-copy"><span className="script-label">O seu próximo rolê</span><h2>CHAMA A<br/><em>TURMA.</em></h2><p>Reúna quem você gosta e escolha seu próximo pedido. O cardápio de pedidos está a um clique de distância.</p><a className="button button-dark" href={order}>Fazer pedido <ArrowRight size={16}/></a><div className="promo-number">GULA <span>RECIFE · PE</span></div></div>
      </section>
      <section className="about section-pad" id="sobre">
        <motion.div className="about-visual" {...reveal}><img src={photoSrc('about',1000)} alt="Hambúrguer preparado para servir" loading="lazy" decoding="async"/><div className="about-quote"><span>GULA</span><small>um convite pra aproveitar</small></div><span className="about-index">A CASA · 01</span></motion.div>
        <motion.div className="about-copy" {...reveal}><span className="script-label">Prazer, somos a Gula</span><h2>RECIFE NO<br/><em>APETITE.</em></h2><p>A Gula Burger faz parte da cena de hambúrguer do Recife, com presença em {joinList(unitNames)}. Aqui, a gente deixa o cardápio falar — e você escolhe o que está com vontade de provar.</p><a className="text-link" href={instagram} target="_blank" rel="noreferrer">Conheça a Gula no Instagram <ArrowUpRight size={16}/></a><div className="about-details"><span><BadgeCheck/><b>GULA BURGER</b><small>Recife, Pernambuco</small></span><span><Instagram/><b>@GULABURGERRECIFE</b><small>Acompanhe a marca</small></span></div></motion.div>
      </section>
      <section className="locations section-pad" id="unidades">
        <motion.div className="section-heading" {...reveal}><div><span className="script-label">{singleUnit ? 'Nosso canto do Recife' : 'Dois cantos do Recife'}</span><h2>VEM PRA <span>PERTO.</span></h2><p>{singleUnit ? `Venha conhecer a unidade de ${unitNames[0]}.` : 'Encontre a unidade que fica melhor pra você.'}</p></div><div className="location-mark"><MapPin/><span>RECIFE<br/>PE</span></div></motion.div>
        <div className={`location-grid${singleUnit ? ' location-grid-single' : ''}`}>{siteConfig.units.map((unit, index) => (
          <article className={`location-card ${unit.address ? 'location-card-known' : 'location-card-pending'}`} key={unit.id}>
            <div className="location-card-main">
              <div className="location-card-top"><span>{singleUnit ? 'UNIDADE' : `0${index + 1} / UNIDADE`}</span><MapPin size={19}/></div>
              <h3>{unit.name.toUpperCase()}</h3>
              <p className="address">{unit.address || 'Endereço completo a confirmar.'}<br/>{unit.neighborhood}</p>
            </div>
            <div className="location-card-side">
              <div className="location-meta"><span><Clock3/>{formatSchedule(unit.schedule).join(' · ') || 'Horários a confirmar'}</span><span><MapPin/>{unit.name} · Recife</span>{(() => { const availability = getAvailability({ unit, pause: siteConfig.orders.pause, now }); return availability.chip && <span className={`location-status ${availability.tone === 'open' ? 'is-open' : 'is-closed'}`} role="status">{availability.chip}</span>; })()}</div>
              <div className="location-actions">
                <a className="button button-outline location-button" href={unit.mapUrl || instagram} target="_blank" rel="noreferrer">{unit.mapUrl ? 'Abrir no mapa' : 'Consultar unidade'} <ArrowUpRight size={15}/></a>
                {unit.orderUrl && <a className="unit-order-link" href={unit.orderUrl} target="_blank" rel="noreferrer">Pedir nesta unidade <ArrowRight size={14}/></a>}
              </div>
            </div>
          </article>
        ))}</div>
      </section>
      <section className="contact-strip" id="contato"><span className="script-label">Deu vontade?</span><h2>RESOLVE COM <em>GULA.</em></h2><a className="button button-yellow" href={order}>Faça seu pedido <ArrowRight size={16}/></a><div className="contact-doodle" aria-hidden="true">✳</div></section>
    </main>
    <footer className="footer"><div className="footer-main"><div className="footer-brand"><Wordmark footer/><p>Hambúrguer, Recife e<br/>uma boa dose de Gula.</p></div><div className="footer-col"><span>EXPLORE</span><a href="#destaques">Destaques</a><a href="#sobre">Sobre nós</a><a href="#unidades">{singleUnit ? 'Unidade' : 'Unidades'}</a></div><div className="footer-col"><span>ENCONTRE</span>{siteConfig.units.map((unit) => <a key={unit.id} href="#unidades">{unit.name}</a>)}<a href={instagram} target="_blank" rel="noreferrer">Instagram</a></div><div className="footer-social"><span>ACOMPANHE A GULA</span><a className="social-link" href={instagram} target="_blank" rel="noreferrer"><Instagram/> @gulaburgerrecife <ArrowUpRight size={14}/></a><a className="button button-yellow" href={orderHub} target="_blank" rel="noreferrer">Canal oficial <ArrowUpRight size={16}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.brand.name}</span><span>Site demonstrativo · Conteúdo comercial sujeito a confirmação</span><a href="#inicio">VOLTAR AO TOPO ↑</a></div></footer>
  </>;
}

export default App;
