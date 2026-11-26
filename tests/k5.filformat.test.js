// Tester för K5 Filformat och fil (AK5.1–AK5.5) och beställarbeslut 6,
// testfall T24–T28, T33 och T34 i docs/testprotokoll.docx.
// Radnummer räknas från 1 (versionsraden). Ändringar görs i en kopia av EXEMPEL.
// Inget test skriver till data/hushall.txt eller data/hushallExempel.txt; T24 använder data/test-rundresa.txt.
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as hushallModul from '../src/model/hushall.js';
import * as kontotyperModul from '../src/model/kontotyper.js';
import * as felModul from '../src/model/fel.js';
import * as filformatModul from '../src/storage/filformat.js';
import * as filModul from '../src/storage/fil.js';
import * as sammanstallningModul from '../src/logic/manadssammanstallning.js';

const { Hushall } = hushallModul;
const { Kontotyper } = kontotyperModul;
const { lasHushall } = filformatModul;
const { lasFil, sparaFil } = filModul;
const { manadssammanstallning } = sammanstallningModul;

const STRECK = '–';

// Räkneexemplet i filformatet (design.md avsnitt 6), 20 rader utan tomma rader.
const EXEMPEL = [
  'HUSHALL;1',
  '[KONTON]',
  'Lön;Lönekonto;12000',
  'Spar;Sparkonto;20000',
  'Kort;Kreditkort;0',
  '[BUDGETPOSTER]',
  'Boende;2026-11;6500;Aktiv',
  'Mat;2026-11;3000;Aktiv',
  'Nöje;2026-11;500;Aktiv',
  'Hälsa;2026-11;600;Planerad',
  'Mat;2026-10;3000;Avslutad',
  '[TRANSAKTIONER]',
  'Lön;2026-11-01;25000;Inkomst;Månadsavgifter',
  'Lön;2026-11-03;-6500;Boende;Hyra',
  'Lön;2026-11-05;-3000;Överföring;Till sparkontot',
  'Spar;2026-11-05;3000;Överföring;Från lönekontot',
  'Kort;2026-11-08;-1200;Mat;Storhandling',
  'Kort;2026-11-20;200;Mat;Retur av varor',
  'Lön;2026-11-22;-2300;Mat;Veckohandling',
  'Kort;2026-11-30;-300;Hälsa;Apotek',
].join('\n');

// Direktivets facit för räkneexemplet i 2026-11 (AK4.1), samma som i T19.
const FACIT = [
  { kategori: 'Mat', budget: 3000, utfall: 3300, avvikelse: 300, andel: '110,0 %' },
  { kategori: 'Hälsa', budget: STRECK, utfall: 300, avvikelse: 300, andel: STRECK },
  { kategori: 'Boende', budget: 6500, utfall: 6500, avvikelse: 0, andel: '100,0 %' },
  { kategori: 'Nöje', budget: 500, utfall: 0, avvikelse: -500, andel: '0,0 %' },
];

// Kopia av EXEMPEL där rad nr (räknat från 1) är utbytt mot text.
function bytRad(nr, text) {
  const rader = EXEMPEL.split('\n');
  rader[nr - 1] = text;
  return rader.join('\n');
}

// Kontrollerar att fn kastar FilformatFel med fältet rad.
function forvantaFilformatFel(fn, rad) {
  const felklass = felModul.FilformatFel;
  assert.ok(felklass, 'FilformatFel saknas i src/model/fel.js');
  let fangat;
  assert.throws(() => {
    try {
      fn();
    } catch (fel) {
      fangat = fel;
      throw fel;
    }
  }, felklass);
  assert.equal(fangat.rad, rad);
  return fangat;
}

// Antalet transaktioner på alla konton i hushållet.
function antalTransaktioner(hushall) {
  return hushall.hamtaKonton().reduce((summa, k) => summa + k.hamtaTransaktioner().length, 0);
}

// Skapar ett konto av kontotypen typ via singletonen Kontotyper (K3).
function skapaKonto(typ, namn, ingaendeSaldo) {
  return Kontotyper.hamta().skapa(typ, namn, ingaendeSaldo);
}

// Bygger räkneexemplet med de riktiga kontotyperna (används i T24).
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

