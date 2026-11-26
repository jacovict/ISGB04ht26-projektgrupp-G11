// Kontotyper (singleton) – K3. Registret över kontotyper; enda stället som skapar konton av en viss typ.
// En ny kontotyp (AK3.3) läggs till med en egen fil och en rad i registret nedan.

import { ValideringsFel } from './fel.js';
import { formateraBelopp } from './kategori.js';
import { Lonekonto } from './lonekonto.js';
import { Sparkonto } from './sparkonto.js';
import { Kreditkort } from './kreditkort.js';

// Hemlig nyckel: bara hamta() kan anropa konstruktorn.
const hemligNyckel = Symbol('Kontotyper');

export class Kontotyper {
  static #instans = null;
  #register;

  constructor(nyckel) {
    if (nyckel !== hemligNyckel) {
      throw new Error('Använd Kontotyper.hamta()');
    }
    this.#register = new Map([
      ['Lönekonto', Lonekonto],
      ['Sparkonto', Sparkonto],
      ['Kreditkort', Kreditkort],
    ]);
  }

  // Returnerar alltid samma instans; första anropet skapar den.
  static hamta() {
    if (Kontotyper.#instans === null) {
      Kontotyper.#instans = new Kontotyper(hemligNyckel);
    }
    return Kontotyper.#instans;
  }

  // Typnamnen i registrets ordning.
  typer() {
    return [...this.#register.keys()];
  }

  // Skapar ett konto av kontotypen typ. Okänd typ → E-K3; tomt namn → E-K1 och ingående saldo
  // som inte är ett heltal → E-K4 (från Konto); saldo som kontotypen inte godtar → E-K5.
  skapa(typ, namn, ingaendeSaldo) {
    const Klass = this.#register.get(typ);
    if (!Klass) {
      throw new ValideringsFel(`Kontotypen "${typ ?? ''}" finns inte. Välj en kontotyp i listan.`);
    }
    const konto = new Klass(namn, ingaendeSaldo);
    // Den nya kontotypens egen regel prövas, med det ingående saldot som ändring från 0 kr.
    // Samma princip som i Hushall.andraKonto: ett ingående saldo på 0 kr är ingen ändring och prövas inte.
    // Saldot är det som Konto har tolkat (tolkaHeltal), inte det som skickades in, som kan vara text.
    const saldo = konto.ingaendeSaldo;
    if (saldo !== 0 && !konto.tillaten(saldo, saldo)) {
      throw new ValideringsFel(
        `Ingående saldo ${formateraBelopp(saldo)} är inte tillåtet för kontotypen ${konto.kontotyp()}. Ange ett högre ingående saldo eller välj en annan kontotyp.`
      );
    }
    return konto;
  }
}
