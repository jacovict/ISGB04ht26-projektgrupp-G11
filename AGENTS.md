# Projekt: Hushållsbudgeten (ISGB04, grupp G11)

## Vad systemet gör
Studentbostadsföreningen Kollektivet Sandgrund i Karlstad driver ett gemensamt hushåll för tolv boende med ett lönekonto
för inbetalningar och räkningar, ett sparkonto för större inköp och ett kreditkort för löpande utgifter.
Föreningen vill ha ett litet program
där kassören kan lägga upp konton och budgetposter, registrera transaktioner med automatisk kontroll mot kontots regler,
få en månadssammanställning mot budgeten uträknad enligt föreningens regler och spara allt till fil.

## Arkitektur
- Moduler: `model/` (entiteter och regler, K1–K3), `logic/` (algoritm K4), `storage/` (filformat K5), `ui/` (gränssnitt K6), `tests/`.
- Gränssnittet får aldrig innehålla affärslogik. All validering sker i model/.
- Designen finns i `docs/design.md` (klassdiagram, modulkontrakt) och gränssnittets design i `docs/design-extern.md` (godkänd av produktägaren). Följ dem. Föreslå ändringar i stället för att avvika tyst.

## Språk och verktyg
- Språk: JavaScript (Node.js, ES-moduler), version Node.js 22 LTS (minst 20). Testramverk: Nodes inbyggda `node:test` med `node:assert`.
- Starta: `node src/ui/meny.js`. 
- Testa: `node --test`. Kör testerna efter varje ändring och rapportera resultatet.
- Byt namn på funktioner och variabler till camelCase om de inte redan följer den regeln.

## Regler för ändringar
- Arbeta med en backlog-post (issue) i taget. Ändra bara filer som posten kräver.
- Skriv eller uppdatera tester för det du ändrar. Tester ska testa krav (AK-nummer i testnamnet), inte spegla koden.
- Inga nya beroenden utan att fråga. Ingen serialisering av hela objektgrafen med JSON/XML/pickle (K5).
- Kommentera koden på svenska eller engelska, konsekvent.
- Hittar du en tvetydighet i kravet: stanna och fråga, gissa inte.

## Får inte
- Ta bort eller ändra tester för att få dem gröna.
- Lägga in personuppgifter i kod, tester eller exempeldata.
- Köra kommandon som ändrar filer utanför repot.

## Commits
- Commit ALDRIG något utan att fråga först.