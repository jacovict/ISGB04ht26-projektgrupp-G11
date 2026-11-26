// Tester för K3 Kontotyper och regler (AK3.1) och beställarbeslut 3, testfall T12–T18 i docs/testprotokoll.docx.
// Testerna använder de riktiga kontotyperna via Kontotyper.hamta().skapa(typ, namn, ingaendeSaldo).
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hushallModul from '../src/model/hushall.js';
import * as kontotyperModul from '../src/model/kontotyper.js';
import * as felModul from '../src/model/fel.js';

const { Hushall } = hushallModul;
const { Kontotyper } = kontotyperModul;

// Kontrollerar att fn kastar felklassen namn från src/model/fel.js.
function forvantaFel(fn, namn) {
  const felklass = felModul[namn];
  assert.ok(felklass, `${namn} saknas i src/model/fel.js`);
  assert.throws(fn, felklass);
}

// Skapar ett konto av kontotypen typ via singletonen Kontotyper (K3).
function skapaKonto(typ, namn, ingaendeSaldo) {
  return Kontotyper.hamta().skapa(typ, namn, ingaendeSaldo);
}

// Bygger räkneexemplet med de riktiga kontotyperna (används i T16, T17 och T18).
function byggRakneexemplet() {
  const hushall = new Hushall();

  hushall.laggTillKonto(skapaKonto('Lönekonto', 'Lön', 12000));
  hushall.laggTillKonto(skapaKonto('Sparkonto', 'Spar', 20000));
  hushall.laggTillKonto(skapaKonto('Kreditkort', 'Kort', 0));

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

test('AK3.1 T12: lönekonto godtar −12 000', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(skapaKonto('Lönekonto', 'Lön', 12000));

  assert.doesNotThrow(() => {
    hushall.registreraTransaktion('Lön', '2026-11-01', 'Mat', -12000, 'Test');
  });

  const lon = hushall.hittaKonto('Lön');
  assert.equal(lon.hamtaTransaktioner().length, 1);
  assert.equal(lon.saldo(), 0);
});

test('AK3.1 T13: lönekonto nekar −12 001', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(skapaKonto('Lönekonto', 'Lön', 12000));

  forvantaFel(
    () => hushall.registreraTransaktion('Lön', '2026-11-01', 'Mat', -12001, 'Test'),
    'RegelFel'
  );

  const lon = hushall.hittaKonto('Lön');
  assert.equal(lon.hamtaTransaktioner().length, 0);
  assert.equal(lon.saldo(), 12000);
});

test('AK3.1 T14: kreditkort godtar −10 000', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(skapaKonto('Kreditkort', 'Kort', 0));

  assert.doesNotThrow(() => {
    hushall.registreraTransaktion('Kort', '2026-11-01', 'Mat', -10000, 'Test');
  });

  assert.equal(hushall.hittaKonto('Kort').saldo(), -10000);
});

test('AK3.1 T15: kreditkort nekar −10 001', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(skapaKonto('Kreditkort', 'Kort', 0));

  forvantaFel(
    () => hushall.registreraTransaktion('Kort', '2026-11-01', 'Mat', -10001, 'Test'),
    'RegelFel'
  );

  const kort = hushall.hittaKonto('Kort');
  assert.equal(kort.hamtaTransaktioner().length, 0);
  assert.equal(kort.saldo(), 0);
});

test('Beslut3 T16: ändring prövas mot saldogränsen', () => {
  const hushall = byggRakneexemplet();
  const lon = hushall.hittaKonto('Lön');

  forvantaFel(
    () => hushall.andraTransaktion('Lön', 2, '2026-11-03', 'Boende', -31701, 'Hyra'),
    'RegelFel'
  );
  assert.equal(lon.hamtaTransaktioner()[1].belopp, -6500);
  assert.equal(lon.saldo(), 25200);

  assert.doesNotThrow(() => {
    hushall.andraTransaktion('Lön', 2, '2026-11-03', 'Boende', -31700, 'Hyra');
  });
  assert.equal(lon.saldo(), 0);
});

test('AK3.1 T17: ränta sparkonto november = 100', () => {
  const hushall = byggRakneexemplet();

  const ranta = hushall.beraknaRanta('Spar', '2026-11');

  assert.ok(ranta, 'beraknaRanta ska returnera en transaktion');
  assert.equal(ranta.belopp, 100);
  assert.equal(ranta.kategori, 'Ränta');
  assert.equal(ranta.datum, '2026-11-30');

  const spar = hushall.hittaKonto('Spar');
  assert.equal(spar.hamtaTransaktioner().length, 2);
  assert.equal(spar.saldo(), 23100);
});

test('AK3.1 T18: ingen ränta på lönekonto', () => {
  const hushall = byggRakneexemplet();

  assert.equal(hushall.beraknaRanta('Lön', '2026-11'), null);
  assert.equal(hushall.hittaKonto('Lön').hamtaTransaktioner().length, 4);
});
