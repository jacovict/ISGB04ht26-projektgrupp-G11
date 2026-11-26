// Månadssammanställning – K4 (design.md avsnitt 4 och 5), beställarbeslut 3 och 4.
// Funktionen läser bara hushållet och ändrar ingen data.

import { normaliseraKategori, visningsnamn } from '../model/kategori.js';
import { kontrolleraManad } from '../model/budgetpost.js';
import { Status } from '../model/status.js';

const STRECK = '–'; // U+2013
const OVERFORING = normaliseraKategori('Överföring');

// Ger andelen utfall × 100 / budget som text med en decimal, decimalkomma och " %".
// Räknas med heltal (tiondels procent) så att inga flyttalsfel uppstår; avrundning
// sker till närmaste tiondel, och exakt hälften avrundas bort från noll.
function formateraAndel(utfall, budget) {
  const taljare = Math.abs(utfall) * 1000;
  let tiondelar = Math.floor(taljare / budget);
  if (2 * (taljare % budget) >= budget) {
    tiondelar += 1;
  }
  const tecken = utfall < 0 && tiondelar > 0 ? '-' : '';
  return `${tecken}${Math.floor(tiondelar / 10)},${tiondelar % 10} %`;
}

// Returnerar månadens rader { kategori, budget, utfall, avvikelse, andel } sorterade enligt steg 4.
// Kastar ValideringsFel (E-M1) om manad inte har formen ÅÅÅÅ-MM.
export function manadssammanstallning(hushall, manad) {
  const man = kontrolleraManad(manad);
  const prefix = `${man}-`;

  // Steg 1: utfall per kategori (utgift = positivt utfall), utan Överföring.
  const utfall = new Map();
  for (const konto of hushall.hamtaKonton()) {
    for (const t of konto.hamtaTransaktioner()) {
      const nyckel = normaliseraKategori(t.kategori);
      if (t.datum.startsWith(prefix) && nyckel !== OVERFORING) {
        utfall.set(nyckel, (utfall.get(nyckel) ?? 0) - t.belopp);
      }
    }
  }

  // Steg 2: månadens budget, bara från budgetposter med status Aktiv eller Avslutad.
  const budget = new Map();
  for (const post of hushall.hamtaBudgetposter()) {
    if (post.manad === man && (post.status === Status.AKTIV || post.status === Status.AVSLUTAD)) {
      budget.set(normaliseraKategori(post.kategori), post.belopp);
    }
  }

  // Steg 3: kategorier med budget eller med utfall större än 0, var och en en gång.
  const kategorier = new Set(budget.keys());
  for (const [nyckel, varde] of utfall) {
    if (varde > 0) {
      kategorier.add(nyckel);
    }
  }

  const rader = [];
  for (const nyckel of kategorier) {
    const spenderat = utfall.get(nyckel) ?? 0;
    const kategori = visningsnamn(nyckel);
    if (budget.has(nyckel)) {
      const b = budget.get(nyckel);
      rader.push({
        kategori,
        budget: b,
        utfall: spenderat,
        avvikelse: spenderat - b,
        andel: b === 0 ? STRECK : formateraAndel(spenderat, b),
      });
    } else {
      rader.push({ kategori, budget: STRECK, utfall: spenderat, avvikelse: spenderat, andel: STRECK });
    }
  }

  // Steg 4: avvikelse störst först, sedan utfall störst först, sedan svensk bokstavsordning.
  rader.sort(
    (a, b) =>
      b.avvikelse - a.avvikelse ||
      b.utfall - a.utfall ||
      a.kategori.localeCompare(b.kategori, 'sv')
  );

  return rader;
}
