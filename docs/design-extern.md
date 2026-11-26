# Extern designspecifikation – Hushållsbudgeten (G11)

Version 1.4, ⟨2026-11-26⟩. Lab 2 del C, uppdaterad i Lab 3 (designrunda 4). Framtagen av designer-AI (Claude) på uppdrag från TPL; granskad och godkänd av produktägaren ⟨2026-11-26, PO⟩. Underlag för K6 (AK6.4).

> **PO:s svar på designerns frågor F1–F7 (2026-11-22) är inarbetade:** samma fil används alltid (utom räkneexemplet, se 3.14 och avsnitt 7) (F1). Servern håller reda på osparade ändringar (F2). Kontotypernas regler visas bara i felmeddelanden (F3). Servern ger kategorierna (F4). Belopp skrivs med bara siffror och ett eventuellt minustecken, utan mellanslag (F5). Menyn är den fasta sidomenyn, och kassören stannar i vyn efter ett fel (F6). Ett nytt ingående saldo som ger ett otillåtet saldo nekas (F7).
>
> Stämmer med design.md version 1.7.

## 1. Gränssnittstyp och målgrupp

**Gränssnittstyp:** grafiskt gränssnitt (GUI) i webbläsaren, på svenska. Programmet startas med `node src/ui/server.js` och användaren öppnar `http://localhost:3000`. En användare åt gången och ingen inloggning. Sidan använder bara HTML, CSS och JavaScript som ligger i projektet (`public/`): inga CDN-länkar, inga externa typsnitt och inga bilder från internet. Typsnittet är webbläsarens systemtypsnitt.

**Ansvarsfördelning:** Webbvy visar data och skickar inmatningen till servern precis som den skrevs. All kontroll görs av servern, som vid fel svarar med `{ fel, meddelande }`. Webbvy visar `meddelande` oförändrat i felrutan (avsnitt 2). Webbvy räknar inte ut något: saldon, summor, sammanställningens rader och sortering kommer från servern.

**Målgrupp (ur direktivets intressenter):**

| Intressent | Vad designen tar hänsyn till |
| --- | --- |
| **Kassören** – direkt brukare | Har hittills fört allt i ett kalkylblad; är inte programmerare. Arbetar vid en dator med mus och tangentbord. Behöver se konton, saldon, kategorier och budgetposternas status utan att minnas dem, och kunna rätta fel utan att något går förlorat. |
| **De boende** – indirekta brukare | Ska kunna lita på sammanställningen. Den visas med direktivets ord (budget, utfall, avvikelse, andel) och samma kolumner som räkneexemplet, och varje begrepp förklaras under tabellen. |
| **Testgruppen** (Lab 4) | Testar mot direktivet. Alla felinmatningar i AK6.2 (konto som inte finns, belopp 0, datum i fel format) går att skriva in i gränssnittet. Därför är konto- och datumfälten fria textfält, och listan med befintliga konton visas som förslag, inte som en låst lista. |

**Ord i gränssnittet:** direktivets ord används överallt: konto, kontotyp, ingående saldo, saldo, transaktion, kategori, beskrivning, budgetpost, Planerad/Aktiv/Avslutad, månadssammanställning, budget, utfall, avvikelse, andel, ränta, Överföring.

**Visningsformat:**
- Belopp visas i hela kronor med mellanslag som tusentalsavgränsare och "kr": `25 200 kr`, `−1 300 kr` (minustecken).
- Månadssammanställningen: servern levererar andel som text med decimalkomma (`110,0 %` eller `–`) och avvikelse som heltal. Webbvy visar andel oförändrad och lägger till plustecken på positiv avvikelse och tusentalsavgränsare, som i direktivet: `+300`, `0`, `−500`.
- Datum visas som ÅÅÅÅ-MM-DD och månader som ÅÅÅÅ-MM.
- Kategorier visas som servern ger dem, med stor första bokstav (beställarbeslutet om kategorier).
- Systemet har ingen klocka (K1): inget fält fylls i med dagens datum.

## 2. Flöde

**Sidans uppbyggnad (gäller alla vyer):**

```
+--------------------------------------------------------------------------------+
| Hushållsbudgeten – Kollektivet Sandgrund     Fil: {filnamn}    Osparade ändringar |  <- sidhuvud med statusrad
+------------------------+-------------------------------------------------------+
| MENY                   |  [Meddelanderuta: Klart – … / Fel – …          (Stäng)]|
|                        |                                                       |
| Konton                 |  VYNS RUBRIK                                          |
|   Konton (start)       |  Kort förklaring av vad vyn gör.                      |
|   Lägg till konto      |                                                       |
|   Ändra konto          |  Formulär                     | Hjälppanel            |
|   Ta bort konto        |  Ledtext   [fält]   hjälptext | (det användaren       |
|   Visa konto           |  Ledtext   [fält]   hjälptext |  behöver se: konton,  |
| Transaktioner          |                               |  saldon, budgetposter |
|   Registrera transakt. |  [Primärknapp]  [Avbryt]      |  med status …)        |
|   Ändra transaktion    |                               |                       |
|   Beräkna ränta        |  Resultat (tabell/kvittens)                           |
| Budget                 |                                                       |
|   Skapa budgetpost     |                                                       |
|   Aktivera budgetpost  |                                                       |
|   Avsluta budgetpost   |                                                       |
|   Ändra budgetpost     |                                                       |
| Sammanställning        |                                                       |
|   Månadssammanställning|                                                       |
| Fil                    |                                                       |
|   Spara                |                                                       |
|   Öppna                |                                                       |
|   Avsluta              |                                                       |
+------------------------+-------------------------------------------------------+
```

**Vad "menyn" är (K6):** menyn är sidomenyn till vänster. Den syns i alla vyer utom slutvyn efter Avsluta och går alltid att använda; aktuell vy är markerad i menyn. Startvyn *Konton* är menyns hem. Att "återföra användaren till menyn" betyder här att programmet fortsätter efter ett fel: felrutan visar vad som var fel, inget har ändrats, inmatningen finns kvar i formuläret så att den kan rättas, och alla menyval kan väljas direkt. Gränssnittet hoppar inte till startvyn, eftersom kassören då skulle tappa det hon eller han skrivit.

**Flöde:**

- **Programstart:** `node src/ui/server.js` → kassören öppnar http://localhost:3000 → Webbvy hämtar `GET /konton`, `GET /kontotyper`, `GET /budgetposter`, `GET /kategorier` och `GET /status` → **Startvy: Konton**.
- **Menyval** → vyn visas med tomma fält (eller förifyllda, om kassören kom dit via en radknapp, se nedan) → kassören fyller i → **primärknappen** (eller Enter):
  - **Servern svarar OK** → grön ruta "Klart – {kvittens}". Fälten töms, kassören stannar i vyn så att samma sak kan göras igen, och hjälppanelen och statusraden uppdateras (statusraden med `GET /status`).
  - **Servern svarar med fel** → röd ruta "Fel – {meddelande}". Fälten behåller inmatningen och fokus flyttas till felrutan. Inget har ändrats. Kassören rättar och försöker igen, eller väljer något annat i menyn.
  - **Servern svarar inte** → röd ruta med meddelandet E-S1.
