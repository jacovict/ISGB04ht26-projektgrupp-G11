// Budgetpost – K1, K2. Tillstånd Planerad → Aktiv → Avslutad (AK1.2).

import { Status } from './status.js';
import { ValideringsFel, StatusFel } from './fel.js';
import { kontrolleraKategori, visningsnamn, tolkaHeltal } from './kategori.js';

// Kontrollerar att månaden har formen ÅÅÅÅ-MM med månad 01–12 (E-M1).
export function kontrolleraManad(manad) {
  const text = String(manad ?? '');
  const delar = /^(\d{4})-(\d{2})$/.exec(text);
  if (!delar || Number(delar[2]) < 1 || Number(delar[2]) > 12) {
    throw new ValideringsFel(
      `Månaden "${text}" har fel format. Skriv månaden som ÅÅÅÅ-MM, till exempel 2026-11.`
    );
  }
  return text;
}

// Kontrollerar att budgetbeloppet (tal eller text, tolkaHeltal) är ett heltal (E-B3) som är 0 eller
// större (E-B2, AK1.3). Returnerar beloppet som tal; felmeddelandet visar värdet som det skickades in.
function kontrolleraBudgetbelopp(belopp) {
  const tal = tolkaHeltal(belopp);
  if (!Number.isInteger(tal)) {
    throw new ValideringsFel(
      `Budgetbeloppet "${belopp ?? ''}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, till exempel 3000.`
    );
  }
  if (tal < 0) {
    throw new ValideringsFel(
      'Budgetbeloppet får inte vara negativt. Skriv ett belopp i hela kronor som är 0 eller större.'
    );
  }
  return tal;
}

export class Budgetpost {
  #kategori;
  #manad;
  #belopp;
  #status;

  constructor(kategori, manad, belopp) {
    this.#kategori = kontrolleraKategori(kategori);
    this.#manad = kontrolleraManad(manad);
    this.#belopp = kontrolleraBudgetbelopp(belopp);
    this.#status = Status.PLANERAD;
  }

  get kategori() {
    return this.#kategori;
  }

  get manad() {
    return this.#manad;
  }

  get belopp() {
    return this.#belopp;
  }

  get status() {
    return this.#status;
  }

  // Planerad → Aktiv. Annars StatusFel (E-B6).
  aktiveraBudgetpost() {
    if (this.#status !== Status.PLANERAD) {
      throw new StatusFel(
        `Budgetposten ${this.#namn()} kan inte aktiveras eftersom den har status ${this.#status}. Bara en budgetpost med status Planerad kan aktiveras.`
      );
    }
    this.#status = Status.AKTIV;
  }

  // Aktiv → Avslutad, som är ett sluttillstånd. Annars StatusFel (E-B7).
  avslutaBudgetpost() {
    if (this.#status !== Status.AKTIV) {
      throw new StatusFel(
        `Budgetposten ${this.#namn()} kan inte avslutas eftersom den har status ${this.#status}. Bara en budgetpost med status Aktiv kan avslutas.`
      );
    }
    this.#status = Status.AVSLUTAD;
  }

  // Byter belopp om posten inte är Avslutad (E-B8) och beloppet är giltigt (E-B3, E-B2).
  nyttBelopp(nytt) {
    if (this.#status === Status.AVSLUTAD) {
      throw new StatusFel(
        `Beloppet för budgetposten ${this.#namn()} kan inte ändras eftersom den har status Avslutad.`
      );
    }
    this.#belopp = kontrolleraBudgetbelopp(nytt);
  }

  // "{kategori} {månad}" i meddelandena.
  #namn() {
    return `${visningsnamn(this.#kategori)} ${this.#manad}`;
  }
}
