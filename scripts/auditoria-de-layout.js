/*
 * Auditoria de layout: procura texto cortado, texto fora da tela e textos um por cima do outro.
 *
 * Como usar (leva um minuto):
 *   1. npm run dev  e abra o site (http://localhost:5173/) ou os pedidos (http://localhost:5173/pedir/).
 *   2. Espere a página carregar por completo (as fontes precisam estar prontas, senão aparecem avisos falsos), abra o
 *      console do navegador (F12 > Console), cole TODO este arquivo e aperte Enter.
 *   3. Repita em várias larguras (modo responsivo do navegador): 320, 360, 393, 430, 768, 900, 1024, 1440, 1920.
 *      Quem usa "reduzir animações" no sistema vê a faixa da marca parada; confira os dois modos.
 *
 * O resultado aparece no console, no formato: largura  pagina+N  { cortado, foraDaTela, sobrepostos, rola }
 *   cortado      texto escondido por um container com overflow (ex.: o "URGER" da faixa da marca, ou um rótulo que passa da foto)
 *   foraDaTela   texto que passa da borda da tela sem estar dentro de nada que corte ou role
 *   sobrepostos  dois textos ocupando o mesmo lugar (mais de 40% de um sobre o outro)
 *   rola         quantos textos ficam em áreas que rolam de propósito (fileira de categorias etc.), só informativo
 *   pagina+N     N > 0 significa que a página inteira rola para o lado (quase sempre é erro)
 *
 * Ignorados de propósito: textos só para leitor de tela (.sr-only), o asterisco decorativo (.contact-doodle) e, com animação
 * ligada, a faixa da marca (ela rola e as pontas esmaecem). Menus abertos e janelas por cima do conteúdo geram "sobrepostos"
 * falsos (o texto de trás continua na página): olhe esses casos a olho.
 */
(function auditoriaDeLayout() {
  var vw = innerWidth;
  var out = { cortado: [], foraDaTela: [], sobrepostos: [], rola: [] };
  var label = function (node) {
    var p = node.parentElement;
    var c = p && p.className && p.className.toString ? p.className.toString().split(' ')[0] : '';
    return (c || (p ? p.tagName.toLowerCase() : '?')) + ':"' + node.textContent.trim().replace(/\s+/g, ' ').slice(0, 22) + '"';
  };

  // 1. Todos os trechos de texto visíveis e o retângulo que cada um ocupa.
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var items = [];
  var node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    var parent = node.parentElement;
    if (!parent || parent.closest('script,style,noscript,.sr-only,.contact-doodle')) continue;
    var hidden = false;
    for (var e = parent; e && e !== document.documentElement; e = e.parentElement) {
      var cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') { hidden = true; break; }
    }
    if (hidden) continue;
    var range = document.createRange();
    range.selectNodeContents(node);
    var rects = [].slice.call(range.getClientRects()).filter(function (r) { return r.width > 0.5 && r.height > 0.5; });
    if (rects.length) items.push({ node: node, parent: parent, rects: rects });
  }

  // 2. Cada texto cabe dentro de todos os containers que cortam (overflow) e dentro da tela?
  items.forEach(function (it) {
    var L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
    it.rects.forEach(function (r) { L = Math.min(L, r.left); R = Math.max(R, r.right); T = Math.min(T, r.top); B = Math.max(B, r.bottom); });
    var cut = null, scroller = null;
    for (var a = it.parent; a && a !== document.documentElement; a = a.parentElement) {
      if (a === document.body) continue;
      var s = getComputedStyle(a), ar = a.getBoundingClientRect();
      var nome = a.className.toString().split(' ')[0] || a.tagName;
      if (s.overflowX !== 'visible' && (L < ar.left - 1.5 || R > ar.right + 1.5)) {
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') scroller = scroller || a; else cut = cut || nome + ' (lado)';
      }
      if (s.overflowY !== 'visible' && (T < ar.top - 1.5 || B > ar.bottom + 1.5)) {
        if (s.overflowY === 'auto' || s.overflowY === 'scroll') scroller = scroller || a; else cut = cut || nome + ' (altura)';
      }
    }
    var name = label(it.node);
    if (cut) out.cortado.push(name + ' em .' + cut);
    else if (scroller) out.rola.push(name);
    else if (L < -1.5 || R > vw + 1.5) out.foraDaTela.push(name + ' @' + Math.round(L) + '/' + Math.round(R));
  });

  // 3. Textos de elementos diferentes ocupando o mesmo lugar.
  for (var i = 0; i < items.length; i++) {
    for (var j = i + 1; j < items.length; j++) {
      var A = items[i], C = items[j];
      if (A.parent === C.parent || A.parent.contains(C.parent) || C.parent.contains(A.parent)) continue;
      var found = false;
      A.rects.forEach(function (r1) {
        C.rects.forEach(function (r2) {
          if (found) return;
          var w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
          var h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
          if (w > 2 && h > 2 && (w * h) / Math.min(r1.width * r1.height, r2.width * r2.height) > 0.4) {
            found = true;
            out.sobrepostos.push(label(A.node) + ' x ' + label(C.node));
          }
        });
      });
    }
  }

  var uniq = function (arr) { return arr.filter(function (v, k) { return arr.indexOf(v) === k; }); };
  var report = vw + 'px  pagina+' + (document.documentElement.scrollWidth - vw) + '  ' + JSON.stringify({
    cortado: uniq(out.cortado).slice(0, 14),
    foraDaTela: uniq(out.foraDaTela).slice(0, 14),
    sobrepostos: uniq(out.sobrepostos).slice(0, 10),
    rola: uniq(out.rola).length,
  }, null, 1);
  console.log(report);
  return report;
})();
