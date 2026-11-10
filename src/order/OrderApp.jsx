import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { orderMenu, orderCategories, menuSource } from './menu.js';   // cardápio da planilha, do aparelho ou do projeto (ver menu.js)
import { joinList, photoSrc, photoSrcSet, siteConfig } from '../siteConfig.js';
import { buildOrderMessage, buildWhatsappUrl, isValidWhatsappNumber, normalizeWhatsappNumber } from './whatsapp.js';
import { getAvailability, getPauseStatus } from '../availability.js';
import { useNow } from '../useNow.js';

const STORAGE_KEY = 'gula-order-demo-v1';
const UNIT_STORAGE_KEY = 'gula-order-unit-v1';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Enquanto houver itens `isDemo` no cardápio a página avisa que é uma simulação e bloqueia o envio.
// Com dados reais (sem `isDemo`) e o WhatsApp configurado em siteConfig.orders, o pedido sai pelo WhatsApp.
const DEMO_MODE = orderMenu.some((product) => product.isDemo);
const WHATSAPP_NUMBER = normalizeWhatsappNumber(siteConfig.orders.whatsappNumber);
const CHECKOUT_READY = !DEMO_MODE && isValidWhatsappNumber(WHATSAPP_NUMBER);
const t = (demoText, liveText) => (DEMO_MODE ? demoText : liveText);
const priceText = (value) => (Number.isFinite(value) ? money.format(value) : 'Valor a confirmar');
const isSoldOut = (product) => product?.available === false;           // produto marcado como esgotado em orderMenu.js
const SERVICE_NAMES = { pickup: 'Retirada', delivery: 'Entrega' };
const ENABLED_SERVICES = Object.keys(SERVICE_NAMES).filter((key) => siteConfig.orders.services?.[key] !== false);
// Com uma única unidade (hoje, Casa Forte) não há o que escolher: ela já vem selecionada e o seletor vira um texto fixo.
const SINGLE_UNIT = siteConfig.units.length === 1;

function readStoredCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((line) => Boolean(line?.demo) === DEMO_MODE && orderMenu.some((item) => item.id === line.productId)) : [];
  } catch {
    return [];
  }
}

function initialOptions(product) {
  return Object.fromEntries(product.optionGroups.map((group) => [group.id, []]));
}

function readStoredUnit() {
  if (SINGLE_UNIT) return siteConfig.units[0].id;
  try {
    const saved = localStorage.getItem(UNIT_STORAGE_KEY);
    return siteConfig.units.some((unit) => unit.id === saved) ? saved : '';
  } catch {
    return '';
  }
}

function Quantity({ value, onChange, label }) {
  return <div className="order-quantity" aria-label={label}>
    <button type="button" aria-label={`Diminuir ${label}`} disabled={value <= 1} onClick={() => onChange(-1)}><Minus size={15}/></button>
    <output aria-live="polite">{value}</output>
    <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(1)}><Plus size={15}/></button>
  </div>;
}

