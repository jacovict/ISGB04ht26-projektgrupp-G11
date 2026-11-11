# Projekt: ⟨namn⟩ (ISGB04, grupp G⟨nn⟩)

## Vad systemet gör
⟨Två meningar ur projektdirektivet.⟩

## Arkitektur
- Moduler: `model/` (entiteter och regler, K1–K3), `logic/` (algoritm K4), `storage/` (filformat K5), `ui/` (gränssnitt K6), `tests/`.
- Gränssnittet får aldrig innehålla affärslogik. All validering sker i model/.
- Designen finns i `docs/design.md` (klassdiagram, modulkontrakt) och gränssnittets design i `docs/design-extern.md` (godkänd av produktägaren). Följ dem. Föreslå ändringar i stället för att avvika tyst.

## Språk och verktyg
- Språk: ⟨…⟩, version ⟨…⟩. Testramverk: ⟨…⟩.
- Starta: `⟨kommando⟩`. Testa: `⟨kommando⟩`. Kör testerna efter varje ändring och rapportera resultatet.

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