- **Avbryt** (eller Esc) → tillbaka till startvyn, inget skickas till servern.
- **Byta vy via menyn mitt i en ifyllnad** → vyn byts utan fråga. Inget har skickats, så ingen data ändras.
- **Radknappar** i tabeller öppnar en annan vy med fälten förifyllda: [Visa] på ett konto → *Visa konto*; [Ändra] på en transaktion → *Ändra transaktion*; [Aktivera], [Avsluta] och [Ändra belopp] på en budgetpost → respektive budgetvy. Radknappar ändrar aldrig data direkt; ändringen görs först med vyns primärknapp.
- **Bekräftelser** visas i en ruta mitt på sidan (inte webbläsarens egen dialog). Den säkra knappen (Avbryt) har fokus från början och Esc betyder Avbryt. Bekräftelse krävs för:
  - Ta bort konto
  - Avsluta budgetpost (sluttillstånd)
  - Öppna när servern säger att det finns osparade ändringar
  - Avsluta när servern säger att det finns osparade ändringar
- **Avsluta** → (bekräftelse om osparat) → `POST /avsluta` → **slutvy** utan meny: "Programmet är avslutat."

## 3. En vy per operation (K6)

Tabellen har en rad per operation. Varje vy är skissad i text i 3.0–3.15 nedan. Felkoderna (E-…) och deras texter finns ordagrant i avsnitt 4.4. Exempeldata är räkneexemplet i direktivets avsnitt 9 (kontona Lön, Spar och Kort) efter alla åtta transaktionerna.

| Operation | Vy (bild/skiss eller textlayout) | Indata som efterfrågas | Utdata | Felmeddelanden |
| --- | --- | --- | --- | --- |
| (Startvy) | 3.0 *Konton*: lista över alla konton | – | Namn, kontotyp och saldo per konto (AK3.2) | E-S1 |
| Lägg till konto | 3.1 *Lägg till konto*: formulär + befintliga konton | Kontonamn, kontotyp (lista från `GET /kontotyper`), ingående saldo | Kvittens; kontot syns i listan | E-K1, E-K2, E-K3, E-K4, E-K5 |
| Ändra konto | 3.2 *Ändra konto*: välj konto, nuvarande värden förifyllda | Konto, nytt kontonamn, nytt ingående saldo (kontotypen kan inte ändras) | Kvittens med nya värden och saldo | E-K6, E-K1, E-K2, E-K4, E-K8 |
| Ta bort konto | 3.3 *Ta bort konto*: välj konto, visa antal transaktioner, bekräftelse | Konto | Kvittens; kontot försvinner ur listan | E-K6, E-K7 |
| Registrera transaktion | 3.4 *Registrera transaktion*: formulär + kontots typ och saldo | Konto, datum, belopp, kategori, beskrivning | Kvittens med kontots nya saldo | **E-K6, E-T1, E-T3 (AK6.2)**, E-T2, E-T4, E-KAT, E-T6 |
| Ändra transaktion | 3.5 *Ändra transaktion*: kontots transaktioner, vald transaktion förifylld | Konto, nr, datum, belopp, kategori, beskrivning | Kvittens med kontots nya saldo | E-K6, E-T7, E-T1, E-T2, E-T3, E-T4, E-KAT, E-T6 |
| Visa ett kontos transaktioner och saldo | 3.6 *Visa konto*: kontouppgifter + transaktionstabell | Konto | Namn, kontotyp, ingående saldo, saldo; transaktioner (nr, datum, belopp, kategori, beskrivning) | E-K6 |
| Hantera budgetpost – skapa | 3.7 *Skapa budgetpost*: formulär + alla budgetposter | Kategori, månad, belopp | Kvittens; posten syns med status Planerad | E-KAT, E-M1, E-B2, E-B3, E-B4 |
| Hantera budgetpost – aktivera | 3.8 *Aktivera budgetpost*: välj post, statusövergång visas | Kategori, månad | Kvittens; status Aktiv | E-KAT, E-M1, E-B5, E-B6 |
| Hantera budgetpost – avsluta | 3.9 *Avsluta budgetpost*: välj post, bekräftelse | Kategori, månad | Kvittens; status Avslutad | E-KAT, E-M1, E-B5, E-B7 |
| Ändra budgetpost (belopp) | 3.10 *Ändra budgetpost*: välj post, nytt belopp | Kategori, månad, nytt belopp | Kvittens med nytt belopp | E-KAT, E-M1, E-B5, E-B2, E-B3, E-B8 |
| Beräkna ränta | 3.11 *Beräkna ränta*: välj konto och månad | Konto, månad | Kvittens med räntetransaktionen, eller besked att räntan blev 0 kr | E-K6, E-M1, E-R1 |
| Visa månadssammanställning | 3.12 *Månadssammanställning*: välj månad, tabell + förklaring | Månad | Rader: plac, kategori, budget, utfall, avvikelse, andel (i serverns ordning) | E-M1 |
| Spara | 3.13 *Spara*: knapp, programmets fil visas | – (alltid samma fil) | Kvittens; "Osparade ändringar" försvinner ur statusraden | E-F4 |
| Öppna | 3.14 *Öppna*: två knappar, [Öppna] (programmets fil data/hushall.txt) och [Öppna räkneexemplet] (data/hushallExempel.txt), bekräftelse om osparat | – (två val: [Öppna] eller [Öppna räkneexemplet]; inget filnamn) | Kvittens; startvyn visar filens konton | E-F2, E-F3 (AK5.2–5.4) |
| Avsluta | 3.15 *Avsluta*: bekräftelse om osparat, slutvy | – | Slutvy | E-S1 |

### 3.0 Startvy – Konton

```
KONTON
Alla konton med kontotyp och saldo.

  Namn    Kontotyp      Saldo
  Lön     Lönekonto     25 200 kr    [Visa]
  Spar    Sparkonto     23 000 kr    [Visa]
  Kort    Kreditkort    −1 300 kr    [Visa]

  [Lägg till konto]  [Registrera transaktion]
```
- Kontonas ordning och saldon kommer från `GET /konton`. Ingen totalsumma visas, eftersom den vore en beräkning i gränssnittet (saldoöversikten K8 ingår inte i denna version).
- Inga konton: texten T-START-TOM visas i stället för tabellen.

### 3.1 Lägg till konto

```
LÄGG TILL KONTO
Lägg upp ett nytt konto. Namnet måste vara unikt.

  Kontonamn       [____________]       Ett namn som inget annat konto har.
  Kontotyp        [Lönekonto      v]
  Ingående saldo  [____________] kr    Hela kronor, t.ex. 12000 eller -500.

  [Lägg till konto]  [Avbryt]
                                       | Befintliga konton
                                       | Lön (Lönekonto)
                                       | Spar (Sparkonto)
                                       | Kort (Kreditkort)
```
- Kontotyp är en rullista med typerna från `GET /kontotyper`, i den ordning servern ger dem. Ingen typ är hårdkodad i Webbvy (AK3.3).

### 3.2 Ändra konto

