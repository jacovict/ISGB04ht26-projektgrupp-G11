// Konto (abstrakt) – K1, K3. Subklasserna implementerar tillaten, rantesats och kontotyp.

import { ValideringsFel } from './fel.js';
import { Transaktion } from './transaktion.js';
import { kontrolleraManad } from './budgetpost.js';
import { tolkaHeltal } from './kategori.js';

// Kontrollerar att kontonamnet inte är tomt (E-K1) och returnerar det utan omgivande blanksteg.
export function kontrolleraKontonamn(namn) {
  const text = String(namn ?? '').trim();
  if (text === '') {
    throw new ValideringsFel('Kontonamnet saknas. Skriv ett namn på kontot.');
  }
  return text;
}

// Kontrollerar att ingående saldo (tal eller text, tolkaHeltal) är ett heltal (E-K4).
// Returnerar saldot som tal; felmeddelandet visar värdet som det skickades in.
export function kontrolleraIngaendeSaldo(saldo) {
  const tal = tolkaHeltal(saldo);
  if (!Number.isInteger(tal)) {
    throw new ValideringsFel(
      `Ingående saldo "${saldo ?? ''}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, till exempel 12000 eller -500.`
    );
  }
  return tal;
}

export class Konto {
  #namn;
  #ingaendeSaldo;
  #transaktioner = [];

  constructor(namn, ingaendeSaldo) {
    if (new.target === Konto) {
      throw new Error('Konto är abstrakt. Skapa ett konto av en kontotyp.');
    }
    this.#namn = kontrolleraKontonamn(namn);
    this.#ingaendeSaldo = kontrolleraIngaendeSaldo(ingaendeSaldo);
  }

  get namn() {
    return this.#namn;
  }

  // Sätts bara av Hushall.andraKonto, som kontrollerar K1-reglerna först.
  set namn(nyttNamn) {
    this.#namn = kontrolleraKontonamn(nyttNamn);
  }

  get ingaendeSaldo() {
    return this.#ingaendeSaldo;
  }

  // Sätts bara av Hushall.andraKonto, som kontrollerar kontotypens regel först.
  set ingaendeSaldo(nyttSaldo) {
    this.#ingaendeSaldo = kontrolleraIngaendeSaldo(nyttSaldo);
  }

  saldo() {
    return this.#transaktioner.reduce((summa, t) => summa + t.belopp, this.#ingaendeSaldo);
  }

  // Lägger t sist om kontotypen tillåter det nya saldot (K3). Annars false och kontot oförändrat.
  laggTillTransaktion(t) {
    if (!this.tillaten(t.belopp, this.saldo() + t.belopp)) {
      return false;
    }
    this.#transaktioner.push(t);
    return true;
  }

  // Kopia av listan, så att kontot inte kan ändras utifrån.
  hamtaTransaktioner() {
    return [...this.#transaktioner];
  }

  // Ersätter transaktion nr (räknat från 1) med t om nr finns och kontotypen tillåter det nya saldot.
  ersattTransaktion(nr, t) {
    if (!Number.isInteger(nr) || nr < 1 || nr > this.#transaktioner.length) {
      return false;
    }
    const gammal = this.#transaktioner[nr - 1];
    const nyttSaldo = this.saldo() - gammal.belopp + t.belopp;
    if (!this.tillaten(t.belopp, nyttSaldo)) {
      return false;
    }
    this.#transaktioner[nr - 1] = t;
    return true;
  }

  // Det lägsta saldo kontot haft under månaden (ÅÅÅÅ-MM): saldot vid månadens början och saldot
  // efter varje transaktion i månaden, i datumordning (vid samma datum i registreringsordning).
  lagstaSaldo(manad) {
    const man = kontrolleraManad(manad);
    const forsta = `${man}-01`;
    let saldo = this.#transaktioner
      .filter((t) => t.datum < forsta)
      .reduce((summa, t) => summa + t.belopp, this.#ingaendeSaldo);
    let lagsta = saldo;
    // sort är stabil, så transaktioner med samma datum behåller registreringsordningen.
    const iManaden = this.#transaktioner
      .filter((t) => t.datum.startsWith(`${man}-`))
      .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
    for (const t of iManaden) {
      saldo += t.belopp;
      lagsta = Math.min(lagsta, saldo);
    }
    return lagsta;
  }

  // Räntan för månaden: ⌊lägsta saldo × räntesats⌋. Är den större än 0 läggs en transaktion
  // i kategorin Ränta till på månadens sista dag och returneras; annars null och kontot oförändrat.
  // Kontrollen att räntan inte redan är bokförd (E-R1) görs av Hushall.beraknaRanta.
  beraknaRanta(manad) {
    const man = kontrolleraManad(manad);
    // Avrundning till sex decimaler före ⌊ ⌋ tar bort flyttalsfel, t.ex. 0,005 × 20 000.
    const produkt = Math.round(this.lagstaSaldo(man) * this.rantesats() * 1e6) / 1e6;
    const ranta = Math.floor(produkt);
    if (ranta <= 0) {
      return null;
    }
    const [ar, manadsnr] = man.split('-').map(Number);
    const sistaDag = new Date(Date.UTC(ar, manadsnr, 0)).getUTCDate();
    const t = new Transaktion(`${man}-${String(sistaDag).padStart(2, '0')}`, ranta, 'Ränta', `Ränta ${man}`);
    return this.laggTillTransaktion(t) ? t : null;
  }

  // Abstrakt: om kontotypen godtar en transaktion med belopp som ger nyttSaldo.
  tillaten(belopp, nyttSaldo) {
    throw new Error(`${this.constructor.name} implementerar inte tillaten(belopp, nyttSaldo).`);
  }

  // Abstrakt: räntesats per månad.
  rantesats() {
    throw new Error(`${this.constructor.name} implementerar inte rantesats().`);
  }

  // Abstrakt: kontotypens namn.
  kontotyp() {
    throw new Error(`${this.constructor.name} implementerar inte kontotyp().`);
  }
}
