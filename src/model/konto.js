// Konto (abstrakt) – K1, K3. Subklasserna implementerar tillaten, rantesats och kontotyp.

import { ValideringsFel } from './fel.js';

// Kontrollerar att kontonamnet inte är tomt (E-K1) och returnerar det utan omgivande blanksteg.
export function kontrolleraKontonamn(namn) {
  const text = String(namn ?? '').trim();
  if (text === '') {
    throw new ValideringsFel('Kontonamnet saknas. Skriv ett namn på kontot.');
  }
  return text;
}

// Kontrollerar att ingående saldo är ett heltal (E-K4).
export function kontrolleraIngaendeSaldo(saldo) {
  if (!Number.isInteger(saldo)) {
    throw new ValideringsFel(
      `Ingående saldo "${saldo ?? ''}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, till exempel 12000 eller -500.`
    );
  }
  return saldo;
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