```
ÄNDRA KONTO
Byt namn eller ingående saldo på ett konto. Kontotypen kan inte ändras.

  Konto               [Lön_________]   (förslag: Lön, Spar, Kort)
  -- Nuvarande uppgifter --
  Kontotyp            Lönekonto
  Saldo               25 200 kr
  Nytt kontonamn      [Lön_________]
  Nytt ingående saldo [12000_______] kr  Hela kronor.

  [Spara ändringen]  [Avbryt]
```
- När Konto-fältet exakt matchar ett namn i kontolistan fylls nuvarande uppgifter i. Annars visas T-INGET-KONTO-VALT och fälten är tomma.
- "Spara ändringen" sparar bara i programmet, inte till fil. Knapptexten skiljer sig medvetet från menyvalet *Spara*.

### 3.3 Ta bort konto

```
TA BORT KONTO
Bara ett konto utan transaktioner kan tas bort.

  Konto          [Kort________]   (förslag: Lön, Spar, Kort)
  Kontotyp       Kreditkort
  Saldo          −1 300 kr
  Transaktioner  3

  [Ta bort konto]  [Avbryt]
```
- [Ta bort konto] öppnar bekräftelsen B-TABORT. Först när kassören bekräftar skickas `DELETE /konton/:namn`.
- Antalet transaktioner är längden på listan från `GET /konton/:namn` och visas bara som information. Det är servern som avgör om kontot får tas bort (E-K7).

### 3.4 Registrera transaktion

```
REGISTRERA TRANSAKTION
Registrera en insättning eller en utgift på ett konto.

  Konto        [____________]   (förslag: Lön, Spar, Kort)
  Datum        [ÅÅÅÅ-MM-DD__]   T.ex. 2026-11-08.
  Belopp       [____________] kr  Positivt = insättning, negativt = utgift. T.ex. -1200.
  Kategori     [____________]   (förslag: befintliga kategorier)
  Beskrivning  [____________]   Valfri text, t.ex. Storhandling.

  [Registrera transaktion]  [Avbryt]
                                  | Valt konto
                                  | Kort – Kreditkort
                                  | Saldo: −1 300 kr
                                  |
                                  | Flytt mellan egna konton: registrera två
                                  | transaktioner i kategorin Överföring, en på
                                  | varje konto. Överföring räknas inte i
                                  | månadssammanställningen.
```
- Konto och Datum är fria textfält (inte rullista eller datumväljare) så att servern får kontrollera dem och felen i AK6.2 visas med servervalideringens text.
- Efter lyckad registrering töms Datum, Belopp, Kategori och Beskrivning; Konto behålls, så att flera transaktioner på samma konto kan registreras i följd.

### 3.5 Ändra transaktion

```
ÄNDRA TRANSAKTION
Ändra en registrerad transaktion. Samma regler gäller som vid registrering.

  Konto  [Lön_________]   (förslag: Lön, Spar, Kort)

  Nr  Datum       Belopp      Kategori    Beskrivning
  1   2026-11-01  +25 000 kr  Inkomst     Månadsavgifter   [Välj]
  2   2026-11-03   −6 500 kr  Boende      Hyra             [Välj]
  3   2026-11-05   −3 000 kr  Överföring  Till sparkontot  [Välj]
  4   2026-11-22   −2 300 kr  Mat         Veckohandling    [Välj]

  -- Vald transaktion --
  Nr           [2___]
  Datum        [2026-11-03__]
  Belopp       [-6500_______] kr  Positivt = insättning, negativt = utgift.
  Kategori     [Boende______]
  Beskrivning  [Hyra________]

  [Spara ändringen]  [Avbryt]
                                  | Saldo: 25 200 kr
```
- [Välj] fyller i fälten med transaktionens nuvarande värden. Nr kan också skrivas in direkt. Kontot kan inte bytas på en transaktion.
- Nr är transaktionens position i kontots lista, räknat från 1 (design.md).

### 3.6 Visa konto (visa ett kontos transaktioner och saldo)

```
VISA KONTO
Ett kontos transaktioner och saldo.

  Konto  [Kort________]  [Visa]     (förslag: Lön, Spar, Kort)

  Kort – Kreditkort
  Ingående saldo  0 kr
  Saldo          −1 300 kr

  Nr  Datum       Belopp     Kategori  Beskrivning
  1   2026-11-08  −1 200 kr  Mat       Storhandling     [Ändra]
  2   2026-11-20    +200 kr  Mat       Retur av varor   [Ändra]
  3   2026-11-30    −300 kr  Hälsa     Apotek           [Ändra]

  [Registrera transaktion på kontot]  [Beräkna ränta]
```
- Transaktionerna visas i kontots ordning (nr) från `GET /konton/:namn`. Inga transaktioner: T-KONTO-TOMT.
- Knapparna längst ned öppnar respektive vy med Konto förifyllt. Samma knappar visas för alla kontotyper (K3).

### 3.7 Skapa budgetpost

```
SKAPA BUDGETPOST
Planera en utgift för en kategori och en månad.

  Kategori  [____________]   (förslag: befintliga kategorier)
  Månad     [ÅÅÅÅ-MM_____]   T.ex. 2026-11.
  Belopp    [____________] kr  Planerad utgift i hela kronor, 0 eller mer.

  En ny budgetpost får status Planerad. Den räknas i månadssammanställningen
  först när den har aktiverats.

  [Skapa budgetpost]  [Avbryt]

  Budgetposter                                    Planerad → Aktiv → Avslutad
  Kategori  Månad    Belopp    Status
  Boende    2026-11  6 500 kr  Aktiv     [Aktivera] [Avsluta] [Ändra belopp]
  Mat       2026-11  3 000 kr  Aktiv     [Aktivera] [Avsluta] [Ändra belopp]
  Nöje      2026-11    500 kr  Aktiv     [Aktivera] [Avsluta] [Ändra belopp]
  Hälsa     2026-11    600 kr  Planerad  [Aktivera] [Avsluta] [Ändra belopp]
  Mat       2026-10  3 000 kr  Avslutad  [Aktivera] [Avsluta] [Ändra belopp]
```
- Tabellen *Budgetposter* med statusraden "Planerad → Aktiv → Avslutad" och texten T-STATUS visas på samma sätt i vyerna 3.7–3.10. Ordningen kommer från `GET /budgetposter`.
- Radknapparna är desamma på alla rader. Webbvy avgör inte vilka övergångar som är tillåtna, eftersom det vore affärslogik (AK6.3); i stället visas statusövergångarna som text, och servern nekar en otillåten övergång (E-B6, E-B7, E-B8). Radknapparna öppnar bara vyn med Kategori och Månad förifyllda.

### 3.8 Aktivera budgetpost

```
AKTIVERA BUDGETPOST
Planerad → Aktiv. En aktiv budgetpost jämförs med utfallet i månadssammanställningen.

  Kategori  [Hälsa_______]
  Månad     [2026-11_____]
  Vald budgetpost: Hälsa 2026-11, 600 kr, status Planerad

  [Aktivera budgetpost]  [Avbryt]

  (tabellen Budgetposter, som i 3.7)
```
- Raden "Vald budgetpost" visas när kassören kommit via en radknapp och fylls med radens värden. Annars visas den inte.

### 3.9 Avsluta budgetpost

