// fil.js – K5, K7 d. Läser och skriver hushållets fil på disk. Enda modulen som använder node:fs;
// tolkning och skrivning av texten sker i filformat.js. Ändrar aldrig något hushåll i minnet.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SaknasFel, FilformatFel } from '../model/fel.js';
import { lasHushall, skrivHushall } from './filformat.js';

// Programmets fasta fil (design.md avsnitt 6).
export const STANDARDFIL = 'data/hushall.txt';

// Projektets rotmapp, räknad från den här filens plats (src/storage/), så att sökvägen inte beror
// på vilken mapp programmet startas från.
const ROTMAPP = fileURLToPath(new URL('../../', import.meta.url));

// Sökvägen till filnamn relativt projektets rotmapp.
export function sokvag(filnamn = STANDARDFIL) {
  return resolve(ROTMAPP, filnamn);
}

// Läser filen i UTF-8 och returnerar ett nytt Hushall (AK5.1). Filen finns inte → SaknasFel (E-F2);
// trasigt innehåll → FilformatFel (E-F3) med rad och orsak från lasHushall (AK5.2–5.4).
export function lasFil(filnamn = STANDARDFIL) {
  let text;
  try {
    text = readFileSync(sokvag(filnamn), 'utf8');
  } catch (fel) {
    if (fel.code === 'ENOENT') {
      throw new SaknasFel(
        `Filen "${filnamn}" finns inte än. Välj Spara för att skapa den. Data i programmet är oförändrad.`
      );
    }
    throw fel;
  }

  try {
    return lasHushall(text);
  } catch (fel) {
    if (fel instanceof FilformatFel) {
      throw new FilformatFel(
        `Filen "${filnamn}" kunde inte öppnas. ${fel.message} Rätta filen och försök igen. Data i programmet är oförändrad.`,
        fel.rad
      );
    }
    throw fel;
  }
}

// Skriver hushållet till filen och skapar mappen om den saknas. Kan filen inte skrivas →
// FilformatFel (E-F4); hushållet i minnet är oförändrat.
export function sparaFil(hushall, filnamn = STANDARDFIL) {
  const text = skrivHushall(hushall);
  const sokvagen = sokvag(filnamn);
  try {
    mkdirSync(dirname(sokvagen), { recursive: true });
    writeFileSync(sokvagen, text, 'utf8');
  } catch {
    throw new FilformatFel(
      `Filen "${filnamn}" kunde inte sparas. Kontrollera att filen inte är skrivskyddad eller öppen i ett annat program, och försök igen. Data i programmet är oförändrad.`
    );
  }
}
