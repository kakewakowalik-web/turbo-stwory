/* Stolik z lat 80/90: rekwizyty rysowane w SVG. */
(function (root) {
  'use strict';
  var P = {};
  P.cassette = '<svg width="230" height="148" viewBox="0 0 230 148"><defs><linearGradient id="cs1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a3a3f"/><stop offset="1" stop-color="#1c1c20"/></linearGradient></defs>' +
    '<rect x="2" y="2" width="226" height="144" rx="10" fill="url(#cs1)" stroke="#000" stroke-width="2"/>' +
    '<rect x="16" y="12" width="198" height="84" rx="4" fill="#f3ead2"/><rect x="16" y="12" width="198" height="20" fill="#e2483d"/><rect x="16" y="32" width="198" height="8" fill="#f5a623"/>' +
    '<text x="24" y="27" font-family="Arial Black,Arial" font-size="12" fill="#fff">C-90</text><text x="70" y="58" font-family="Comic Sans MS,cursive" font-size="13" fill="#1d3fb8">Hity Lata \'94 – strona A</text>' +
    '<rect x="62" y="64" width="106" height="28" rx="12" fill="#222"/><rect x="92" y="68" width="46" height="20" fill="#6b4a2a" opacity=".85"/>' +
    '<g fill="#eee" stroke="#555"><circle cx="78" cy="78" r="11"/><circle cx="152" cy="78" r="11"/></g><g fill="#222"><circle cx="78" cy="78" r="5"/><circle cx="152" cy="78" r="5"/></g>' +
    '<path d="M50 146 L62 112 H168 L180 146Z" fill="#2a2a2e" stroke="#111"/><g fill="#111"><circle cx="80" cy="130" r="5"/><circle cx="150" cy="130" r="5"/><rect x="104" y="124" width="22" height="10"/></g>' +
    '<g fill="#555"><circle cx="12" cy="12" r="3"/><circle cx="218" cy="12" r="3"/><circle cx="12" cy="136" r="3"/><circle cx="218" cy="136" r="3"/></g></svg>';
  P.walkman = '<svg width="210" height="300" viewBox="0 0 210 300">' +
    '<path d="M105 40 C 10 30 0 140 30 170" stroke="#222" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M105 40 C 200 30 210 140 180 170" stroke="#222" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="180" rx="26" ry="20" fill="#ff7b1c" stroke="#a24a00" stroke-width="3"/><ellipse cx="180" cy="180" rx="26" ry="20" fill="#ff7b1c" stroke="#a24a00" stroke-width="3"/>' +
    '<ellipse cx="30" cy="180" rx="12" ry="9" fill="#d65f00"/><ellipse cx="180" cy="180" rx="12" ry="9" fill="#d65f00"/>' +
    '<path d="M30 200 C 40 260 100 230 105 205" stroke="#111" stroke-width="2.5" fill="none"/><path d="M180 200 C 170 250 110 240 105 215" stroke="#111" stroke-width="2.5" fill="none"/></svg>';
  P.walkbody = '<svg width="150" height="200" viewBox="0 0 150 200"><defs><linearGradient id="wk1" x1="0" x2="1"><stop offset="0" stop-color="#2d5fb8"/><stop offset=".5" stop-color="#4a82e0"/><stop offset="1" stop-color="#244c96"/></linearGradient></defs>' +
    '<rect x="4" y="4" width="142" height="192" rx="12" fill="url(#wk1)" stroke="#132a57" stroke-width="3"/><rect x="18" y="30" width="114" height="78" rx="6" fill="#1a1a1a" stroke="#c0c6d0" stroke-width="3"/>' +
    '<rect x="34" y="50" width="82" height="38" rx="14" fill="#333"/><circle cx="54" cy="69" r="9" fill="#ddd"/><circle cx="96" cy="69" r="9" fill="#ddd"/>' +
    '<text x="22" y="22" font-family="Arial Black,Arial" font-size="13" fill="#fff" font-style="italic">TAŚMAN</text><text x="96" y="22" font-family="Arial" font-size="9" fill="#ffd23f">STEREO</text>' +
    '<g font-family="Arial" font-size="9" fill="#fff"><rect x="18" y="125" width="22" height="14" rx="2" fill="#c0c6d0"/><rect x="46" y="125" width="22" height="14" rx="2" fill="#c0c6d0"/><rect x="74" y="125" width="22" height="14" rx="2" fill="#e2483d"/><rect x="102" y="125" width="30" height="14" rx="2" fill="#c0c6d0"/></g>' +
    '<text x="20" y="160" font-family="Arial" font-size="9" fill="#cfe0ff">AUTO REVERSE · DOLBY</text><rect x="20" y="172" width="110" height="6" rx="3" fill="#132a57"/><circle cx="60" cy="175" r="6" fill="#ffd23f"/></svg>';
  P.gamekid = '<svg width="170" height="270" viewBox="0 0 170 270"><defs><linearGradient id="gk1" x1="0" x2="1"><stop offset="0" stop-color="#cfcbc2"/><stop offset="1" stop-color="#b9b4a9"/></linearGradient></defs>' +
    '<path d="M8 8 H162 V230 Q162 262 122 262 H8Z" fill="url(#gk1)" stroke="#8a857a" stroke-width="3"/><rect x="20" y="20" width="130" height="110" rx="8" fill="#5f5f6e"/>' +
    '<rect x="40" y="32" width="90" height="80" fill="#8bac0f"/><g fill="#306230"><rect x="56" y="80" width="10" height="10"/><rect x="66" y="80" width="10" height="10"/><rect x="66" y="70" width="10" height="10"/><rect x="76" y="80" width="10" height="10"/><rect x="100" y="60" width="10" height="10"/><rect x="100" y="70" width="10" height="10"/><rect x="40" y="100" width="90" height="12"/></g>' +
    '<circle cx="30" cy="66" r="3" fill="#c0181f"/><text x="22" y="148" font-family="Arial Black,Arial" font-size="11" fill="#2d2a7a" font-style="italic">GAME KID</text>' +
    '<path d="M28 175 h14 v-14 h14 v14 h14 v14 h-14 v14 h-14 v-14 h-14z" fill="#222"/><circle cx="118" cy="190" r="11" fill="#9b1c4a"/><circle cx="142" cy="172" r="11" fill="#9b1c4a"/>' +
    '<rect x="55" y="222" width="22" height="7" rx="3" fill="#777" transform="rotate(-25 66 225)"/><rect x="85" y="222" width="22" height="7" rx="3" fill="#777" transform="rotate(-25 96 225)"/>' +
    '<g stroke="#8a857a" stroke-width="3"><line x1="115" y1="235" x2="135" y2="215"/><line x1="123" y1="242" x2="143" y2="222"/><line x1="131" y1="249" x2="151" y2="229"/></g></svg>';
  P.can = '<svg width="140" height="140" viewBox="0 0 140 140"><defs><radialGradient id="cn1" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".7" stop-color="#b9bcc2"/><stop offset="1" stop-color="#7d8188"/></radialGradient></defs>' +
    '<circle cx="70" cy="70" r="66" fill="#c8102e"/><circle cx="70" cy="70" r="58" fill="url(#cn1)" stroke="#8d9097" stroke-width="2"/><circle cx="70" cy="70" r="50" fill="none" stroke="#9a9da4" stroke-width="2"/>' +
    '<path d="M52 44 Q70 34 88 44 L84 66 Q70 72 56 66Z" fill="#6c6f75"/><ellipse cx="70" cy="74" rx="16" ry="10" fill="#d9dbe0" stroke="#7d8188" stroke-width="2"/><ellipse cx="70" cy="76" rx="6" ry="4" fill="#7d8188"/><circle cx="70" cy="96" r="4" fill="#9a9da4"/>' +
    '<text x="70" y="128" text-anchor="middle" font-family="Arial Black,Arial" font-size="10" fill="#fff">KOLA</text></svg>';
  P.vhs = '<svg width="210" height="120" viewBox="0 0 210 120"><rect x="2" y="2" width="206" height="116" rx="5" fill="#161618" stroke="#000" stroke-width="2"/>' +
    '<rect x="40" y="14" width="130" height="50" rx="3" fill="#f6f1e1"/><text x="48" y="32" font-family="Arial Black,Arial" font-size="11" fill="#c0181f">E-180</text><text x="48" y="54" font-family="Comic Sans MS,cursive" font-size="13" fill="#1a1a1a">MUNDIAL \'94 + bajki</text>' +
    '<rect x="30" y="74" width="150" height="34" rx="4" fill="#222"/><circle cx="72" cy="91" r="13" fill="#3a3a3d"/><circle cx="138" cy="91" r="13" fill="#3a3a3d"/><rect x="88" y="80" width="34" height="22" fill="#4a3220" opacity=".9"/></svg>';
  P.notebook = '<svg width="260" height="320" viewBox="0 0 260 320"><rect x="10" y="6" width="244" height="310" rx="4" fill="#fffdf2" stroke="#bbb"/>' +
    (function () { var s = ''; for (var y = 50; y < 310; y += 18) s += '<line x1="10" y1="' + y + '" x2="254" y2="' + y + '" stroke="#9cc3e6" stroke-width="1"/>'; return s; })() +
    '<line x1="48" y1="6" x2="48" y2="316" stroke="#e98b8b" stroke-width="1.5"/>' +
    (function () { var s = ''; for (var y = 20; y < 310; y += 22) s += '<ellipse cx="12" cy="' + y + '" rx="10" ry="4" fill="none" stroke="#777" stroke-width="2.5"/>'; return s; })() +
    '<g font-family="Comic Sans MS,Segoe Print,cursive" fill="#1d3fb8"><text x="58" y="44" font-size="17">BRAKUJE MI:</text><text x="58" y="80" font-size="14">023, 087, 101...</text><text x="58" y="98" font-size="14">✦ Złoty Smokator!!!</text>' +
    '<text x="58" y="134" font-size="13">wymiana z Kubą:</text><text x="58" y="152" font-size="13">2x Bulpuon za 1 holo</text><text x="58" y="188" font-size="13" fill="#c0181f">NIE MÓWIĆ MAMIE ile wydałem</text></g>' +
    '<path d="M150 230 l10 -20 10 20 -20 -12 h20z" fill="none" stroke="#1d3fb8" stroke-width="2"/><path d="M70 250 q20 -30 40 0 t40 0" stroke="#1d3fb8" stroke-width="2" fill="none"/></svg>';
  P.pencil = '<svg width="240" height="22" viewBox="0 0 240 22"><rect x="20" y="2" width="190" height="18" fill="#f5c400" stroke="#b08a00"/><rect x="210" y="2" width="16" height="18" fill="#c9c9c9"/><rect x="226" y="2" width="12" height="18" rx="4" fill="#ef7f9a"/><path d="M20 2 L0 11 L20 20Z" fill="#f0d2a0"/><path d="M6 8 L0 11 L6 14Z" fill="#333"/></svg>';
  P.coins = '<svg width="120" height="80" viewBox="0 0 120 80"><g stroke="#8a6d00" stroke-width="2"><circle cx="30" cy="40" r="20" fill="#d9b23a"/><circle cx="62" cy="30" r="16" fill="#c9c9c9" stroke="#777"/><circle cx="85" cy="52" r="18" fill="#d9b23a"/></g><g font-family="Arial Black,Arial" font-size="11" fill="#7a5d00" text-anchor="middle"><text x="30" y="44">5</text><text x="85" y="56">2</text></g><text x="62" y="34" text-anchor="middle" font-family="Arial Black" font-size="10" fill="#555">1</text></svg>';

  var LAYOUT = [
    ['cassette', -30, 104, -14], ['walkman', -28, 340, 8], ['walkbody', 44, 400, -6], ['gamekid', 110, 588, 18],
    ['can', 1118, 120, 0], ['vhs', 1080, 300, 74], ['notebook', 1050, 520, -8], ['pencil', 990, 470, -32], ['coins', 210, 670, 0]
  ];
  function build(el) {
    el.innerHTML = LAYOUT.map(function (l) { return '<div class="prop prop-' + l[0] + '" style="left:' + l[1] + 'px;top:' + l[2] + 'px;transform:rotate(' + l[3] + 'deg)">' + P[l[0]] + '</div>'; }).join('') +
      '<div class="can-ring"></div>';
  }
  root.PZScene = { build: build };
})(window);