```
AVSLUTA BUDGETPOST
Aktiv → Avslutad. Avslutad är ett sluttillstånd: budgetposten kan inte
aktiveras igen och beloppet kan inte ändras.

  Kategori  [Mat_________]
  Månad     [2026-10_____]
  Vald budgetpost: Mat 2026-10, 3 000 kr, status Aktiv

  [Avsluta budgetpost]  [Avbryt]

  (tabellen Budgetposter, som i 3.7)
```
- [Avsluta budgetpost] öppnar bekräftelsen B-AVSLUTA-POST.

### 3.10 Ändra budgetpost (belopp)

```
ÄNDRA BUDGETPOST
Ändra beloppet på en budgetpost med status Planerad eller Aktiv.

  Kategori     [Mat_________]
  Månad        [2026-11_____]
  Vald budgetpost: Mat 2026-11, 3 000 kr, status Aktiv
  Nytt belopp  [____________] kr  Hela kronor, 0 eller mer.

  [Spara ändringen]  [Avbryt]

  (tabellen Budgetposter, som i 3.7)
```

### 3.11 Beräkna ränta

```
BERÄKNA RÄNTA
Bokför ränta för en månad. Räntan räknas på månadens lägsta saldo enligt
kontotypen och bokförs som en transaktion i kategorin Ränta på månadens
sista dag. Räntan kan bokföras en gång per konto och månad.

  Konto  [Spar________]   (förslag: Lön, Spar, Kort)
  Månad  [2026-11_____]   T.ex. 2026-11.

  [Beräkna ränta]  [Avbryt]
                                  | Valt konto
                                  | Spar – Sparkonto
                                  | Saldo: 23 000 kr
```
- Samma vy och knapp för alla kontotyper (K3). För ett konto utan ränta visas beskedet T-RANTA-NOLL som en grön ruta, eftersom det inte är ett fel (räkneexemplet: Lön i november ger ingen transaktion).

### 3.12 Månadssammanställning

```
MÅNADSSAMMANSTÄLLNING
Utfall mot budget per kategori för en månad.

  Månad  [2026-11_____]  [Visa sammanställning]

  Sammanställning för 2026-11
  Plac  Kategori  Budget    Utfall    Avvikelse  Andel
  1     Mat       3 000 kr  3 300 kr  +300       110,0 %
  2     Hälsa     –           300 kr  +300       –
  3     Boende    6 500 kr  6 500 kr  0          100,0 %
  4     Nöje        500 kr      0 kr  −500       0,0 %

  Utfall = utgifter minus återbetalningar i kategorin under månaden.
  Avvikelse = utfall − budget. Ett positivt tal betyder att budgeten är överskriden.
  Andel = utfall delat med budget, i procent.
  Bara budgetposter med status Aktiv eller Avslutad räknas som budget.
  Inkomster och transaktioner i kategorin Överföring redovisas inte.
```
- Raderna visas i den ordning servern ger dem. Plac är radens nummer i listan.
- Formatering: servern levererar andel som text med decimalkomma (`110,0 %` eller `–`) och avvikelse som heltal (t.ex. `300`, `-500`). Webbvy visar andel oförändrad och skriver avvikelse med plustecken när den är positiv och med tusentalsavgränsare (`+300`, `0`, `−500`). Budget och utfall visas med beloppsformatet i avsnitt 1.
- Tom sammanställning: T-SAMM-TOM visas i stället för tabellen (AK4.2); det är inget fel.

### 3.13 Spara

```
SPARA
Spara alla konton, transaktioner och budgetposter till en fil.

  Fil  data/hushall.txt   Filen skrivs över med programmets data.

  [Spara]  [Avbryt]
```
- Filen är alltid densamma, data/hushall.txt (design.md avsnitt 2 och 6); namnet visas från `GET /status`. Kassören anger inget filnamn.
- Spara skriver alltid till data/hushall.txt, även när räkneexemplet har öppnats med [Öppna räkneexemplet]. Räkneexemplet data/hushallExempel.txt skrivs aldrig av programmet (design.md avsnitt 3 och 7). Finns data/hushall.txt inte än skapas den vid Spara.

### 3.14 Öppna

```
ÖPPNA
Läs in konton, transaktioner och budgetposter från en fil. Allt som finns i
programmet nu ersätts av filens innehåll. Om filen har fel ändras ingenting.

  Fil  data/hushall.txt

  [Öppna]  [Öppna räkneexemplet]  [Avbryt]
           Räkneexemplet läses från data/hushallExempel.txt.
           Spara skriver ändå till data/hushall.txt.
```
- [Öppna] läser alltid programmets fil, data/hushall.txt; namnet visas från `GET /status` och skickas som `POST /oppna` med `{}`. Kassören anger inget filnamn.
- [Öppna räkneexemplet] skickar `POST /oppna` med `{ exempel: true }` och läser data/hushallExempel.txt. Programmets fil för Spara är fortfarande data/hushall.txt, så statusraden (`GET /status`) visar "Fil: data/hushall.txt" även efter att exemplet har öppnats.
- **Räkneexemplet (AK5.5):** repot levereras med räkneexemplet (direktivets avsnitt 9) som data/hushallExempel.txt. Kassören startar programmet, väljer Öppna i menyn och sedan [Öppna räkneexemplet]. Startvyn visar då Lön 25 200 kr, Spar 23 000 kr och Kort −1 300 kr. Väljer kassören senare Spara skrivs data/hushall.txt; exemplet skrivs aldrig över.
- Om `GET /status` säger att det finns osparade ändringar visas bekräftelsen B-OPPNA först. Det gäller båda knapparna. I B-OPPNA är {filnamn} den fil som knappen läser: data/hushall.txt för [Öppna] och data/hushallExempel.txt för [Öppna räkneexemplet].
- Efter lyckad Öppna visas startvyn med kvittensen.
- Vid trasig fil (E-F3) visas radnummer och orsak från servern; data i programmet är oförändrad (K5).

### 3.15 Avsluta

```
AVSLUTA
Stäng programmet.

  [Avsluta programmet]  [Avbryt]
```
- Om `GET /status` säger att det finns osparade ändringar visas bekräftelsen B-AVSLUTA först.
- Efter `POST /avsluta` visas slutvyn (utan meny):

```
PROGRAMMET ÄR AVSLUTAT
Du kan stänga fliken. Starta programmet igen med node src/ui/server.js.
```

## 4. Texter och felmeddelanden

Alla texter ordagrant. `{…}` är platshållare som fylls i med värden. Belopp i meddelanden skrivs med formatet i avsnitt 1 (`−1 200 kr`).

### 4.1 Allmänna texter

