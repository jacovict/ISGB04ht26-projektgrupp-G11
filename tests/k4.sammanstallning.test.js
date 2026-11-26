// Tester för K4 Månadssammanställning (AK4.1–AK4.4) och beställarbeslut 3 och 4,
// testfall T19–T23 och T32 i docs/testprotokoll.docx.
// Raderna jämförs som objekt { kategori, budget, utfall, avvikelse, andel }. "–" är tankstreck (U+2013)
// och andel är text med en decimal, decimalkomma och vanligt mellanslag (U+0020) före "%".
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hushallModul from '../src/model/hushall.js';
import * as kontotyperModul from '../src/model/kontotyper.js';
import * as sammanstallningModul from '../src/logic/manadssammanstallning.js';

const { Hushall } = hushallModul;
const { Kontotyper } = kontotyperModul;
const { manadssammanstallning } = sammanstallningModul;

const STRECK = '–';

// Direktivets facit för räkneexemplet i 2026-11 (AK4.1).
const FACIT = [
  { kategori: 'Mat', budget: 3000, utfall: 3300, avvikelse: 300, andel: '110,0 %' },
  { kategori: 'Hälsa', budget: STRECK, utfall: 300, avvikelse: 300, andel: STRECK },
  { kategori: 'Boende', budget: 6500, utfall: 6500, avvikelse: 0, andel: '100,0 %' },
  { kategori: 'Nöje', budget: 500, utfall: 0, avvikelse: -500, andel: '0,0 %' },
];

// Skapar ett konto av kontotypen typ via singletonen Kontotyper (K3).
function skapaKonto(typ, namn, ingaendeSaldo) {
  return Kontotyper.hamta().skapa(typ, namn, ingaendeSaldo);
}

// Bygger räkneexemplet med de riktiga kontotyperna (används i T19, T20, T22, T23 och T32).
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

// Raden för kategorin i sammanställningen för manad.
function radFor(hushall, manad, kategori) {
  const rad = manadssammanstallning(hushall, manad).find((r) => r.kategori === kategori);
  assert.ok(rad, `raden ${kategori} saknas i sammanställningen för ${manad}`);
  return rad;
}

test('AK4.1 T19: räkneexemplet ger facit', () => {
  const hushall = byggRakneexemplet();

  assert.deepStrictEqual(manadssammanstallning(hushall, '2026-11'), FACIT);
});

test('AK4.2 T20: tom månad ger tom lista', () => {
  const hushall = byggRakneexemplet();

  let rader;
  assert.doesNotThrow(() => {
    rader = manadssammanstallning(hushall, '2026-12');
  });
  assert.deepStrictEqual(rader, []);
});

test('AK4.3 T21: lika avvikelse och utfall sorteras svenskt', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(skapaKonto('Kreditkort', 'Kort', 0));

  hushall.registreraTransaktion('Kort', '2026-12-05', 'Ärenden', -400, 'Test');
  hushall.registreraTransaktion('Kort', '2026-12-05', 'Åkeri', -400, 'Test');
  hushall.registreraTransaktion('Kort', '2026-12-05', 'Bio', -400, 'Test');

  assert.deepStrictEqual(manadssammanstallning(hushall, '2026-12'), [
    { kategori: 'Bio', budget: STRECK, utfall: 400, avvikelse: 400, andel: STRECK },
    { kategori: 'Åkeri', budget: STRECK, utfall: 400, avvikelse: 400, andel: STRECK },
    { kategori: 'Ärenden', budget: STRECK, utfall: 400, avvikelse: 400, andel: STRECK },
  ]);
});

test('AK4.4 T22: överföring och planerad påverkar inte', () => {
  const hushall = byggRakneexemplet();

  hushall.registreraTransaktion('Lön', '2026-12-02', 'Överföring', -1000, 'Till sparkontot');
  hushall.registreraTransaktion('Spar', '2026-12-02', 'Överföring', 1000, 'Från lönekontot');
  hushall.skapaBudgetpost('Hälsa', '2026-12', 600);

  assert.deepStrictEqual(manadssammanstallning(hushall, '2026-12'), []);
});

test('Beslut3 T23: ändrad transaktion räknas om', () => {
  const hushall = byggRakneexemplet();

  hushall.andraTransaktion('Kort', 2, '2026-11-20', 'Mat', 500, 'Retur av varor');
  assert.deepStrictEqual(radFor(hushall, '2026-11', 'Mat'), {
    kategori: 'Mat', budget: 3000, utfall: 3000, avvikelse: 0, andel: '100,0 %',
  });

  hushall.registreraTransaktion('Lön', '2026-10-15', 'Mat', -100, 'Lunch');
  hushall.andraTransaktion('Lön', 5, '2026-10-15', 'Mat', -150, 'Lunch');
  assert.deepStrictEqual(radFor(hushall, '2026-10', 'Mat'), {
    kategori: 'Mat', budget: 3000, utfall: 150, avvikelse: -2850, andel: '5,0 %',
  });
});

test('Beslut4 T32: kategorier med olika skiftläge blir en rad', () => {
  const hushall = byggRakneexemplet();

  hushall.registreraTransaktion('Kort', '2026-12-03', 'mat', -100, 'Test');
  hushall.registreraTransaktion('Lön', '2026-12-03', 'Mat', -200, 'Test');
  hushall.skapaBudgetpost('MAT', '2026-12', 500).aktiveraBudgetpost();

  assert.deepStrictEqual(manadssammanstallning(hushall, '2026-12'), [
    { kategori: 'Mat', budget: 500, utfall: 300, avvikelse: -200, andel: '60,0 %' },
  ]);
});
