// Tester för K1 Entiteter och tillstånd (AK1.1, AK1.2, AK1.3), testfall T1–T7 i docs/testprotokoll.docx.
// Beställarbeslut 1 (ändra finns), 3 (transaktion ändras på plats, även när budgetposten är Avslutad)
// och 4 (kategorier jämförs utan hänsyn till stora/små bokstäver).
//
// Modulerna importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hushallModul from '../src/model/hushall.js';
import * as kontoModul from '../src/model/konto.js';
import * as statusModul from '../src/model/status.js';
import * as felModul from '../src/model/fel.js';

const { Hushall } = hushallModul;
const { Status } = statusModul;

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

// Bygger räkneexemplet med TestKonto (används i T2, T4, T5 och T6).
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

test('AK1.1 T1: konto kan skapas, visas och ändras', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('Buffert', 5000));

  const konto = hushall.hittaKonto('Buffert');
  assert.equal(konto.namn, 'Buffert');
  assert.equal(konto.kontotyp(), 'Testkonto');
  assert.equal(konto.saldo(), 5000);

  hushall.andraKonto('Buffert', 'Reserv', 6000);

  const konton = hushall.hamtaKonton();
  assert.equal(konton.length, 1);
  assert.equal(konton[0].namn, 'Reserv');
  assert.equal(konton[0].kontotyp(), 'Testkonto');
  assert.equal(konton[0].saldo(), 6000);
});

test('AK1.1 T2: transaktion ändras på plats', () => {
  const hushall = byggRakneexemplet();

  hushall.andraTransaktion('Kort', 2, '2026-11-20', 'Mat', 500, 'Retur av varor');

  const kort = hushall.hittaKonto('Kort');
  assert.equal(kort.hamtaTransaktioner().length, 3);
  assert.equal(kort.hamtaTransaktioner()[1].belopp, 500);
  assert.equal(kort.saldo(), -1000);

  // Mat 2026-10 är Avslutad; transaktionen ska ändå kunna ändras (beställarbeslut 3).
  hushall.registreraTransaktion('Lön', '2026-10-15', 'Mat', -100, 'Lunch');
  assert.doesNotThrow(() => {
    hushall.andraTransaktion('Lön', 5, '2026-10-15', 'Mat', -150, 'Lunch');
  });

  const lon = hushall.hittaKonto('Lön');
  assert.equal(lon.hamtaTransaktioner().length, 5);
  assert.equal(lon.hamtaTransaktioner()[4].belopp, -150);
});

test('AK1.1 T3: budgetpost kan skapas, visas och ändras', () => {
  const hushall = new Hushall();

  const post = hushall.skapaBudgetpost('Nöje', '2026-12', 400);
  assert.equal(post.status, Status.PLANERAD);
  assert.equal(post.belopp, 400);

  post.nyttBelopp(600);
  assert.equal(post.belopp, 600);

  post.aktiveraBudgetpost();
  post.nyttBelopp(700);
  assert.equal(post.status, Status.AKTIV);
  assert.equal(post.belopp, 700);

  post.avslutaBudgetpost();
  assert.equal(post.status, Status.AVSLUTAD);

  const poster = hushall.hamtaBudgetposter();
  assert.equal(poster.length, 1);
  assert.equal(poster[0].kategori, 'Nöje');
  assert.equal(poster[0].manad, '2026-12');
  assert.equal(poster[0].belopp, 700);
  assert.equal(poster[0].status, Status.AVSLUTAD);
});

test('AK1.2 T4: avslutad kan inte aktiveras', () => {
  const hushall = byggRakneexemplet();
  const post = hushall.hittaBudgetpost('Mat', '2026-10');

  forvantaFel(() => post.aktiveraBudgetpost(), 'StatusFel');
  forvantaFel(() => post.nyttBelopp(3500), 'StatusFel');

  assert.equal(post.status, Status.AVSLUTAD);
  assert.equal(post.belopp, 3000);
});

test('AK1.2 T5: planerad kan inte avslutas', () => {
  const hushall = byggRakneexemplet();
  const post = hushall.hittaBudgetpost('Hälsa', '2026-11');

  forvantaFel(() => post.avslutaBudgetpost(), 'StatusFel');

  assert.equal(post.status, Status.PLANERAD);
  assert.equal(post.belopp, 600);
});

test('AK1.3 T6: transaktion kan inte få belopp 0', () => {
  const hushall = byggRakneexemplet();
  const lon = hushall.hittaKonto('Lön');

  forvantaFel(
    () => hushall.registreraTransaktion('Lön', '2026-11-25', 'Mat', 0, 'Noll'),
    'ValideringsFel'
  );
  assert.equal(lon.hamtaTransaktioner().length, 4);

  forvantaFel(
    () => hushall.andraTransaktion('Lön', 1, '2026-11-01', 'Inkomst', 0, 'Månadsavgifter'),
    'ValideringsFel'
  );
  assert.equal(lon.hamtaTransaktioner()[0].belopp, 25000);

  assert.doesNotThrow(() => {
    hushall.registreraTransaktion('Lön', '2026-11-25', 'Mat', 1, 'En krona');
  });
  assert.equal(lon.hamtaTransaktioner().length, 5);
});

test('AK1.3 T7: budgetpost kan inte få negativt belopp', () => {
  const hushall = new Hushall();

  let resor;
  assert.doesNotThrow(() => {
    resor = hushall.skapaBudgetpost('Resor', '2026-12', 0);
  });
  assert.equal(resor.belopp, 0);

  forvantaFel(() => hushall.skapaBudgetpost('Gym', '2026-12', -1), 'ValideringsFel');
  const gym = hushall.hamtaBudgetposter().filter((p) => p.kategori.toLowerCase() === 'gym');
  assert.equal(gym.length, 0);

  forvantaFel(() => resor.nyttBelopp(-1), 'ValideringsFel');
  assert.equal(resor.belopp, 0);
});