| Id | Plats | Text |
| --- | --- | --- |
| T-TITEL | Sidhuvud och webbläsarflik | Hushållsbudgeten – Kollektivet Sandgrund |
| T-FIL | Statusrad, alltid | Fil: {filnamn} |
| T-OSPARAT | Statusrad, när `GET /status` ger osparat = sant | Osparade ändringar |
| T-MENY | Menyns rubrik | Meny |
| Menygrupper | Meny | Konton · Transaktioner · Budget · Sammanställning · Fil |
| Menyval | Meny | Konton · Lägg till konto · Ändra konto · Ta bort konto · Visa konto · Registrera transaktion · Ändra transaktion · Beräkna ränta · Skapa budgetpost · Aktivera budgetpost · Avsluta budgetpost · Ändra budgetpost · Månadssammanställning · Spara · Öppna · Avsluta |
| T-KLART | Grön ruta, före kvittensen | Klart – |
| T-FEL | Röd ruta, före serverns meddelande | Fel – |
| T-STANG | Knapp i meddelanderutan | Stäng |
| T-AVBRYT | Knapp i alla formulär och bekräftelser | Avbryt |
| T-FORSLAG-KONTO | Hjälptext under kontofält | Skriv eller välj ett av förslagen. |
| T-INGET-KONTO-VALT | Ändra konto / Ta bort konto, när fältet inte matchar ett konto | Skriv namnet på ett befintligt konto för att se dess uppgifter. |
| T-STATUS | Budgetvyerna | Planerad → Aktiv (Aktivera) → Avslutad (Avsluta). Avslutad är ett sluttillstånd: beloppet kan inte ändras. |
| T-OVERFORING | Hjälppanel, Registrera transaktion | Flytt mellan egna konton: registrera två transaktioner i kategorin Överföring, en på varje konto. Överföring räknas inte i månadssammanställningen. |

### 4.2 Rubriker, ingresser, ledtexter, hjälptexter och knappar per vy

| Vy | Rubrik | Ingress | Ledtexter (hjälptext) | Knappar |
| --- | --- | --- | --- | --- |
| 3.0 | Konton | Alla konton med kontotyp och saldo. | Kolumner: Namn · Kontotyp · Saldo | Visa · Lägg till konto · Registrera transaktion |
| 3.1 | Lägg till konto | Lägg upp ett nytt konto. Namnet måste vara unikt. | Kontonamn (Ett namn som inget annat konto har.) · Kontotyp · Ingående saldo (Hela kronor, t.ex. 12000 eller -500.) · Panel: Befintliga konton | Lägg till konto · Avbryt |
| 3.2 | Ändra konto | Byt namn eller ingående saldo på ett konto. Kontotypen kan inte ändras. | Konto · Nuvarande uppgifter · Kontotyp · Saldo · Nytt kontonamn · Nytt ingående saldo (Hela kronor.) | Spara ändringen · Avbryt |
| 3.3 | Ta bort konto | Bara ett konto utan transaktioner kan tas bort. | Konto · Kontotyp · Saldo · Transaktioner | Ta bort konto · Avbryt |
| 3.4 | Registrera transaktion | Registrera en insättning eller en utgift på ett konto. | Konto · Datum (T.ex. 2026-11-08.) · Belopp (Positivt = insättning, negativt = utgift. T.ex. -1200.) · Kategori · Beskrivning (Valfri text, t.ex. Storhandling.) · Panel: Valt konto | Registrera transaktion · Avbryt |
| 3.5 | Ändra transaktion | Ändra en registrerad transaktion. Samma regler gäller som vid registrering. | Konto · Kolumner: Nr · Datum · Belopp · Kategori · Beskrivning · Vald transaktion · Nr · Datum · Belopp (Positivt = insättning, negativt = utgift.) · Kategori · Beskrivning | Välj · Spara ändringen · Avbryt |
| 3.6 | Visa konto | Ett kontos transaktioner och saldo. | Konto · Ingående saldo · Saldo · Kolumner: Nr · Datum · Belopp · Kategori · Beskrivning | Visa · Ändra · Registrera transaktion på kontot · Beräkna ränta |
| 3.7 | Skapa budgetpost | Planera en utgift för en kategori och en månad. | Kategori · Månad (T.ex. 2026-11.) · Belopp (Planerad utgift i hela kronor, 0 eller mer.) · Info: En ny budgetpost får status Planerad. Den räknas i månadssammanställningen först när den har aktiverats. · Tabell: Budgetposter, kolumner Kategori · Månad · Belopp · Status | Skapa budgetpost · Avbryt · radknappar Aktivera · Avsluta · Ändra belopp |
| 3.8 | Aktivera budgetpost | Planerad → Aktiv. En aktiv budgetpost jämförs med utfallet i månadssammanställningen. | Kategori · Månad · Vald budgetpost: {kategori} {månad}, {belopp}, status {status} | Aktivera budgetpost · Avbryt |
| 3.9 | Avsluta budgetpost | Aktiv → Avslutad. Avslutad är ett sluttillstånd: budgetposten kan inte aktiveras igen och beloppet kan inte ändras. | Kategori · Månad · Vald budgetpost: … | Avsluta budgetpost · Avbryt |
| 3.10 | Ändra budgetpost | Ändra beloppet på en budgetpost med status Planerad eller Aktiv. | Kategori · Månad · Vald budgetpost: … · Nytt belopp (Hela kronor, 0 eller mer.) | Spara ändringen · Avbryt |
| 3.11 | Beräkna ränta | Bokför ränta för en månad. Räntan räknas på månadens lägsta saldo enligt kontotypen och bokförs som en transaktion i kategorin Ränta på månadens sista dag. Räntan kan bokföras en gång per konto och månad. | Konto · Månad (T.ex. 2026-11.) · Panel: Valt konto | Beräkna ränta · Avbryt |
| 3.12 | Månadssammanställning | Utfall mot budget per kategori för en månad. | Månad · Tabellrubrik: Sammanställning för {månad} · Kolumner: Plac · Kategori · Budget · Utfall · Avvikelse · Andel · Förklaring: se T-SAMM-FORKLARING | Visa sammanställning |
| 3.13 | Spara | Spara alla konton, transaktioner och budgetposter till en fil. | Fil {filnamn} (Filen skrivs över med programmets data.) | Spara · Avbryt |
| 3.14 | Öppna | Läs in konton, transaktioner och budgetposter från en fil. Allt som finns i programmet nu ersätts av filens innehåll. Om filen har fel ändras ingenting. | Fil {filnamn} · Hjälptext vid Öppna räkneexemplet (se T-EXEMPEL) | Öppna · Öppna räkneexemplet · Avbryt |
| 3.15 | Avsluta | Stäng programmet. | – | Avsluta programmet · Avbryt |
| Slutvy | Programmet är avslutat | Du kan stänga fliken. Starta programmet igen med node src/ui/server.js. | – | – |

| Id | Text |
| --- | --- |
| T-SAMM-FORKLARING | Utfall = utgifter minus återbetalningar i kategorin under månaden. Avvikelse = utfall − budget. Ett positivt tal betyder att budgeten är överskriden. Andel = utfall delat med budget, i procent. Bara budgetposter med status Aktiv eller Avslutad räknas som budget. Inkomster och transaktioner i kategorin Överföring redovisas inte. |
| T-START-TOM | Det finns inga konton än. Välj Lägg till konto i menyn, eller Öppna för att läsa in en sparad fil eller räkneexemplet. |
| T-KONTO-TOMT | Kontot har inga transaktioner än. |
| T-BUDGET-TOM | Det finns inga budgetposter än. |
| T-SAMM-TOM | Det finns inga transaktioner eller budgetposter för {månad}. Sammanställningen är tom. |
| T-RANTA-NOLL | Ingen ränta bokfördes: räntan för kontot "{konto}" i {månad} blev 0 kr. |
| T-EXEMPEL | Räkneexemplet läses från data/hushallExempel.txt. Spara skriver ändå till data/hushall.txt. |

