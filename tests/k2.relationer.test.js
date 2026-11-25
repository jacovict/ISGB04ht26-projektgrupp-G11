// Tester för K2 Relationer och integritet (AK2.1, AK2.2, AK2.3), testfall T8–T11 i docs/testprotokoll.docx.
// Beställarbeslut 4 (kategorier jämförs utan hänsyn till stora/små bokstäver, även i K2).
// Kontonamn jämförs utan hänsyn till stora/små bokstäver (beställarbeslut 6, design.md avsnitt 7).
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hushallModul from '../src/model/hushall.js';
import * as kontoModul from '../src/model/konto.js';
import * as felModul from '../src/model/fel.js';

const { Hushall } = hushallModul;

// Ersätter Konto bara om den saknas i src/model/konto.js, så att TestKonto kan definieras.
const Konto = kontoModul.Konto ?? class KontoSaknas {
  constructor() {
    throw new Error('Konto saknas i src/model/konto.js');
  }
};

// Testkonto som godtar alla belopp. Testerna använder inte Kontotyper eller de riktiga kontotyperna.
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

// Bygger räkneexemplet med TestKonto (används i T8–T11).
function byggRakneexemplet() {
  const hushall = new Hushall();

  hushall.laggTillKonto(new TestKonto('Lön', 12000));
  hushall.laggTillKonto(new TestKonto('Spar', 20000));
  hushall.laggTillKonto(new TestKonto('Kort', 0));

  hushall.skapaBudgetpost('Boende', '2026-11', 6500).aktiveraBudgetpost();
  hushall.skapaBudgetpost('Mat', '2026-11', 3000).aktiveraBudgetpost();
  hushall.skapaBudgetpost('Nöje', '2026-11', 500).aktiveraBudgetpost();
  hushall.skapaBudgetpost('Hälsa', '2026-11', 600);
  const matOktober = hushall.skapaBudgetpost('Mat', '2026-10', 3000);
  matOktober.aktiveraBudgetpost();
  matOktober.avslutaBudgetpost();

  hushall.registreraTransaktion('Lön', '2026-11-01', 'Inkomst', 25000, 'Månadsavgifter');
  hushall.registreraTransaktion('Lön', '2026-11-03', 'Boende', -6500, 'Hyra');
  hushall.registreraTransaktion('Lön', '2026-11-05', 'Överföring', -3000, 'Till sparkontot');
  hushall.registreraTransaktion('Spar', '2026-11-05', 'Överföring', 3000, 'Från lönekontot');
  hushall.registreraTransaktion('Kort', '2026-11-08', 'Mat', -1200, 'Storhandling');
  hushall.registreraTransaktion('Kort', '2026-11-20', 'Mat', 200, 'Retur av varor');
  hushall.registreraTransaktion('Lön', '2026-11-22', 'Mat', -2300, 'Veckohandling');
  hushall.registreraTransaktion('Kort', '2026-11-30', 'Hälsa', -300, 'Apotek');

  return hushall;
}

test('AK2.1 T8: transaktion för okänt konto nekas', () => {
  const hushall = byggRakneexemplet();

  forvantaFel(
    () => hushall.registreraTransaktion('Lönn', '2026-11-25', 'Mat', -100, 'Test'),
    'SaknasFel'
  );

  assert.equal(hushall.hittaKonto('Lön').hamtaTransaktioner().length, 4);
  assert.equal(hushall.hittaKonto('Spar').hamtaTransaktioner().length, 1);
  assert.equal(hushall.hittaKonto('Kort').hamtaTransaktioner().length, 3);
});

test('AK2.2 T9: konto med transaktioner kan inte tas bort', () => {
  const hushall = byggRakneexemplet();

  forvantaFel(() => hushall.taBortKonto('Kort'), 'RegelFel');

  assert.equal(hushall.hamtaKonton().length, 3);
  assert.equal(hushall.hittaKonto('Kort').hamtaTransaktioner().length, 3);
});

test('AK2.2 T10: konto utan transaktioner kan tas bort', () => {
  const hushall = byggRakneexemplet();
  hushall.laggTillKonto(new TestKonto('Tomt', 0));

  assert.doesNotThrow(() => {
    hushall.taBortKonto('Tomt');
  });

  const namn = hushall.hamtaKonton().map((k) => k.namn);
  assert.deepEqual([...namn].sort(), ['Lön', 'Spar', 'Kort'].sort());
});

test('AK2.3 T11: dubblett nekas oavsett status', () => {
  const hushall = byggRakneexemplet();

  // Befintlig Mat 2026-10 är Avslutad.
  forvantaFel(() => hushall.skapaBudgetpost('Mat', '2026-10', 100), 'DubblettFel');
  // Befintlig Hälsa 2026-11 är Planerad.
  forvantaFel(() => hushall.skapaBudgetpost('Hälsa', '2026-11', 100), 'DubblettFel');
  // Befintlig Mat 2026-11 är Aktiv; kategorier jämförs utan hänsyn till stora/små bokstäver (beslut 4).
  forvantaFel(() => hushall.skapaBudgetpost('mat', '2026-11', 100), 'DubblettFel');

  assert.doesNotThrow(() => {
    hushall.skapaBudgetpost('Mat', '2026-12', 100);
  });

  assert.equal(hushall.hamtaBudgetposter().length, 6);
});
