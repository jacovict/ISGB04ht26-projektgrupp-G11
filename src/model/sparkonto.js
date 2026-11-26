// Sparkonto – K3. Saldot får inte bli negativt; räntan är 0,5 % per månad på lägsta saldot.

import { Konto } from './konto.js';

export class Sparkonto extends Konto {
  tillaten(belopp, nyttSaldo) {
    return nyttSaldo >= 0;
  }

  rantesats() {
    return 0.005;
  }

  kontotyp() {
    return 'Sparkonto';
  }
}