### 4.3 Kvittenser (grön ruta, efter "Klart –") och bekräftelser

**Kvittenser**

| Operation | Text |
| --- | --- |
| Lägg till konto | Kontot "{namn}" ({kontotyp}) är tillagt med ingående saldo {ingående saldo}. |
| Ändra konto | Kontot "{namn}" är ändrat. Ingående saldo: {ingående saldo}. Saldo: {saldo}. |
| Ta bort konto | Kontot "{namn}" är borttaget. |
| Registrera transaktion | Transaktionen är registrerad på kontot "{konto}": {belopp}, {kategori}, {datum}. Nytt saldo: {saldo}. |
| Ändra transaktion | Transaktion nr {nr} på kontot "{konto}" är ändrad. Nytt saldo: {saldo}. |
| Skapa budgetpost | Budgetposten {kategori} {månad} är skapad med beloppet {belopp} och status Planerad. |
| Aktivera budgetpost | Budgetposten {kategori} {månad} är aktiverad. Status: Aktiv. |
| Avsluta budgetpost | Budgetposten {kategori} {månad} är avslutad. Status: Avslutad. |
| Ändra budgetpost | Beloppet för budgetposten {kategori} {månad} är ändrat till {belopp}. |
| Beräkna ränta (ränta > 0) | Räntan för {månad} är bokförd på kontot "{konto}": {belopp} den {datum}. Nytt saldo: {saldo}. |
| Beräkna ränta (0 kr) | se T-RANTA-NOLL |
| Spara | Allt är sparat i filen "{filnamn}". |
| Öppna | Filen "{filnamn}" är öppnad. |
| Öppna räkneexemplet | Räkneexemplet "{filnamn}" är öppnat. Spara skriver till "data/hushall.txt". |

Exempel: *Klart – Räntan för 2026-11 är bokförd på kontot "Spar": 100 kr den 2026-11-30. Nytt saldo: 23 100 kr.*

**Bekräftelser** (rubrik, text, knappar; Avbryt har fokus)

| Id | Rubrik | Text | Knappar |
| --- | --- | --- | --- |
| B-TABORT | Ta bort kontot "{namn}"? | Kontot tas bort ur programmet. | Ta bort konto · Avbryt |
| B-AVSLUTA-POST | Avsluta budgetposten {kategori} {månad}? | Avslutad är ett sluttillstånd. Budgetposten kan inte aktiveras igen och beloppet kan inte ändras. | Avsluta budgetpost · Avbryt |
| B-OPPNA | Du har osparade ändringar | Om du öppnar filen "{filnamn}" försvinner ändringarna sedan du senast sparade. Välj Avbryt och sedan Spara i menyn om du vill behålla dem. | Öppna utan att spara · Avbryt |
| B-AVSLUTA | Du har osparade ändringar | Om du avslutar nu försvinner ändringarna sedan du senast sparade. Välj Avbryt och sedan Spara i menyn om du vill behålla dem. | Avsluta utan att spara · Avbryt |

### 4.4 Felmeddelanden (röd ruta, efter "Fel –")

Felmeddelandena skapas av servern (model/ och storage/) som `meddelande` i `{ fel, meddelande }` och visas oförändrade av Webbvy. Texterna nedan är alltså krav på serverns meddelanden. Undantaget är E-S1, som Webbvy själv visar när servern inte svarar. Varje meddelande säger vad som var fel och vad kassören kan göra. Efter ett fel är ingen data ändrad.

| Kod | Situation | Felklass | Text (ordagrant) | Krav |
| --- | --- | --- | --- | --- |
| E-S1 | Servern svarar inte (Webbvy) | – | Programmet svarar inte. Kontrollera att programmet är startat med node src/ui/server.js och ladda sedan om sidan. | K6 |
| E-K1 | Kontonamn tomt | ValideringsFel | Kontonamnet saknas. Skriv ett namn på kontot. | K1 |
| E-K2 | Kontonamnet finns redan | DubblettFel | Det finns redan ett konto som heter "{namn}". Välj ett annat namn. | K1 |
| E-K3 | Kontotypen finns inte | ValideringsFel | Kontotypen "{typ}" finns inte. Välj en kontotyp i listan. | K3 |
| E-K4 | Ingående saldo är inte ett heltal eller saknas | ValideringsFel | Ingående saldo "{värde}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, till exempel 12000 eller -500. | K1 |
| E-K5 | Ingående saldo är inte tillåtet för kontotypen | ValideringsFel | Ingående saldo {belopp} är inte tillåtet för kontotypen {typ}. Ange ett högre ingående saldo eller välj en annan kontotyp. | K3 |
| E-K6 | Kontot finns inte | SaknasFel | Kontot "{namn}" finns inte. Välj ett av förslagen, eller lägg först till kontot med Lägg till konto. | **AK6.2**, AK2.1 |
| E-K7 | Kontot har transaktioner | RegelFel | Kontot "{namn}" kan inte tas bort eftersom det har {antal} transaktioner. Bara ett konto utan transaktioner kan tas bort. | AK2.2 |
| E-K8 | Nytt ingående saldo ger otillåtet saldo | RegelFel | Det nya ingående saldot skulle ge kontot "{namn}" saldot {saldo}, vilket inte är tillåtet för kontotypen {typ}. Ange ett högre ingående saldo. | K3 |
| E-T1 | Belopp 0 | ValideringsFel | Beloppet får inte vara 0. Skriv ett positivt belopp för en insättning eller ett negativt för en utgift, till exempel -1200. | **AK6.2**, AK1.3 |
| E-T2 | Belopp är inte ett heltal eller saknas | ValideringsFel | Beloppet "{värde}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, med minustecken för en utgift, till exempel -1200. | K1 |
| E-T3 | Datum i fel format | ValideringsFel | Datumet "{värde}" har fel format. Skriv datumet som ÅÅÅÅ-MM-DD, till exempel 2026-11-08. | **AK6.2**, K1 |
| E-T4 | Datumet finns inte i kalendern | ValideringsFel | Datumet "{värde}" finns inte. Kontrollera månad och dag, till exempel 2026-11-30. | K1 |
| E-KAT | Kategori tom | ValideringsFel | Kategorin saknas. Skriv en kategori, till exempel Mat. | K1 |
| E-T6 | Saldot blir otillåtet för kontotypen | RegelFel | Transaktionen nekas: saldot på kontot "{konto}" skulle bli {nytt saldo}, vilket inte är tillåtet för kontotypen {typ}. Saldot är nu {saldo}. Ändra beloppet eller välj ett annat konto. | K3, AK3.1 |
| E-T7 | Transaktionsnumret finns inte | SaknasFel | Kontot "{konto}" har ingen transaktion med nummer {nr}. Välj en transaktion i listan. | K1 |
| E-M1 | Månad i fel format | ValideringsFel | Månaden "{värde}" har fel format. Skriv månaden som ÅÅÅÅ-MM, till exempel 2026-11. | K1 |
| E-B2 | Budgetbelopp negativt | ValideringsFel | Budgetbeloppet får inte vara negativt. Skriv ett belopp i hela kronor som är 0 eller större. | AK1.3 |
| E-B3 | Budgetbelopp är inte ett heltal eller saknas | ValideringsFel | Budgetbeloppet "{värde}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, till exempel 3000. | K1 |
| E-B4 | Budgetpost finns redan för kategori och månad | DubblettFel | Det finns redan en budgetpost för {kategori} {månad} med status {status}. Ändra beloppet på den befintliga budgetposten med Ändra budgetpost. | AK2.3 |
| E-B5 | Budgetposten finns inte | SaknasFel | Det finns ingen budgetpost för {kategori} {månad}. Kontrollera kategori och månad i listan Budgetposter. | K1 |
| E-B6 | Aktivera från annan status än Planerad | StatusFel | Budgetposten {kategori} {månad} kan inte aktiveras eftersom den har status {status}. Bara en budgetpost med status Planerad kan aktiveras. | AK1.2 |
| E-B7 | Avsluta från annan status än Aktiv | StatusFel | Budgetposten {kategori} {månad} kan inte avslutas eftersom den har status {status}. Bara en budgetpost med status Aktiv kan avslutas. | AK1.2 |
| E-B8 | Ändra belopp på Avslutad | StatusFel | Beloppet för budgetposten {kategori} {månad} kan inte ändras eftersom den har status Avslutad. | K1 |
| E-R1 | Räntan redan bokförd | DubblettFel | Räntan för {månad} är redan bokförd på kontot "{konto}". Den kan bara bokföras en gång per konto och månad. | K3 |
| E-F2 | Filen finns inte | SaknasFel, från storage/fil.js lasFil | Filen "{filnamn}" finns inte än. Välj Spara för att skapa den. Data i programmet är oförändrad. | K5 |
| E-F3 | Trasig fil | FilformatFel, från storage/fil.js lasFil (via filformat.lasHushall) | Filen "{filnamn}" kunde inte öppnas. Rad {rad}: {orsak} Rätta filen och försök igen. Data i programmet är oförändrad. | K5, AK5.2–5.4 |
| E-F4 | Filen kunde inte sparas | FilformatFel, från storage/fil.js sparaFil | Filen "{filnamn}" kunde inte sparas. Kontrollera att filen inte är skrivskyddad eller öppen i ett annat program, och försök igen. Data i programmet är oförändrad. | K5 |
| E-S2 | Okänd adress (status 404) | SaknasFel, från ui/server.js | Adressen "{adress}" finns inte. | K6 |
| E-S3 | Webbsidans fil finns inte (`GET /`, `/app.js`, `/style.css`; status 400) | SaknasFel, från storage/fil.js lasWebbfil | Filen "{namn}" finns inte. | K6, K7 d |
| E-S4 | Oväntat fel, även en anropskropp som inte är giltig JSON (status 500); servern fortsätter att svara | OväntatFel (ingen felklass), från ui/server.js | Något gick fel i programmet. Data i programmet är oförändrad. Försök igen. | K6 |

