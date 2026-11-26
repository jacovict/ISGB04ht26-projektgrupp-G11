// filformat.js – K5. Tolkar och skriver hushållets textformat (design.md avsnitt 6). Bara text, ingen disk.
// Filen läses med modellens egna metoder, så att modellens regler gäller även för filen och ingen
// kontroll görs två gånger. Ingen serialisering av objektgrafen med JSON/XML (K5).

import { Hushall } from '../model/hushall.js';
import { Kontotyper } from '../model/kontotyper.js';
import { Status } from '../model/status.js';
import {
  FilformatFel,
  ValideringsFel,
  DubblettFel,
  SaknasFel,
  RegelFel,
  StatusFel,
} from '../model/fel.js';

const VERSIONSRAD = 'HUSHALL;1';
const KONTON = '[KONTON]';
const BUDGETPOSTER = '[BUDGETPOSTER]';
const TRANSAKTIONER = '[TRANSAKTIONER]';

// Antal fält per rad i varje sektion.
const ANTAL_FALT = {
  [KONTON]: 3, // namn;kontotyp;ingående saldo
  [BUDGETPOSTER]: 4, // kategori;månad;belopp;status
  [TRANSAKTIONER]: 5, // konto;datum;belopp;kategori;beskrivning
};

// Ett belopp i filen är ett eventuellt minustecken följt av siffror (AK5.3), så "500kr" nekas.
const HELTAL = /^-?\d+$/;

// Felklasserna som modellen kastar. Deras meddelanden ges efter "Rad {n}: ".
const MODELLFEL = [ValideringsFel, DubblettFel, SaknasFel, RegelFel, StatusFel];

// ---------- Läsa ----------

// Bygger ett nytt Hushall av filens text (AK5.1). Vid fel kastas FilformatFel med fältet rad och
// meddelandet "Rad {n}: {orsak}" (AK5.2–5.4). Inget befintligt hushåll berörs (K5).
export function lasHushall(text) {
  // BOM i början av filen tas bort; både \n och \r\n godtas.
  const rader = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/);

  if (rader[0] !== VERSIONSRAD) {
    throw radfel(1, 'första raden ska vara HUSHALL;1.');
  }

  const hushall = new Hushall();
  let sektion = null;

  // Radnummer räknas från 1 (versionsraden); tomma rader hoppas över men räknas.
  for (let i = 1; i < rader.length; i++) {
    const nr = i + 1;
    const rad = rader[i];

    if (rad.trim() === '') {
      continue;
    }

    if (arSektionsrad(rad)) {
      if (!(rad in ANTAL_FALT)) {
        throw radfel(nr, `okänd sektion "${rad}".`);
      }
      sektion = rad;
      continue;
    }

    if (sektion === null) {
      throw radfel(nr, 'raden ligger utanför en sektion.');
    }

    const falt = delaRad(rad);
    const vantat = ANTAL_FALT[sektion];
    if (falt.length !== vantat) {
      throw radfel(nr, `fel antal fält (${falt.length}, ska vara ${vantat}).`);
    }

    try {
      if (sektion === KONTON) {
        lasKonto(hushall, falt, nr);
      } else if (sektion === BUDGETPOSTER) {
        lasBudgetpost(hushall, falt, nr);
      } else {
        lasTransaktion(hushall, falt, nr);
      }
    } catch (fel) {
      if (fel instanceof FilformatFel) {
        throw fel;
      }
      if (MODELLFEL.some((klass) => fel instanceof klass)) {
        throw radfel(nr, fel.message);
      }
      throw fel;
    }
  }

  return hushall;
}

// Konto: namn;kontotyp;ingående saldo. Kontot skapas av Kontotyper (K3) och läggs till i hushållet,
// som nekar ett namn som redan finns utan hänsyn till skiftläge (beställarbeslut 6).
function lasKonto(hushall, [namn, typ, saldotext], nr) {
  const saldo = lasBelopp(saldotext, nr);
  const konto = Kontotyper.hamta().skapa(typ, namn, saldo);
  try {
    hushall.laggTillKonto(konto);
  } catch (fel) {
    if (fel instanceof DubblettFel) {
      throw radfel(nr, `kontot "${namn}" finns redan i filen.`);
    }
    throw fel;
  }
}

