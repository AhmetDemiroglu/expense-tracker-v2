/* Fintel marka taslakları: simge çizimleri ve renk temaları. Simgeler 100x100 kutuda çizilir. */
(function (root) {
  var uid = 0;
  var LEAF = "M0 0 C-2 -13 8 -22 22 -22 C24 -8 14 1 0 0 Z";

  /* acc: açık temada vurgu, accL: koyu temada vurgu, g1/g2: ikon zemini geçişi,
     of1/of2: dolu zeminde simge rengi (yoksa beyaz), m1/m2: açık zeminde simge rengi (yoksa g1/g2),
     pop: ikinci renk (nokta, para), popL: koyu zeminde ikinci renk */
  var PAL = {
    zumrut: { name: "Zümrüt", note: "Para yeşili ama canlı. Altın sarısı nokta.", rec: 1, acc: "#0C8A5F", ink: "#0E1F19", accL: "#3DDBA4", g1: "#17B07C", g2: "#06694A", pop: "#FFC531", surf: "#F4FAF7", tint: "#DCF2E8", dbg: "#09140F", dcard: "#11211A", dline: "#1F362C" },
    kobalt: { name: "Kobalt", note: "Bugünkü maviye en yakın, daha net ve tek ton.", acc: "#2152F0", ink: "#0E1530", accL: "#7DA2FF", g1: "#3D6BFF", g2: "#1437B8", pop: "#FFB627", surf: "#F5F7FD", tint: "#DFE7FF", dbg: "#0A0F1F", dcard: "#121A30", dline: "#22304F" },
    erik: { name: "Erik", note: "Mor. Yeni nesil finans uygulaması havası.", acc: "#6A45F5", ink: "#17122B", accL: "#A995FF", g1: "#7D5BFF", g2: "#4322C4", pop: "#FFC24B", surf: "#F8F6FE", tint: "#E8E1FF", dbg: "#0F0C1C", dcard: "#19142B", dline: "#2C2547" },
    kehribar: { name: "Kehribar", note: "Sıcak bal rengi, lacivert nokta. Samimi, ev bütçesi hissi.", acc: "#B85C06", ink: "#24180C", accL: "#FFB652", g1: "#F7A02B", g2: "#D56F08", pop: "#22305E", popL: "#FFFFFF", surf: "#FFFAF2", tint: "#FFEBCB", dbg: "#16110A", dcard: "#231B11", dline: "#3A2E1E" },
    limon: { name: "Mürekkep ve limon", note: "Siyah zemin, fosfor yeşili. En cesur seçenek.", acc: "#4D6B00", ink: "#12160B", accL: "#C9F04C", g1: "#D6F75E", g2: "#A9D922", of1: "#12160B", of2: "#2A3414", m1: "#1B2110", m2: "#0D1007", pop: "#8FBF14", popOn: "#FFFFFF", popL: "#FFFFFF", surf: "#F7F9F0", tint: "#E9F4C4", dbg: "#0B0D07", dcard: "#14180D", dline: "#283018" },
    lacivert: { name: "Lacivert ve bakır", note: "Banka ciddiyeti, bakır sıcaklığı. En kurumsal.", acc: "#1B2A52", ink: "#111830", accL: "#E3A862", g1: "#27396D", g2: "#0F1834", of1: "#F6DDB6", of2: "#D9A566", pop: "#D08B3E", popOn: "#FFFFFF", popL: "#FFFFFF", surf: "#F6F5F1", tint: "#E6E3DA", dbg: "#0A0E1C", dcard: "#131A2E", dline: "#25304C" },
    petrol: { name: "Petrol", note: "Yeşil ile mavi arası. Sakin, güven veren.", acc: "#0A7772", ink: "#0C1F20", accL: "#45D3C8", g1: "#12A39B", g2: "#065C5F", pop: "#F6B93B", surf: "#F3F9F9", tint: "#D8EFEE", dbg: "#081314", dcard: "#102021", dline: "#1D3536" },
    kum: { name: "Kum ve kömür", note: "Renksiz, sade. Rengi yalnız küçük kiremit nokta taşır.", acc: "#1F1F1C", ink: "#1A1A17", accL: "#EFE8D8", g1: "#2D2D29", g2: "#111110", of1: "#F4EDDF", of2: "#D9CEB8", pop: "#D9653A", surf: "#F6F2EA", tint: "#E8E1D2", dbg: "#0F0F0E", dcard: "#1A1A18", dline: "#2E2E2A" },
    bordo: { name: "Bordo ve krem", note: "Koyu şarap rengi, altın nokta. Sıra dışı ve şık.", acc: "#7C1D3C", ink: "#22121A", accL: "#F0A6BC", g1: "#952949", g2: "#55102A", of1: "#FBEEDB", of2: "#E9CFA6", pop: "#E2A93B", surf: "#FBF6F2", tint: "#F2E2DF", dbg: "#150B10", dcard: "#22131A", dline: "#3A222C" }
  };

  var CONCEPTS = [
    ["A", "Çubuk F", "Üç çubuktan F. Uzun kol gelir, kısa kol gider."],
    ["B", "Lira F", "F ile ₺ arası. Kollar lira işaretindeki gibi eğik."],
    ["C", "Blok F", "Köşesi kesik dolu F. Altında tek para."],
    ["D", "Dönem", "Dolan halka. Ayın neresindesin, ne kadar kaldı."],
    ["E", "Ay", "Hilal parayı taşır. Ay hem dönem hem gökteki ay."],
    ["O", "Ortak", "İkiye bölünmüş para. İki kişi, tek bütçe."],
    ["G", "Fiş", "Tırtıklı fiş. Toplam satırı renkli."],
    ["H", "Dilim", "Bütçe halkası, bir dilimi ayrı renkte."],
    ["I", "Filiz", "Paradan çıkan filiz. Birikim büyür."],
    ["J", "Hane", "Ev ve içinde para. Evin hesabı."],
    ["M1", "F serif", "Zarif eğik F, altında renkli çizgi."],
    ["M2", "f nokta", "Küçük kalın f ve yanında para noktası."]
  ];

  function lg(id, c1, c2, x1, y1, x2, y2) {
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>';
  }
  function skin(p, mode) {
    if (mode === "dolu") return { a1: p.of1 || "#FFFFFF", a2: p.of2 || p.tint, bo: .58, pop: p.popOn || p.pop, hole: p.g2 };
    if (mode === "dark") return { a1: p.accL, a2: p.accL, bo: .5, pop: p.popL || p.pop, hole: p.dbg };
    return { a1: p.m1 || p.g1, a2: p.m2 || p.g2, bo: .45, pop: p.pop, hole: "#FFFFFF" };
  }

  function mark(k, sk) {
    var id = "f" + (++uid), A = "url(#" + id + "a)", P = sk.pop;
    var defs = lg(id + "a", sk.a1, sk.a2, 18, 8, 82, 92), body = "";

    if (k === "A") {
      body = '<rect x="27" y="14" width="16" height="72" rx="8" fill="' + A + '"/>'
        + '<rect x="50" y="14" width="34" height="16" rx="8" fill="' + A + '"/>'
        + '<rect x="50" y="39" width="21" height="16" rx="8" fill="' + P + '"/>';
    } else if (k === "B") {
      body = '<g fill="none" stroke-linecap="round" stroke-width="13">'
        + '<path d="M44 16V84" stroke="' + A + '"/>'
        + '<path d="M27 38L79 20" stroke="' + A + '"/>'
        + '<path d="M27 60L70 45" stroke="' + P + '"/></g>';
    } else if (k === "C") {
      body = '<path d="M25 21A7 7 0 0 1 32 14H67L80 27V33H44V43H66V59H44V86H25Z" fill="' + A + '"/>'
        + '<circle cx="66" cy="76" r="9" fill="' + P + '"/>';
    } else if (k === "D") {
      body = '<g fill="none" stroke-width="12" transform="rotate(-90 50 50)">'
        + '<circle cx="50" cy="50" r="30" stroke="' + A + '" opacity="' + (sk.bo * .55) + '"/>'
        + '<circle cx="50" cy="50" r="30" stroke="' + A + '" stroke-linecap="round" stroke-dasharray="132 56.5"/></g>'
        + '<circle cx="50" cy="50" r="8" fill="' + P + '"/>';
    } else if (k === "E") {
      defs += '<mask id="' + id + 'm"><rect width="100" height="100" fill="#000"/><circle cx="50" cy="50" r="34" fill="#fff"/><circle cx="50" cy="35" r="30" fill="#000"/></mask>';
      body = '<g transform="rotate(-32 50 50)"><rect width="100" height="100" fill="' + A + '" mask="url(#' + id + 'm)"/><circle cx="50" cy="40" r="11" fill="' + P + '"/></g>';
    } else if (k === "O") {
      defs += '<clipPath id="' + id + 'l"><rect x="0" y="0" width="47" height="100"/></clipPath><clipPath id="' + id + 'r"><rect x="53" y="0" width="47" height="100"/></clipPath>';
      body = '<g clip-path="url(#' + id + 'l)"><circle cx="50" cy="44" r="31" fill="' + A + '"/></g><g clip-path="url(#' + id + 'r)"><circle cx="50" cy="56" r="31" fill="' + P + '"/></g>';
    } else if (k === "G") {
      defs += '<mask id="' + id + 'm"><rect width="100" height="100" fill="#000"/><path d="M30 11H70A4 4 0 0 1 74 15V89L66 83L58 89L50 83L42 89L34 83L26 89V15A4 4 0 0 1 30 11Z" fill="#fff"/>'
        + '<rect x="36" y="25" width="28" height="6.5" rx="3.2" fill="#000"/><rect x="36" y="38" width="18" height="6.5" rx="3.2" fill="#000"/></mask>';
      body = '<rect width="100" height="100" fill="' + A + '" mask="url(#' + id + 'm)"/><rect x="36" y="56" width="28" height="10" rx="5" fill="' + P + '"/>';
    } else if (k === "H") {
      body = '<g fill="none" stroke-width="17" transform="rotate(-90 50 50)">'
        + '<circle cx="50" cy="50" r="28" stroke="' + A + '" stroke-dasharray="126 49.9"/>'
        + '<circle cx="50" cy="50" r="28" stroke="' + P + '" stroke-dasharray="40 135.9" stroke-dashoffset="-131"/></g>';
    } else if (k === "I") {
      body = '<ellipse cx="50" cy="80" rx="29" ry="9.5" fill="' + P + '"/>'
        + '<path d="M50 78V44" stroke="' + A + '" stroke-width="6.5" stroke-linecap="round" fill="none"/>'
        + '<path transform="translate(50 47) scale(1.45)" d="' + LEAF + '" fill="' + A + '"/>'
        + '<path transform="translate(50 62) scale(-1.15 1.15)" d="' + LEAF + '" fill="' + A + '" opacity="' + (sk.bo + .3) + '"/>';
    } else if (k === "J") {
      defs += '<mask id="' + id + 'm"><rect width="100" height="100" fill="#000"/><path d="M50 14L84 43V79A7 7 0 0 1 77 86H23A7 7 0 0 1 16 79V43Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="60" r="15" fill="#000"/></mask>';
      body = '<rect width="100" height="100" fill="' + A + '" mask="url(#' + id + 'm)"/><circle cx="50" cy="60" r="8" fill="' + P + '"/>';
    } else if (k === "M1") {
      body = '<text x="49" y="72" text-anchor="middle" font-family="\'Playfair Display\',serif" font-weight="900" font-style="italic" font-size="80" fill="' + A + '">F</text>'
        + '<rect x="22" y="82" width="56" height="6.5" rx="3.2" fill="' + P + '"/>';
    } else if (k === "M2") {
      body = '<text x="41" y="80" text-anchor="middle" font-family="\'Bricolage Grotesque\',sans-serif" font-weight="800" font-size="92" fill="' + A + '">f</text>'
        + '<circle cx="71" cy="71" r="9.5" fill="' + P + '"/>';
    }
    return "<defs>" + defs + "</defs>" + body;
  }

  function appIcon(st, size, k) {
    var p = PAL[st.pal], id = "i" + (++uid), c1, c2, mode, edge = "";
    if (st.bg === "dolu") { c1 = p.g1; c2 = p.g2; mode = "dolu"; }
    else if (st.bg === "koyu") { c1 = p.dcard; c2 = p.dbg; mode = "dark"; }
    else { c1 = "#FFFFFF"; c2 = p.tint; mode = "light"; edge = ' stroke="rgba(0,0,0,.1)" stroke-width="1"'; }
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" role="img" aria-label="Uygulama ikonu"><defs>' + lg(id, c1, c2, 0, 0, 100, 100)
      + '<radialGradient id="' + id + 'h" cx="28%" cy="0%" r="85%"><stop offset="0" stop-color="#fff" stop-opacity="' + (mode === "light" ? 0 : .22) + '"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
      + '<rect x=".5" y=".5" width="99" height="99" rx="22.5" fill="url(#' + id + ')"' + edge + '/><rect x=".5" y=".5" width="99" height="99" rx="22.5" fill="url(#' + id + 'h)"/>'
      + '<g transform="translate(50 50) scale(.64) translate(-50 -50)">' + mark(k || st.c, skin(p, mode)) + '</g></svg>';
  }
  function bare(st, dark, k, size) {
    var p = PAL[st.pal];
    return '<svg viewBox="0 0 100 100"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + ' role="img" aria-label="Simge">' + mark(k || st.c, skin(p, dark ? "dark" : "light")) + '</svg>';
  }
  root.FB = { PAL: PAL, CONCEPTS: CONCEPTS, appIcon: appIcon, bare: bare };
})(window);