E-S2 och E-S3 visas inte i Webbvy; de anger ingen åtgärd eftersom texten kommer från servern.

**Exempel på filfelen med den fasta filen:**
- E-F2: *Fel – Filen "data/hushall.txt" finns inte än. Välj Spara för att skapa den. Data i programmet är oförändrad.*
- E-F4: *Fel – Filen "data/hushall.txt" kunde inte sparas. Kontrollera att filen inte är skrivskyddad eller öppen i ett annat program, och försök igen. Data i programmet är oförändrad.*

**{orsak} i E-F3** är texterna från design.md avsnitt 6, med punkt på slutet, till exempel:
- *Fel – Filen "data/hushall.txt" kunde inte öppnas. Rad 14: kontot "Lönn" finns inte i filen. Rätta filen och försök igen. Data i programmet är oförändrad.* (AK5.2)
- Rad 9: beloppet "tusen" är inte ett heltal. (AK5.3)
- Rad 7: statusen "Klar" finns inte (Planerad, Aktiv, Avslutad). (AK5.4)

**De tre felinmatningarna i AK6.2, som de visas:**
- *Fel – Kontot "Lönn" finns inte. Välj ett av förslagen, eller lägg först till kontot med Lägg till konto.*
- *Fel – Beloppet får inte vara 0. Skriv ett positivt belopp för en insättning eller ett negativt för en utgift, till exempel -1200.*
- *Fel – Datumet "2026-11-8" har fel format. Skriv datumet som ÅÅÅÅ-MM-DD, till exempel 2026-11-08.*

Programmet fortsätter efter varje fel och menyn går att använda (avsnitt 2).

## 5. Motivering mot gränssnittsprinciperna (F4, Coad & Yourdon)

| Princip | Hur designen uppfyller den |
| --- | --- |
| Ångra / avbryta utan skada | Varje formulär har **Avbryt** (och Esc), som går till startvyn utan att skicka något. Inget ändras förrän kassören trycker på primärknappen, och radknappar ändrar aldrig data direkt utan öppnar bara en vy. Ett fel ändrar ingenting och inmatningen finns kvar, så den kan rättas i stället för att skrivas om. Det som inte går att ångra i programmet har en bekräftelse där Avbryt är förvalt: Ta bort konto, Avsluta budgetpost (sluttillstånd), och **Öppna** och **Avsluta** när servern säger att det finns osparade ändringar. Statusraden visar då "Osparade ändringar", och det tillståndet hålls av servern (`GET /status`), så det försvinner inte om sidan laddas om, så kassören ser risken innan den uppstår. Öppna med trasig fil lämnar datan orörd (K5), och felmeddelandet säger det. Ändra transaktion och Ändra budgetpost gör det möjligt att rätta en felregistrering i stället för att lägga till en motpost. |
| Inget "mänskligt RAM" – visa det användaren behöver minnas | Startvyn visar alla konton med kontotyp och saldo. Kontofälten visar befintliga konton som förslag, och vyer där ett konto väljs visar kontots typ och saldo i hjälppanelen. Kategorifälten visar befintliga kategorier som förslag (från `GET /kategorier`). Alla budgetvyer visar alla budgetposter med status samt statusövergångarna "Planerad → Aktiv → Avslutad" och vad som är tillåtet (T-STATUS). Ändra-vyerna fyller i nuvarande värden. Formatkrav står bredvid fälten med exempel ur räkneexemplet (2026-11-08, 2026-11, -1200). Sammanställningen förklarar utfall, avvikelse och andel under tabellen. Statusraden visar programmets fil. Konto- och datumfälten är ändå fria textfält, så att testgruppen kan prova felinmatningarna i AK6.2. |
| Inlärning – samma mönster överallt | Varje vy har samma ordning: rubrik → ingress som säger vad vyn gör → fält med ledtext till vänster och hjälptext till höger → primärknapp följd av Avbryt → resultat. Primärknappen heter som operationen (Registrera transaktion, Skapa budgetpost), och alla ändringar sparas med "Spara ändringen". Ett lyckat anrop ger alltid en grön ruta "Klart – …", ett fel alltid en röd ruta "Fel – …" på samma plats överst. Felmeddelanden har alltid formen *vad som var fel* + *vad du kan göra*. Radknappar öppnar alltid en vy med förifyllda fält. Kontotyperna behandlas lika (K3): samma vyer, knappar och listor för Lönekonto, Sparkonto och Kreditkort, och en ny kontotyp syns automatiskt via `GET /kontotyper`. |
| Konsekvent look and feel | En sidlayout för alla vyer: sidhuvud med statusrad, fast sidomeny, meddelanderuta, innehåll och hjälppanel. Samma ord som direktivet överallt. Samma format för belopp (`−1 300 kr`), datum (ÅÅÅÅ-MM-DD), månader (ÅÅÅÅ-MM) och kategorier (stor första bokstav). Samma färgbetydelser: grönt för klart, rött för fel och för knappar som tar bort eller avslutar, och färg står aldrig ensam utan med orden "Klart"/"Fel". Bekräftelser ser likadana ut och har Avbryt förvalt. Bara lokala resurser och systemtypsnitt, så sidan ser likadan ut utan internet. Varje fält har en kopplad ledtext och felrutan läses upp av skärmläsare. |