// Budgetpost: kategori;månad;belopp;status. Posten skapas som Planerad och förs till filens status
// med modellens egna övergångar (AK5.4).
function lasBudgetpost(hushall, [kategori, manad, beloppstext, status], nr) {
  const belopp = lasBelopp(beloppstext, nr);
  const statusar = Object.values(Status);
  if (!statusar.includes(status)) {
    throw radfel(nr, `statusen "${status}" finns inte (${statusar.join(', ')}).`);
  }

  const post = hushall.skapaBudgetpost(kategori, manad, belopp);
  if (status === Status.AKTIV || status === Status.AVSLUTAD) {
    post.aktiveraBudgetpost();
  }
  if (status === Status.AVSLUTAD) {
    post.avslutaBudgetpost();
  }
}

// Transaktion: konto;datum;belopp;kategori;beskrivning. Kontot söks utan hänsyn till skiftläge
// (beställarbeslut 6); finns det inte i filen ges AK5.2-felet.
function lasTransaktion(hushall, [kontonamn, datum, beloppstext, kategori, beskrivning], nr) {
  let konto;
  try {
    konto = hushall.hittaKonto(kontonamn);
  } catch (fel) {
    if (fel instanceof SaknasFel) {
      throw radfel(nr, `kontot "${kontonamn}" finns inte i filen.`);
    }
    throw fel;
  }
  const belopp = lasBelopp(beloppstext, nr);
  hushall.registreraTransaktion(konto.namn, datum, kategori, belopp, beskrivning);
}

// Ett beloppsfält ska vara ett heltal (AK5.3).
function lasBelopp(text, nr) {
  if (!HELTAL.test(text)) {
    throw radfel(nr, `beloppet "${text}" är inte ett heltal.`);
  }
  return Number(text);
}

// En rad som börjar med [ och slutar med ] och saknar semikolon är en sektionsrubrik.
function arSektionsrad(rad) {
  return rad.startsWith('[') && rad.endsWith(']') && !rad.includes(';');
}

// Delar raden vid semikolon som inte är skrivna \; och tolkar \; som ; och \\ som \.
// Ett omvänt snedstreck före något annat tecken lämnas som det står.
function delaRad(rad) {
  const falt = [];
  let aktuellt = '';
  for (let i = 0; i < rad.length; i++) {
    const tecken = rad[i];
    const nasta = rad[i + 1];
    if (tecken === '\\' && (nasta === ';' || nasta === '\\')) {
      aktuellt += nasta;
      i++;
    } else if (tecken === ';') {
      falt.push(aktuellt);
      aktuellt = '';
    } else {
      aktuellt += tecken;
    }
  }
  falt.push(aktuellt);
  return falt;
}

function radfel(nr, orsak) {
  return new FilformatFel(`Rad ${nr}: ${orsak}`, nr);
}

// ---------- Skriva ----------

// Skriver hushållet som text enligt avsnitt 6, som lasHushall läser tillbaka till samma data (AK5.1).
// Versionsraden, sedan konton, budgetposter och transaktioner konto för konto i kontots ordning.
// Radslut \n och inga tomma rader.
export function skrivHushall(hushall) {
  const rader = [VERSIONSRAD, KONTON];
  const konton = hushall.hamtaKonton();

  for (const konto of konton) {
    rader.push([skydda(konto.namn), skydda(konto.kontotyp()), konto.ingaendeSaldo].join(';'));
  }

  rader.push(BUDGETPOSTER);
  for (const post of hushall.hamtaBudgetposter()) {
    rader.push([skydda(post.kategori), post.manad, post.belopp, post.status].join(';'));
  }

  rader.push(TRANSAKTIONER);
  for (const konto of konton) {
    for (const t of konto.hamtaTransaktioner()) {
      rader.push(
        [skydda(konto.namn), t.datum, t.belopp, skydda(t.kategori), skydda(t.beskrivning)].join(';')
      );
    }
  }

  return rader.join('\n') + '\n';
}

// Specialtecken i textfält: \ skrivs \\ och ; skrivs \;.
function skydda(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;');
}
