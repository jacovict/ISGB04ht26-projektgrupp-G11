// kategori.js – K2, K4, beställarbeslut 4 och PO:s beslut om belopp i felmeddelanden (design.md 1.3).

import { ValideringsFel } from './fel.js';

// Ger kategorins jämförelseform: utan omgivande blanksteg och med gemener.
export function normaliseraKategori(k) {
  return String(k ?? '').trim().toLowerCase();
}

// Ger kategorins visningsnamn: jämförelseformen med stor första bokstav ("mat" och "MAT" blir "Mat").
export function visningsnamn(k) {
  const normal = normaliseraKategori(k);
  return normal.charAt(0).toUpperCase() + normal.slice(1);
}

// Ger beloppet i hela kronor med mellanslag (U+0020) som tusentalsavgränsare,
// minustecknet − (U+2212) för negativa belopp och " kr" på slutet, t.ex. "−1 200 kr".
export function formateraBelopp(belopp) {
  const heltal = Math.round(Number(belopp));
  const siffror = String(Math.abs(heltal)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${heltal < 0 ? '−' : ''}${siffror} kr`;
}

// Tolkar ett belopp, ingående saldo eller transaktionsnummer som kan komma som tal eller som text
// (design.md avsnitt 7). Ett tal godtas om det är ett heltal; text godtas bara som ett valfritt
// minustecken följt av siffror. Returnerar heltalet, eller NaN som markering för "inte ett heltal",
// som den anropande kontrollen gör om till sitt eget felmeddelande (E-T2, E-B3, E-K4, E-T7).
export function tolkaHeltal(varde) {
  if (typeof varde === 'number') {
    return Number.isInteger(varde) ? varde : NaN;
  }
  if (typeof varde === 'string' && /^-?\d+$/.test(varde)) {
    const tal = Number(varde);
    return Number.isSafeInteger(tal) ? tal : NaN;
  }
  return NaN;
}

// Kontrollerar att kategorin inte är tom (E-KAT) och returnerar den utan omgivande blanksteg.
export function kontrolleraKategori(k) {
  const kategori = String(k ?? '').trim();
  if (kategori === '') {
    throw new ValideringsFel('Kategorin saknas. Skriv en kategori, till exempel Mat.');
  }
  return kategori;
}