## 6. Designrundor

| Runda | Uppdrag från TPL (sammandrag) | PO:s granskning – vad som avvisades | Ändring |
| --- | --- | --- | --- |
| 1 | Ta fram den externa designspecifikationen för webbgränssnittet: en vy per operation i K6 samt ändra och ta bort (beställarbeslut 1), ordagranna texter och felmeddelanden (AK6.2), vad "menyn" är i ett webbgränssnitt och en motivering mot gränssnittsprinciperna. | Version 1.0 innehöll sju frågor (F1–F7) med antaganden. Två antaganden avvisades: ett filnamnsfält vid Spara och Öppna (F1; PO beslutade att samma fil alltid används) och att Webbvy själv håller reda på osparade ändringar (F2; PO beslutade att servern gör det). F3–F7 godtogs: reglerna visas bara i felmeddelanden, servern ger kategorierna, belopp skrivs utan mellanslag, tolkningen av menyn gäller och ändrat ingående saldo prövas mot kontotypen. | Version 1.1: inget filnamnsfält, statusraden och varningarna bygger på `GET /status`, kategoriförslagen kommer från `GET /kategorier`, felmeddelandena för belopp säger "utan mellanslag", och felmeddelandet E-K8 gäller nu som beslut. En lista över vad som behövde läggas till i design.md fanns överst i dokumentet. |
| 2 | Uppdatera till version 1.2 efter PO:s granskning av version 1.1. Vyerna, texterna och motiveringen godkändes; bara fem punkter skulle ändras. | Listan över tillägg till design.md skulle bort, eftersom design.md version 1.1 nu innehåller dem. Exemplen saknade den fasta filens namn. Det saknades en beskrivning av hur räkneexemplet öppnas (AK5.5), ett beslut om vem som formaterar sammanställningen och felklasser för filfelen. Designer-AI frågade om de två punkter som TPL:s uppdrag lämnat ofyllda och om felklasserna, som design.md inte angav. PO beslutade: exempelfilen är data/hushall.txt, servern ger andel som text och avvikelse som heltal, och filfelen är SaknasFel och FilformatFel. | Version 1.2: "Stämmer med design.md version 1.1." i huvudet. data/hushall.txt i exemplen i 3.13, 3.14 och 4.4. Beskrivning av hur räkneexemplet öppnas i 3.14. Formateringen i … (texten var avklippt i version 1.2 och finns inte kvar i git-historiken). |
| 3 | Uppdatera till version 1.3 efter PO:s ändring av design.md till version 1.7 under Lab 3: räkneexemplet ligger i data/hushallExempel.txt och öppnas med `POST /oppna` och `{ exempel: true }`, Spara skriver alltid data/hushall.txt, och avsnitt 4.4 saknade text för tre serversvar. | Designer-AI ställde sju frågor. PO beslutade: (1) E-F2 behålls även för räkneexemplet och avvikelsen förs in i avsnitt 7. (2) {filnamn} i B-OPPNA är den fil som knappen läser. (3) E-S3 ger status 400. (4) Texterna i E-S2 och E-S3 ändras inte; en mening under tabellen i 4.4 förklarar att de inte visas i Webbvy. (5) Huvudets F1 får tillägget om räkneexemplet. (6) Den avklippta raden för runda 2 avslutas med en notering. (7) T-START-TOM nämner räkneexemplet. | Version 1.3: knappen [Öppna räkneexemplet] med hjälptext (T-EXEMPEL) och nytt flöde för räkneexemplet i 3.14, B-OPPNA gäller båda knapparna. Förtydligande i 3.13 att Spara alltid skriver data/hushall.txt. Båda valen i tabellen i avsnitt 3. Knapp, hjälptext och kvittens i 4.2 och 4.3. E-S2, E-S3 och E-S4 i 4.4. Avvikelse om räkneexemplet i avsnitt 7. |
| 4 | Uppdatera till version 1.4: belopp skrivs utan plustecken. Huvudet sade i F5 att belopp får ha ett plus- eller minustecken, men servern (tolkaHeltal, design.md avsnitt 7) godtar bara ett valfritt minustecken följt av siffror, så "+300" ger E-T2. | – (PO granskar version 1.4) | Version 1.4: F5 i huvudet säger "ett eventuellt minustecken". Inga inmatningsexempel med plustecken fanns i avsnitt 3 och 4. Visningen ändras inte: positiva belopp och avvikelser visas fortfarande med plustecken. Avvikelse om F5 i avsnitt 7. |

## 7. Avvikelser vid implementation (fylls i under Lab 3)

| Vy | Avvikelse från designen | Motivering (designbeslut) |
| --- | --- | --- |
| 3.13 Spara, 3.14 Öppna | Räkneexemplet (AK5.5) var data/hushall.txt och öppnades med [Öppna] (version 1.2). Nu ligger det i data/hushallExempel.txt och öppnas med en egen knapp, [Öppna räkneexemplet] (`POST /oppna` med `{ exempel: true }`). Spara skriver alltid data/hushall.txt. | PO:s beslut 2026-11-25 (design.md avsnitt 7): exemplet ska inte skrivas över när kassören sparar. |
| 3.14 Öppna, 4.4 E-F2 | Saknas data/hushallExempel.txt visar [Öppna räkneexemplet] E-F2, som hänvisar till Spara ("Välj Spara för att skapa den."), fast Spara aldrig skapar räkneexemplet. | PO:s beslut 2026-11-26 (designrunda 3): texten behålls. Det godtas eftersom exemplet alltid följer med repot och en egen text kräver en kodändring. |
| Huvudet (F5); beloppsfälten i 3.1–3.5, 3.7 och 3.10 | F5 tillät plustecken vid inmatning av belopp i version 1.0–1.3. Nu godtas bara ett valfritt minustecken följt av siffror; Webbvy skickar värdet oförändrat och servern nekar t.ex. "+300" med E-T2. Visningen med plustecken (avsnitt 1 och 3.12) är oförändrad. | PO:s beslut 2026-11-26: servern (tolkaHeltal) och E-T2 godtar bara minustecken, och belopp ska inte tolkas i gränssnittet (AK6.3). |
