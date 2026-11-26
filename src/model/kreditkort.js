// Kreditkort – K3. Saldot får gå ned till −LIMIT (−10 000 kr); kortet ger ingen ränta.

import { Konto } from './konto.js';

export class Kreditkort extends Konto {
  // Kreditgränsen (readOnly): privat och utan setter, så den kan inte ändras utifrån.
  static #LIMIT = 10000;

  tillaten(belopp, nyttSaldo) {
    return nyttSaldo >= -Kreditkort.#LIMIT;
  }

  rantesats() {
    return 0;
  }

  kontotyp() {
    return 'Kreditkort';
  }
}
