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

// Kontrollerar att kategorin inte är tom (E-KAT) och returnerar den utan omgivande blanksteg.
export function kontrolleraKategori(k) {
  const kategori = String(k ?? '').trim();
  if (kategori === '') {
    throw new ValideringsFel('Kategorin saknas. Skriv en kategori, till exempel Mat.');
  }
  return kategori;
}
