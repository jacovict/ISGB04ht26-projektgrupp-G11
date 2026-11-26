// Tester för K6 Gränssnitt, serverdelen (AK6.2, PO:s beslut om tal som text), testfall T38–T41 i
// docs/testprotokoll.docx. T42 är manuellt och kodas inte.
// Varje test startar en egen server på port 0 med start från src/ui/server.js och stänger den efteråt.
// Testerna kontrollerar status och felklass, inte meddelandets text (bara att det inte är tomt).
//
// Servermodulen importeras som namespace så att filen går att ladda även innan implementationen finns;
// då blir varje test rött för sig i stället för att hela filen kraschar vid inläsning.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as serverModul from '../src/ui/server.js';

// Startar en ny server på en ledig port och stänger den när testet är klart. Returnerar basadressen.
async function startaServer(t) {
  assert.equal(typeof serverModul.start, 'function', 'start(port) saknas i src/ui/server.js');
  const server = await serverModul.start(0);
  t.after(() => new Promise((klar) => server.close(klar)));
  return `http://localhost:${server.address().port}`;
}

// Skickar ett anrop med JSON och returnerar status och svarets JSON.
async function anropa(bas, metod, adress, data) {
  const svar = await fetch(bas + adress, {
    method: metod,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: svar.status, kropp: await svar.json() };
}

// Kontrollerar ett felsvar: status 400, felklassens namn och ett meddelande som inte är tomt.
function forvantaFelsvar(svar, felklass) {
  assert.equal(svar.status, 400);
  assert.equal(svar.kropp.fel, felklass);
  assert.equal(typeof svar.kropp.meddelande, 'string');
  assert.notEqual(svar.kropp.meddelande, '');
}

const lon = `/konton/${encodeURIComponent('Lön')}`;

// Gemensam start för T38–T41: servern med kontot Lön (Lönekonto, 12000).
async function startaMedLon(t) {
  const bas = await startaServer(t);
  await anropa(bas, 'POST', '/konton', { namn: 'Lön', typ: 'Lönekonto', ingaendeSaldo: 12000 });
  return bas;
}

test('AK6.2 T38: transaktion för konto som inte finns ger fel', async (t) => {
  const bas = await startaMedLon(t);

  const svar = await anropa(bas, 'POST', `/konton/${encodeURIComponent('Lönn')}/transaktioner`, {
    datum: '2026-11-25',
    kategori: 'Mat',
    belopp: -100,
    beskrivning: 'Test',
  });
  forvantaFelsvar(svar, 'SaknasFel');

  const konto = await anropa(bas, 'GET', lon);
  assert.equal(konto.status, 200);
  assert.equal(konto.kropp.transaktioner.length, 0);
  assert.equal(konto.kropp.saldo, 12000);
});

test('AK6.2 T39: belopp 0 ger fel', async (t) => {
  const bas = await startaMedLon(t);

  const svar = await anropa(bas, 'POST', `${lon}/transaktioner`, {
    datum: '2026-11-25',
    kategori: 'Mat',
    belopp: 0,
    beskrivning: 'Test',
  });
  forvantaFelsvar(svar, 'ValideringsFel');

  const konto = await anropa(bas, 'GET', lon);
  assert.equal(konto.status, 200);
  assert.equal(konto.kropp.transaktioner.length, 0);
  assert.equal(konto.kropp.saldo, 12000);
});

test('AK6.2 T40: datum i fel format ger fel', async (t) => {
  const bas = await startaMedLon(t);

  for (const datum of ['26-11-25', '2026-13-01', '2026-02-30']) {
    const svar = await anropa(bas, 'POST', `${lon}/transaktioner`, {
      datum,
      kategori: 'Mat',
      belopp: -100,
      beskrivning: 'Test',
    });
    forvantaFelsvar(svar, 'ValideringsFel');
  }

  const konto = await anropa(bas, 'GET', lon);
  assert.equal(konto.status, 200);
  assert.equal(konto.kropp.transaktioner.length, 0);
});

test('K6 T41: belopp som text med mellanslag ger fel via servern', async (t) => {
  const bas = await startaMedLon(t);

  const svar = await anropa(bas, 'POST', `${lon}/transaktioner`, {
    datum: '2026-11-25',
    kategori: 'Mat',
    belopp: '12 00',
    beskrivning: 'Test',
  });
  forvantaFelsvar(svar, 'ValideringsFel');

  const konto = await anropa(bas, 'GET', lon);
  assert.equal(konto.status, 200);
  assert.equal(konto.kropp.transaktioner.length, 0);
});
