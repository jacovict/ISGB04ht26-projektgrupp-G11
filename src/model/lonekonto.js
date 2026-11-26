// Lönekonto – K3. Saldot får inte bli negativt och kontot ger ingen ränta.

import { Konto } from './konto.js';

export class Lonekonto extends Konto {
  tillaten(belopp, nyttSaldo) {
    return nyttSaldo >= 0;
  }

  rantesats() {
    return 0;
  }

  kontotyp() {
    return 'Lönekonto';
  }
}