// Hushållets konton med transaktioner, sorterade på namn, för jämförelse i T24.
function kontonSomData(hushall) {
  return hushall
    .hamtaKonton()
    .map((k) => ({
      namn: k.namn,
      kontotyp: k.kontotyp(),
      ingaendeSaldo: k.ingaendeSaldo,
      transaktioner: k.hamtaTransaktioner().map((t) => ({
        datum: t.datum,
        belopp: t.belopp,
        kategori: t.kategori,
        beskrivning: t.beskrivning,
      })),
    }))
    .sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
}

// Hushållets budgetposter, sorterade på kategori och månad, för jämförelse i T24.
function budgetposterSomData(hushall) {
  return hushall
    .hamtaBudgetposter()
    .map((p) => ({ kategori: p.kategori, manad: p.manad, belopp: p.belopp, status: p.status }))
    .sort((a, b) => a.kategori.localeCompare(b.kategori, 'sv') || a.manad.localeCompare(b.manad));
}

test('AK5.1 T24: rundresa ger samma data', (t) => {
  const testfil = 'data/test-rundresa.txt';
  t.after(() => {
    rmSync(fileURLToPath(new URL('../data/test-rundresa.txt', import.meta.url)), { force: true });
  });

  const a = byggRakneexemplet();
  sparaFil(a, testfil);
  const b = lasFil(testfil);

  assert.deepStrictEqual(kontonSomData(b), kontonSomData(a));
  assert.deepStrictEqual(budgetposterSomData(b), budgetposterSomData(a));
});

test('AK5.2 T25: okänt konto ger fel på rad 14', () => {
  const a = lasHushall(EXEMPEL);
  const kopia = bytRad(14, 'Lönn;2026-11-03;-6500;Boende;Hyra');

  const fel = forvantaFilformatFel(() => lasHushall(kopia), 14);
  assert.ok(String(fel.message).includes('Lönn'), `meddelandet "${fel.message}" ska innehålla "Lönn"`);

  assert.equal(a.hamtaKonton().length, 3);
  assert.equal(antalTransaktioner(a), 8);
});

test('AK5.3 T26: belopp som inte är heltal ger fel på rad 9', () => {
  forvantaFilformatFel(() => lasHushall(bytRad(9, 'Nöje;2026-11;tusen;Aktiv')), 9);
  forvantaFilformatFel(() => lasHushall(bytRad(9, 'Nöje;2026-11;500kr;Aktiv')), 9);
});

test('AK5.4 T27: okänd status ger fel på rad 7', () => {
  forvantaFilformatFel(() => lasHushall(bytRad(7, 'Boende;2026-11;6500;Klar')), 7);
});

test('AK5.5 T28: exempelfilen kan öppnas', () => {
  let hushall;
  assert.doesNotThrow(() => {
    hushall = lasFil('data/hushallExempel.txt');
  });

  assert.equal(hushall.hamtaKonton().length, 3);
  assert.equal(hushall.hamtaBudgetposter().length, 5);
  assert.equal(antalTransaktioner(hushall), 8);
  assert.deepStrictEqual(manadssammanstallning(hushall, '2026-11'), FACIT);
});

test('Beslut6 T33: transaktion med annat skiftläge i filen hamnar på rätt konto', () => {
  const kopia = bytRad(14, 'LÖN;2026-11-03;-6500;Boende;Hyra');

  let hushall;
  assert.doesNotThrow(() => {
    hushall = lasHushall(kopia);
  });

  const konton = hushall.hamtaKonton();
  assert.equal(konton.length, 3);
  assert.ok(!konton.some((k) => k.namn === 'LÖN'), 'inget konto får heta "LÖN"');

  const lon = konton.find((k) => k.namn === 'Lön');
  assert.ok(lon, 'kontot "Lön" saknas');
  const transaktioner = lon.hamtaTransaktioner();
  assert.equal(transaktioner.length, 4);
  assert.ok(
    transaktioner.some((tr) => tr.belopp === -6500 && tr.kategori === 'Boende'),
    'kontot "Lön" ska ha transaktionen −6500 Boende'
  );
  assert.equal(lon.saldo(), 25200);
});

test('Beslut6 T34: två konton med samma namn i filen ger fel på rad 6', () => {
  const rader = EXEMPEL.split('\n');
  rader.splice(5, 0, 'LÖN;Lönekonto;0');
  const kopia = rader.join('\n');

  forvantaFilformatFel(() => lasHushall(kopia), 6);
});
