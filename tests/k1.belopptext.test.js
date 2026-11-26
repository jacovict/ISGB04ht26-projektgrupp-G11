// Tester för K1: tal som text (PO:s beslut i design.md avsnitt 7, tolkaHeltal), testfall T37 i docs/testprotokoll.docx.
// Belopp, ingående saldo och transaktionsnummer får komma som tal eller som text; text med annat än
// ett valfritt minustecken följt av siffror ger ValideringsFel (E-T2, E-B3, E-K4) eller E-T7.
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hushallModul from '../src/model/hushall.js';
import * as kontoModul from '../src/model/konto.js';
import * as kontotyperModul from '../src/model/kontotyper.js';
import * as felModul from '../src/model/fel.js';

const { Hushall } = hushallModul;
const { Kontotyper } = kontotyperModul;

// Ersätter Konto bara om den saknas i src/model/konto.js, så att TestKonto kan definieras.
const Konto = kontoModul.Konto ?? class KontoSaknas {
  constructor() {
    throw new Error('Konto saknas i src/model/konto.js');
  }
};

// Testkonto som godtar alla belopp, som i k1.entiteter.test.js.
class TestKonto extends Konto {
  kontotyp() {
    return 'Testkonto';
  }

  tillaten() {
    return true;
  }

  rantesats() {
    return 0;
  }
}

// Kontrollerar att fn kastar felklassen namn från src/model/fel.js.
function forvantaFel(fn, namn) {
  const felklass = felModul[namn];
  assert.ok(felklass, `${namn} saknas i src/model/fel.js`);
  assert.throws(fn, felklass);
}

test('K1 T37: tal som text tolkas eller nekas', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('Lön', 12000));

  // Transaktionsbelopp som text tolkas till tal.
  const utgift = hushall.registreraTransaktion('Lön', '2026-11-25', 'Mat', '-1200', 'Test');
  const insattning = hushall.registreraTransaktion('Lön', '2026-11-25', 'Mat', '1200', 'Test');
  assert.equal(typeof utgift.belopp, 'number');
  assert.equal(utgift.belopp, -1200);
  assert.equal(typeof insattning.belopp, 'number');
  assert.equal(insattning.belopp, 1200);

  // Transaktionsbelopp som inte är ett heltal i text nekas.
  for (const belopp of ['12 00', '12.5', '12,5', '500kr', 'tusen', '']) {
    forvantaFel(
      () => hushall.registreraTransaktion('Lön', '2026-11-25', 'Mat', belopp, 'Test'),
      'ValideringsFel'
    );
  }
  assert.equal(hushall.hittaKonto('Lön').hamtaTransaktioner().length, 2);

  // Budgetbelopp.
  const post = hushall.skapaBudgetpost('Mat', '2026-12', '3000');
  assert.equal(typeof post.belopp, 'number');
  assert.equal(post.belopp, 3000);
  forvantaFel(() => hushall.skapaBudgetpost('Hyra', '2026-12', '30 00'), 'ValideringsFel');

  // Ingående saldo via Kontotyper.
  const spar = Kontotyper.hamta().skapa('Lönekonto', 'Spar', '12000');
  assert.equal(typeof spar.ingaendeSaldo, 'number');
  assert.equal(spar.ingaendeSaldo, 12000);
  forvantaFel(() => Kontotyper.hamta().skapa('Lönekonto', 'Buffert', '12 000'), 'ValideringsFel');

  // Transaktionsnummer.
  hushall.andraTransaktion('Lön', '2', '2026-11-25', 'Mat', -250, 'Test');
  assert.equal(hushall.hittaKonto('Lön').hamtaTransaktioner()[1].belopp, -250);
  assert.throws(
    () => hushall.andraTransaktion('Lön', 'två', '2026-11-25', 'Mat', -250, 'Test'),
    (fel) => fel instanceof felModul.ValideringsFel || fel instanceof felModul.SaknasFel
  );
});
