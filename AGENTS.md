# Projekt: Hushållsbudgeten (ISGB04, grupp G11)

## Vad systemet gör
Studentbostadsföreningen Kollektivet Sandgrund i Karlstad driver ett gemensamt hushåll för tolv boende med ett lönekonto
för inbetalningar och räkningar, ett sparkonto för större inköp och ett kreditkort för löpande utgifter.
Föreningen vill ha ett litet program
där kassören kan lägga upp konton och budgetposter, registrera transaktioner med automatisk kontroll mot kontots regler,
få en månadssammanställning mot budgeten uträknad enligt föreningens regler och spara allt till fil.

## Arkitektur
- MVC. Moduler enligt `docs/design.md` avsnitt 2:
  - `src/model/` – entiteter, regler och varianter (K1–K3), felklasserna och `kategori.js`.
  - `src/logic/` – månadssammanställningen (algoritm K4).
  - `src/storage/` – `filformat.js` (tolkning och skrivning av text, K5) och `fil.js` (läser och skriver filen på disk med `node:fs`).
  - `src/ui/` – `server.js` (controller): tar emot anropen i API-tabellen och svarar med JSON.
  - `public/` – Webbvy (view): `index.html`, `app.js`, `style.css`.
  - `tests/` – tester, en fil per krav, namngivna `*.test.js`.
  - `data/` – programmets fasta fil `data/hushall.txt`.
- Varje modul får bara importera det som står i modulindelningen i `docs/design.md`.
- Gränssnittet (`src/ui/` och `public/`) får aldrig innehålla affärslogik. All validering sker i `src/model/` (AK6.3). Webbvy räknar inget; den visar det servern levererar.
- `server.js` använder aldrig `node:fs`. All filhantering sker i `src/storage/fil.js` (K7 d).
- Designen finns i `docs/design.md` (modulindelning, klasstabell, API-tabell, modulkontrakt, algoritm, filformat) och gränssnittets design i `docs/design-extern.md` (godkänd av produktägaren). Följ dem. Föreslå ändringar i stället för att avvika tyst. Klassdiagrammet är en bild; följ klasstabellen i `docs/design.md`.
- Beställarens svar finns i `docs/bestallarbeslut.docx` och gäller som tillägg till kravspecen. Koden ska följa dem.

## Språk och verktyg
- Språk: JavaScript (Node.js, ES-moduler), version Node.js 22 LTS. Testramverk: Nodes inbyggda `node:test` med `node:assert`.
- Inga externa paket och ingen `npm install`. Programmet ska fungera på en dator där bara Node.js är installerat (AK7.1).
- Webbsidorna får inte hämta något från internet (inga CDN-länkar, inga externa typsnitt eller bilder).
- Starta: `node src/ui/server.js` (öppna sedan http://localhost:3000).
- Testa: `node --test`. Kör testerna efter varje ändring och rapportera resultatet.
- Gruppen arbetar på både Windows och macOS. Använd inga skript eller kommandon som bara fungerar på ett av dem. Filer sparas i UTF-8.
- Byt namn på funktioner och variabler till camelCase om de inte redan följer den regeln.

## Regler för ändringar
- Arbeta med en backlog-post (issue) i taget. Ändra bara filer som posten kräver.
- Testfallen för K4, K5 och ÄB1 ska vara committade innan implementationen (K7 a). Skriv inte implementation för dem förrän produktägaren säger att testerna finns.
- Skriv eller uppdatera tester för det du ändrar. Tester ska testa krav (AK-nummer i testnamnet), inte spegla koden.
- `data/hushall.txt` är räkneexemplets exempelfil (AK5.5). Tester får aldrig skriva till den; de använder ett eget filnamn.
- Inga nya beroenden utan att fråga. Ingen serialisering av hela objektgrafen med JSON/XML/pickle i filformatet (K5).
- Kommentera koden på svenska eller engelska, konsekvent.
- Hittar du en tvetydighet i kravet: stanna och fråga, gissa inte.

## Får inte
- Ta bort eller ändra tester för att få dem gröna.
- Lägga in personuppgifter i kod, tester eller exempeldata.
- Köra kommandon som ändrar filer utanför repot.
- Skriva programkod för K1–K6 innan produktägaren ger ett uppdrag för det.
- Ändra filer i `docs/` om uppdraget inte säger det.

## Commits
- Commit ALDRIG något utan att fråga först.