// Tester för K1 (unikt kontonamn) och K2 (AK2.1) enligt beställarbeslut 6, testfall T29, T30, T31 och T35
// i docs/testprotokoll.docx. Kontonamn jämförs utan hänsyn till stora och små bokstäver och visas som de skrevs.
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

test('Beslut6 T29: nytt konto med annat skiftläge nekas', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('Lön', 12000));

  forvantaFel(() => hushall.laggTillKonto(new TestKonto('lön', 0)), 'DubblettFel');
  forvantaFel(() => hushall.laggTillKonto(new TestKonto('LÖN', 0)), 'DubblettFel');

  const konton = hushall.hamtaKonton();
  assert.equal(konton.length, 1);
  assert.equal(konton[0].namn, 'Lön');
  assert.equal(konton[0].saldo(), 12000);
});

test('AK2.1 T30: transaktion med annat skiftläge hamnar på befintligt konto', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('Lön', 12000));

  assert.doesNotThrow(() => {
    hushall.registreraTransaktion('lön', '2026-11-25', 'Mat', -100, 'Test');
  });

  const lon = hushall.hittaKonto('Lön');
  const transaktioner = lon.hamtaTransaktioner();
  assert.equal(transaktioner.length, 1);
  assert.equal(transaktioner[0].belopp, -100);
  assert.equal(lon.saldo(), 11900);
  assert.equal(hushall.hamtaKonton().length, 1);
});

test('Beslut6 T31: namnet visas som det skrevs', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('LÖN', 5000));

  assert.equal(hushall.hittaKonto('lön').namn, 'LÖN');

  const konton = hushall.hamtaKonton();
  assert.equal(konton.length, 1);
  assert.equal(konton[0].namn, 'LÖN');
});

test('Beslut6 T35: namnbyte jämförs mot andra konton men inte mot sig självt', () => {
  const hushall = new Hushall();
  hushall.laggTillKonto(new TestKonto('Lön', 12000));
  hushall.laggTillKonto(new TestKonto('Spar', 20000));

  forvantaFel(() => hushall.andraKonto('Spar', 'LÖN', 20000), 'DubblettFel');
  const spar = hushall.hamtaKonton().find((k) => k.namn === 'Spar');
  assert.ok(spar, 'kontot heter inte längre "Spar"');
  assert.equal(spar.saldo(), 20000);

  assert.doesNotThrow(() => {
    hushall.andraKonto('Lön', 'LÖN', 12000);
  });

  const konton = hushall.hamtaKonton().map((k) => [k.namn, k.saldo()]);
  assert.equal(konton.length, 2);
  assert.deepEqual(
    [...konton].sort((a, b) => a[0].localeCompare(b[0])),
    [['LÖN', 12000], ['Spar', 20000]]
  );
});