function OrderApp() {
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState(readStoredCart);
  const [productDialog, setProductDialog] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(readStoredUnit);
  const [service, setService] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('');
  const [flashId, setFlashId] = useState('');
  const productRef = useRef(null);
  const cartRef = useRef(null);
  const productOpener = useRef(null);
  const cartOpener = useRef(null);
  const productClose = useRef(null);
  const cartClose = useRef(null);
  const searchRef = useRef(null);
  const [options, setOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [editLineId, setEditLineId] = useState(null);
  const selectedUnitData = siteConfig.units.find((entry) => entry.id === selectedUnit);
  // Disponibilidade: a pausa de pedidos (siteConfig.orders.pause) e o horário da unidade (schedule) impedem o envio.
  const now = useNow(30000);
  const availability = getAvailability({ unit: selectedUnitData, pause: siteConfig.orders.pause, now });
  const pauseAll = getPauseStatus(siteConfig.orders.pause, undefined, now);
  const unitOptionLabel = (entry) => {
    const status = getAvailability({ unit: entry, pause: siteConfig.orders.pause, now });
    return `${entry.name}${status.reason === 'paused' ? ' · pausado' : status.reason === 'closed' ? ' · fechado agora' : status.tone === 'open' ? ' · aberto agora' : ''}`;
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return orderMenu.filter((item) => (category === 'all' || item.category === category)
      && (!normalizedQuery || `${item.name} ${item.note}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery)));
  }, [category, query]);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const allPricesKnown = cart.length > 0 && cart.every((line) => {
    const product = orderMenu.find((item) => item.id === line.productId);
    const selected = product.optionGroups.flatMap((group) => group.options.filter((option) => (line.options[group.id] || []).includes(option.id)));
    return Number.isFinite(product.price) && selected.every((option) => Number.isFinite(option.price));
  });
  const subtotal = allPricesKnown ? cart.reduce((sum, line) => {
    const product = orderMenu.find((item) => item.id === line.productId);
    const extras = product.optionGroups.flatMap((group) => group.options.filter((option) => (line.options[group.id] || []).includes(option.id))).reduce((value, option) => value + (option.price || 0), 0);
    return sum + ((product.price + extras) * line.quantity);
  }, 0) : null;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { setNotice('Não foi possível salvar a prévia neste navegador.'); }
  }, [cart]);

  useEffect(() => {
    try {
      if (selectedUnit) localStorage.setItem(UNIT_STORAGE_KEY, selectedUnit);
      else localStorage.removeItem(UNIT_STORAGE_KEY);
    } catch { setNotice('Não foi possível salvar a unidade neste navegador.'); }
  }, [selectedUnit]);

  useEffect(() => {
    const onShortcut = (event) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('keydown', onShortcut);
    };
  }, []);

  useEffect(() => {
    const element = productRef.current;
    if (!productDialog || !element) return;
    if (!element.open) element.showModal();
    requestAnimationFrame(() => productClose.current?.focus());
  }, [productDialog]);

  useEffect(() => {
    const element = cartRef.current;
    if (!cartOpen || !element) return;
    if (!element.open) element.showModal();
    requestAnimationFrame(() => cartClose.current?.focus());
  }, [cartOpen]);

  useEffect(() => () => {
    if (productRef.current?.open) productRef.current.close();
    if (cartRef.current?.open) cartRef.current.close();
  }, []);

  const openProduct = (product, event, existing = null) => {
    productOpener.current = event.currentTarget;
    setOptions(existing?.options || initialOptions(product));
    setQuantity(existing?.quantity || 1);
    setNotes(existing?.notes || '');
    setEditLineId(existing?.lineId || null);
    setFeedback('');
    setProductDialog(product);
  };

  const closeProduct = () => productRef.current?.close();
  const closeCart = () => { setReviewing(false); cartRef.current?.close(); };
  const handleProductClose = () => {
    setProductDialog(null);
    requestAnimationFrame(() => productOpener.current?.focus?.());
  };
  const handleCartClose = () => {
    setCartOpen(false);
    setReviewing(false);
    requestAnimationFrame(() => cartOpener.current?.focus?.());
  };
  const openCart = (event) => {
    cartOpener.current = event.currentTarget;
    setReviewing(false);
    setCartOpen(true);
  };

  const toggleOption = (group, optionId) => {
    setOptions((current) => {
      const selected = current[group.id] || [];
      if (!group.multiple) return { ...current, [group.id]: selected.includes(optionId) ? [] : [optionId] };
      if (selected.includes(optionId)) return { ...current, [group.id]: selected.filter((id) => id !== optionId) };
      if (selected.length >= group.max) return current;
      return { ...current, [group.id]: [...selected, optionId] };
    });
  };

  const invalidGroups = productDialog?.optionGroups.filter((group) => {
    const count = (options[group.id] || []).length;
    return count < group.min || count > group.max || (group.required && count === 0);
  }) || [];

  const saveLine = () => {
    if (!productDialog || invalidGroups.length) return;
    const nextLine = {
      lineId: editLineId || `${productDialog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: productDialog.id,
      quantity,
      options,
      notes: notes.trim(),
      demo: DEMO_MODE,
    };
    setCart((current) => editLineId ? current.map((line) => line.lineId === editLineId ? nextLine : line) : [...current, nextLine]);
    setFeedback(editLineId ? t('Prévia atualizada.', 'Item atualizado na sacola.') : t('Adicionado à prévia.', 'Adicionado à sacola.'));
    setNotice(editLineId ? t('Item demonstrativo atualizado na prévia.', 'Item atualizado na sacola.') : t('Item demonstrativo adicionado à prévia.', 'Item adicionado à sacola.'));
    setFlashId(productDialog.id);
    window.setTimeout(() => setFlashId(''), 900);
  };

  const setLineQuantity = (lineId, change) => setCart((current) => current.map((line) => line.lineId === lineId ? { ...line, quantity: Math.max(1, line.quantity + change) } : line));
  const removeLine = (lineId) => {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
    setNotice(t('Item removido da prévia.', 'Item removido da sacola.'));
  };
  const lineName = (line) => orderMenu.find((item) => item.id === line.productId)?.name || 'Produto demonstrativo';
  const lineOptionNames = (line) => {
    const product = orderMenu.find((item) => item.id === line.productId);
    return product.optionGroups.flatMap((group) => group.options.filter((option) => (line.options[group.id] || []).includes(option.id)).map((option) => option.label));
  };

  const lineTotal = (line) => {
    const product = orderMenu.find((item) => item.id === line.productId);
    const selected = product.optionGroups.flatMap((group) => group.options.filter((option) => (line.options[group.id] || []).includes(option.id)));
    if (!Number.isFinite(product.price) || !selected.every((option) => Number.isFinite(option.price))) return null;
    return (product.price + selected.reduce((sum, option) => sum + option.price, 0)) * line.quantity;
  };

  // Envio pelo WhatsApp: só libera com tudo preenchido (e só existe fora do modo demonstrativo).
  const missingForOrder = [
    !selectedUnit && 'a unidade',
    !service && 'o tipo de atendimento',
    !customerName.trim() && 'seu nome',
    service === 'delivery' && !address.trim() && 'o endereço de entrega',
  ].filter(Boolean);
  const soldOutLines = cart.filter((line) => isSoldOut(orderMenu.find((item) => item.id === line.productId)));
  const whatsappHref = CHECKOUT_READY && cart.length > 0 && missingForOrder.length === 0 && availability.canOrder && soldOutLines.length === 0
    ? buildWhatsappUrl(WHATSAPP_NUMBER, buildOrderMessage({
      brandName: siteConfig.brand.name,
      unit: selectedUnitData ? [selectedUnitData.name, selectedUnitData.address].filter(Boolean).join(' · ') : '',
      service: SERVICE_NAMES[service],
      customerName,
      address: service === 'delivery' ? address : '',
      lines: cart.map((line) => ({ quantity: line.quantity, name: lineName(line), options: lineOptionNames(line), notes: line.notes })),
      total: subtotal == null ? null : money.format(subtotal),
    }))
    : null;

  return <>
  <a className="skip-link" href="#produtos">Pular para o cardápio</a>
  <main className="order-page">
    <header className="order-header">
      <a className="order-back" href="/#inicio" aria-label="Voltar para o site"><ArrowLeft size={18}/><span>Início</span></a>
      <a className="order-brand" href="/#inicio"><img src={siteConfig.brand.logoPath} alt=""/><span><strong>{siteConfig.brand.name}</strong><small>CARDÁPIO DE PEDIDOS</small></span></a>
      <button className="order-header-bag" type="button" onClick={openCart}><ShoppingBag size={19}/><span>Sacola</span><motion.b key={itemCount} initial={reduceMotion ? false : { scale: .75 }} animate={{ scale: 1 }} transition={{ duration: .16 }}>{itemCount}</motion.b></button>
    </header>

    <section className="order-store">
      <div><span className="order-eyebrow">CARDÁPIO DE PEDIDOS</span><h1>Peça do seu jeito.</h1><p>{t('Produtos e opções são ilustrativos. Este ambiente não recebe pedidos reais.', 'Escolha seus itens, personalize e envie o pedido pelo WhatsApp da Gula Burger.')}</p></div>
      <div className="order-store-meta"><strong>Gula Burger Recife</strong>{SINGLE_UNIT
        ? <span className="order-unit-fixed">Unidade · <b>{selectedUnitData.name}</b></span>
        : <label className="order-unit-picker">Unidade<select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)}><option value="">Selecione uma unidade</option>{siteConfig.units.map((entry) => <option key={entry.id} value={entry.id}>{unitOptionLabel(entry)}</option>)}</select></label>}<span aria-live="polite">{selectedUnitData ? (selectedUnitData.address || 'Endereço completo a confirmar.') : `Escolha ${joinList(siteConfig.units.map((entry) => entry.name), 'ou')}.`}</span>{availability.chip && <span className={`order-hours ${availability.tone === 'open' ? 'is-open' : 'is-closed'}`} role="status">{availability.chip}</span>}<a href={siteConfig.links.orderHub} target="_blank" rel="noreferrer">Acessar canal oficial <ArrowRight size={14}/></a></div>
    </section>

    {pauseAll.paused && <div className="order-notice order-notice-paused" role="status"><span className="order-notice-dot"/> Pedidos pausados <span>{pauseAll.message} Você pode ver o cardápio e montar a sacola, mas o envio fica liberado quando os pedidos voltarem.</span></div>}
    {menuSource === 'unavailable' && <div className="order-notice order-notice-paused" role="alert"><span className="order-notice-dot"/> Cardápio indisponível <span>Não conseguimos carregar o cardápio agora. Tente de novo em instantes ou fale com a Gula pelo canal oficial.</span></div>}
    {menuSource === 'cache' && <div className="order-notice" role="note"><span className="order-notice-dot"/> Cardápio salvo <span>Não conseguimos atualizar o cardápio agora. Esta é a última versão salva neste aparelho: preços e disponibilidade podem ter mudado.</span></div>}
    {DEMO_MODE && <div className="order-notice" role="note"><span className="order-notice-dot"/> Dados demonstrativos <span>Composições, valores, adicionais e disponibilidade ainda aguardam confirmação da Gula Burger.</span></div>}
    {!DEMO_MODE && !CHECKOUT_READY && <div className="order-notice" role="note"><span className="order-notice-dot"/> Envio indisponível <span>O WhatsApp de pedidos ainda não foi configurado. Você pode montar a sacola, mas não enviar o pedido.</span></div>}

    <section className="order-catalog" id="produtos" tabIndex={-1} aria-label={t('Produtos demonstrativos', 'Produtos do cardápio')}>
      <div className="order-tools">
        <label className="order-search"><Search size={19}/><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no cardápio" aria-label="Buscar produtos por nome ou descrição"/><kbd>/</kbd></label>
        <div className="order-categories" aria-label="Categorias do cardápio">
          {orderCategories.map((item) => <button key={item.id} type="button" className={category === item.id ? 'is-active' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>
      </div>
      <div className="order-results" aria-live="polite">{filtered.length} {filtered.length === 1 ? t('produto demonstrativo', 'produto') : t('produtos demonstrativos', 'produtos')}</div>
      {filtered.length ? <motion.div layout className="order-product-list">
        <AnimatePresence initial={false} mode="popLayout">{filtered.map((product) => <motion.button
          key={product.id}
          type="button"
          className={`order-product ${flashId === product.id ? 'just-added' : ''} ${isSoldOut(product) ? 'is-soldout' : ''}`}
          disabled={isSoldOut(product)}
          onClick={(event) => openProduct(product, event)}
          layout={!reduceMotion}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: .18 }}
        >
          <span className="order-product-copy"><span className="order-product-category">{orderCategories.find((entry) => entry.id === product.category)?.label}{product.isDemo ? ' · DEMO' : ''}</span><strong>{product.name}</strong><span className="order-product-description">{product.note}</span><span className="order-product-price">{isSoldOut(product) ? 'Esgotado' : priceText(product.price)}</span></span>
          <span className="order-product-image"><img src={photoSrc(product.image, 280)} srcSet={photoSrcSet(product.image, [140, 280, 420])} sizes="140px" alt="" loading="lazy" decoding="async"/><span aria-hidden="true"><Plus size={18}/></span></span>
        </motion.button>)}</AnimatePresence>
      </motion.div> : <div className="order-empty"><Search size={25}/>{orderMenu.length
        ? <><strong>Nenhum produto encontrado</strong><span>Tente outro nome ou escolha uma categoria diferente.</span><button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Limpar busca e filtros</button></>
        : <><strong>Cardápio indisponível</strong><span>Não conseguimos carregar os produtos agora.</span><button type="button" onClick={() => window.location.reload()}>Tentar de novo</button></>}</div>}
    </section>

    <footer className="order-footer"><a href="/#inicio">← Voltar ao site da Gula Burger</a><span>{t('Conteúdo demonstrativo. Nenhum pedido será enviado ou cobrado.', 'O pedido é finalizado por conversa no WhatsApp da Gula Burger.')}</span><a href={siteConfig.links.instagram} target="_blank" rel="noreferrer">Instagram oficial</a></footer>

    {itemCount > 0 && <button className="order-mobile-bag" type="button" onClick={openCart}><ShoppingBag size={19}/><span>{t('Ver prévia', 'Ver sacola')} · {itemCount} {itemCount === 1 ? 'item' : 'itens'}</span><b>{subtotal == null ? 'Valor a confirmar' : money.format(subtotal)}</b></button>}

    <dialog className="order-product-dialog" ref={productRef} aria-labelledby="order-product-title" onClose={handleProductClose} onCancel={(event) => { event.preventDefault(); closeProduct(); }} onClick={(event) => { if (event.target === productRef.current) closeProduct(); }}>
      {productDialog && <div className="order-dialog-content">
        <div className="order-dialog-bar"><span>{t('PERSONALIZAÇÃO DEMONSTRATIVA', 'PERSONALIZE SEU ITEM')}</span><button ref={productClose} className="order-icon-button" type="button" onClick={closeProduct} aria-label="Fechar detalhes"><X/></button></div>
        <div className="order-detail-layout"><img className="order-detail-image" src={photoSrc(productDialog.image, 820)} alt=""/>
          <div className="order-detail-copy"><span className="order-product-category">{orderCategories.find((entry) => entry.id === productDialog.category)?.label}{productDialog.isDemo ? ' · DEMO' : ''}</span><h2 id="order-product-title">{productDialog.name}</h2><p>{productDialog.note}</p>
            <div className="order-pending-price">{priceText(productDialog.price)}</div>
            <div className="order-option-groups">{productDialog.optionGroups.map((group) => {
              const selected = options[group.id] || [];
              return <fieldset className="order-option-group" key={group.id}><legend>{group.label}<span>{group.required ? 'Obrigatório' : 'Opcional'}{t(' · demonstração', '')}</span></legend><p>{group.help} {group.multiple ? (group.min > 0 ? (group.min === group.max ? `Escolha ${group.max}.` : `Escolha de ${group.min} a ${group.max}.`) : `Escolha até ${group.max}.`) : (group.required ? 'Escolha 1.' : 'Escolha até 1.')}</p>
                <div>{group.options.map((option) => {
                  const checked = selected.includes(option.id);
                  const disabled = group.multiple && !checked && selected.length >= group.max;
                  return <label className={`order-option ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} key={option.id}><input type={group.multiple ? 'checkbox' : 'radio'} name={`${productDialog.id}-${group.id}`} checked={checked} disabled={disabled} onChange={() => toggleOption(group, option.id)}/><span className="order-choice-mark">{checked && <Check size={13}/>}</span><span>{option.label}</span><small>{Number.isFinite(option.price) ? (option.price > 0 ? `+ ${money.format(option.price)}` : 'Sem custo') : 'Valor a confirmar'}</small></label>;
                })}</div>
                {invalidGroups.includes(group) && <span className="order-validation" role="alert">{group.required ? 'Escolha uma opção obrigatória para continuar.' : `Selecione pelo menos ${group.min} opção(ões) para continuar.`}</span>}
              </fieldset>;
            })}</div>
            <label className="order-notes">{t('Observações demonstrativas', 'Observações')}<textarea value={notes} maxLength={240} onChange={(event) => setNotes(event.target.value)} placeholder={t('Escreva uma observação para a simulação', 'Alguma observação sobre este item?')}/><small>{notes.length}/240</small></label>
            <div className="order-detail-actions"><Quantity value={quantity} onChange={(change) => setQuantity((current) => Math.max(1, current + change))} label="quantidade"/><button className="order-add-button" type="button" disabled={invalidGroups.length > 0} onClick={saveLine}>{editLineId ? t('Atualizar prévia', 'Atualizar item') : t('Adicionar à prévia', 'Adicionar à sacola')} <ArrowRight size={17}/></button></div>
            <div className="order-feedback" aria-live="polite">{feedback || t('Demonstração sem cobrança e sem envio do pedido.', 'Você revisa tudo antes de enviar o pedido.')}</div>
          </div>
        </div>
      </div>}
    </dialog>

    <dialog className="order-cart-dialog" ref={cartRef} aria-labelledby="order-cart-title" onClose={handleCartClose} onCancel={(event) => { event.preventDefault(); closeCart(); }} onClick={(event) => { if (event.target === cartRef.current) closeCart(); }}>
      <div className="order-cart-panel">
        <header className="order-cart-header"><div><span className="order-eyebrow">{reviewing ? t('REVISÃO DA SIMULAÇÃO', 'REVISÃO DO PEDIDO') : t('SACOLA DEMONSTRATIVA', 'SUA SACOLA')}</span><h2 id="order-cart-title">{reviewing ? t('Confira a prévia', 'Confira seu pedido') : t('Sua prévia', 'Sua sacola')}</h2></div><button ref={cartClose} className="order-icon-button" type="button" onClick={closeCart} aria-label="Fechar sacola"><X/></button></header>
        <AnimatePresence mode="wait" initial={false}>
        {reviewing ? <motion.div className="order-review-step" key="review" initial={reduceMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }} transition={{ duration: reduceMotion ? 0 : .16 }}>
          <p>{CHECKOUT_READY ? 'Confira os dados e envie o pedido pelo WhatsApp da Gula Burger. A conversa abre com a mensagem pronta; é só enviar.' : 'Confira os dados da simulação. As modalidades e as informações comerciais abaixo ainda não estão confirmadas.'}</p>
          {SINGLE_UNIT
            ? <div className="order-review-unit"><span>Unidade</span><b>{selectedUnitData.name}</b><small className="order-review-unit-address">{selectedUnitData.address || 'Endereço completo a confirmar.'}</small></div>
            : <label>Unidade<select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)}><option value="">Selecione uma unidade</option>{siteConfig.units.map((entry) => <option key={entry.id} value={entry.id}>{unitOptionLabel(entry)}</option>)}</select><small className="order-review-unit-address">{selectedUnitData?.address || (selectedUnitData ? 'Endereço completo a confirmar.' : 'Selecione uma unidade para consultar os dados disponíveis.')}</small></label>}
          <label>Tipo de atendimento<select value={service} onChange={(event) => setService(event.target.value)}><option value="">Selecione uma opção</option>{ENABLED_SERVICES.map((key) => <option key={key} value={key}>{SERVICE_NAMES[key]}{t(' — a confirmar', '')}</option>)}</select></label>
          {CHECKOUT_READY && <label>Seu nome<input type="text" value={customerName} maxLength={60} autoComplete="name" placeholder="Como podemos te chamar?" onChange={(event) => setCustomerName(event.target.value)}/></label>}
          {CHECKOUT_READY && service === 'delivery' && <label>Endereço de entrega<textarea value={address} maxLength={200} autoComplete="street-address" placeholder="Rua, número, complemento e bairro" onChange={(event) => setAddress(event.target.value)}/></label>}
          <div className="order-review-lines"><strong>Itens ({itemCount})</strong>{cart.map((line) => <div className="order-review-product" key={line.lineId}><span><b>{line.quantity} × {lineName(line)}</b><small>{lineOptionNames(line).join(' · ') || 'Sem opções adicionais'}</small>{line.notes && <small>Observação: {line.notes}</small>}</span><small>{priceText(lineTotal(line))}</small></div>)}<b>Total <span>{subtotal == null ? 'Valor a confirmar' : money.format(subtotal)}</span></b></div>
          {CHECKOUT_READY ? <div className="order-send">
            {!availability.canOrder && <div className="order-blocked-checkout" role="status"><strong>{availability.title}</strong><span>{availability.message} Você pode deixar o pedido pronto, mas só consegue enviá-lo {availability.reason === 'paused' ? 'quando os pedidos voltarem' : 'quando a unidade abrir'}.</span></div>}
            {soldOutLines.length > 0 && <div className="order-blocked-checkout" role="alert"><strong>Item esgotado na sacola</strong><span>{soldOutLines.map((line) => lineName(line)).join(', ')} não está disponível agora. Volte à sacola e remova para enviar o pedido.</span></div>}
            {whatsappHref
              ? <a className="order-add-button order-whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer noopener" onClick={() => setNotice('Abrimos o WhatsApp com o pedido pronto. Envie a mensagem por lá para concluir.')}>Enviar pedido pelo WhatsApp <ArrowRight size={17}/></a>
              : <button className="order-add-button order-whatsapp-button" type="button" disabled>Enviar pedido pelo WhatsApp <ArrowRight size={17}/></button>}
            <small className="order-send-hint" aria-live="polite">{whatsappHref ? 'O pedido só é enviado quando você toca em "Enviar" dentro do WhatsApp.' : missingForOrder.length > 0 ? `Falta informar: ${missingForOrder.join(', ')}.` : ''}</small>
          </div> : <div className="order-blocked-checkout"><strong>Finalização indisponível</strong><span>{DEMO_MODE ? 'O cardápio, as opções, preços e canal de atendimento desta demonstração não foram confirmados. Nenhum pedido fictício pode ser enviado.' : 'O número de WhatsApp que recebe os pedidos ainda não foi configurado.'}</span><a href={siteConfig.links.orderHub} target="_blank" rel="noreferrer">Consultar canal oficial da Gula Burger <ArrowRight size={15}/></a></div>}
          <button className="order-secondary-button" type="button" onClick={() => setReviewing(false)}>Voltar à sacola</button>
        </motion.div> : <motion.div className="order-cart-body" key="cart" initial={reduceMotion ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }} transition={{ duration: reduceMotion ? 0 : .16 }}>
          {cart.length ? <div className="order-cart-scroll">{DEMO_MODE && <div className="order-demo-callout">Simulação visual · sem cobrança · sem envio de pedido</div>}{notice && <div className="order-cart-feedback" role="status" aria-live="polite">{notice}</div>}<ul className="order-cart-lines">{cart.map((line) => {
            const product = orderMenu.find((item) => item.id === line.productId);
            return <li key={line.lineId}><img src={photoSrc(product.image, 180)} alt=""/><div className="order-cart-line-copy"><strong>{product.name}{isSoldOut(product) && <b className="order-soldout-tag">Esgotado</b>}</strong><span>{lineOptionNames(line).join(' · ')}</span>{line.notes && <small>Obs.: {line.notes}</small>}<button type="button" onClick={(event) => { const trigger = event.currentTarget; closeCart(); window.setTimeout(() => openProduct(product, { currentTarget: trigger }, line), 0); }}>Editar opções</button></div><div className="order-cart-line-tools"><button className="order-remove-button" type="button" aria-label={`Remover ${product.name}`} onClick={() => removeLine(line.lineId)}><Trash2 size={16}/></button><Quantity value={line.quantity} label={`de ${product.name}`} onChange={(change) => setLineQuantity(line.lineId, change)}/></div></li>;
          })}</ul><button className="order-clear-cart" type="button" onClick={() => { setCart([]); setNotice(t('Prévia limpa.', 'Sacola limpa.')); }}>{t('Limpar prévia', 'Limpar sacola')}</button></div> : <div className="order-cart-empty">{notice && <div className="order-cart-feedback" role="status" aria-live="polite">{notice}</div>}<ShoppingBag size={32}/><strong>{t('Sua prévia está vazia', 'Sua sacola está vazia')}</strong><span>{t('Escolha um item demonstrativo para visualizar o fluxo da sacola.', 'Escolha um item do cardápio para começar o pedido.')}</span><button type="button" onClick={closeCart}>Explorar cardápio</button></div>}
          <div className="order-cart-summary"><span>Subtotal</span><strong>{subtotal == null ? 'Valor a confirmar' : money.format(subtotal)}</strong><small>{t('Valores comerciais aguardam confirmação.', subtotal == null ? 'Alguns valores serão confirmados no WhatsApp.' : '')}</small><button className="order-add-button" type="button" disabled={!cart.length} onClick={() => setReviewing(true)}>{t('Revisar prévia', 'Revisar pedido')} <ArrowRight size={17}/></button></div>
        </motion.div>}
        </AnimatePresence>
      </div>
    </dialog>
    <div className="sr-only" aria-live="polite">{notice}</div>
  </main></>;
}

export default OrderApp;
