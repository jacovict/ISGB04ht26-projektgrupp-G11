**Design – Hushållsbudgeten (G11)**

Version 1.7, 2026-11-26. Lab 2 del B, uppdaterad i Lab 3 sprint 1. Uppdateras när designen ändras (ÄB1).

# 1. Språk, ramverk och kommandon

- Språk och version: *JavaScript, Node.js 22 LTS*. Testramverk: *node:test*.

- Starta: node src/ui/server.js (öppna sedan http://localhost:3000). Testa: node --test.

# 2. Modulindelning

| **Modul/paket** | **Innehåll** | **Får importera** |
|---|---|---|
| src/model/ | Entiteter, tillstånd, regler, varianter (K1–K3):<br>Hushall, Konto (abstrakt), Lönekonto, Sparkonto, Kreditkort, Kontotyper (singleton), Budgetpost, Transaktion, Status och felklasserna ValideringsFel, DubblettFel, SaknasFel, RegelFel, StatusFel och FilformatFel samt kategori.js: normaliseraKategori(k) som ger jämförelsen (trim + gemener) och visningsnamn(k) som ger stor första bokstav visningsnamn(k) som ger stor första bokstav och formateraBelopp(belopp) som ger beloppet i hela kronor med vanligt mellanslag (U+0020) som tusentalsavgränsare, minustecknet − (U+2212) för negativa belopp och " kr" på slutet, t.ex. "−1 200 kr" (används i felmeddelandena E-K8 och E-T6), samt kontrollfunktionerna kontrolleraKategori (kategori.js), kontrolleraManad (budgetpost.js), kontrolleraKontonamn och kontrolleraIngaendeSaldo (konto.js), så att samma kontroll ger samma felmeddelande överallt |
| | src/logic/ | manadssammanstallning.js: manadssammanstallning(hushall, manad) enligt avsnitt 5 (Algoritm K4) och kontraktet i avsnitt 4 | | model |
| src/storage/ | fil.js: läser och skriver filen på disk med node:fs. sokvag(filnamn) ger sökvägen relativt projektets rotmapp (standard data/hushall.txt). Räkneexemplet ligger i data/hushallExempel.txt och skrivs aldrig av programmet. lasFil(filnamn): Hushall läser filen i UTF-8 och anropar lasHushall. sparaFil(hushall, filnamn) anropar skrivHushall, skriver filen och skapar mappen data/ om den saknas. lasWebbfil(namn) läser en av webbsidans filer i public/ åt Server och nekar sökvägar utanför public/.<br>filformat.js: lasHushall(text) och skrivHushall(hushall) enligt avsnitt 6 Filformat K5 (bara text, ingen disk).<br>server.js använder aldrig node:fs (K7 d) | model |
| src/ui/ | Server (controller, server.js): tar emot anropen i API-tabellen, anropar model, logic och storage och svarar med JSON. Ingen affärslogik (AK6.3). | model, logic, storage |
| tests/ | Tester, en fil per krav (t.ex. k3.kontotyper.test.js, k5.filformat.test.js). Testfilerna namnges \*.test.js. | alla |
| public/ | Webbvy (view: index.html, app.js, style.css): visar data och skickar inmatning till servern med fetch och JSON. Ingen affärslogik (AK6.3). | – (bara HTTP-anrop till servern) |

# 3. Klassdiagram (K1–K3, K6)

[bild]

Samma klasser i text. Kodagenten kan inte läsa en bild, så det är den här tabellen den följer:

| **Klass** | **Attribut** | **Metoder** | **Relationer (multiplicitet, arv/gränssnitt)** |
|---|---|---|---|
| **Webbvy** (view) | – | +visaKonton(konton: KontoJSON[]), +visaKonto(konto: KontoJSON), +visaBudgetposter(poster: BudgetpostJSON[]), +visaSammanstallning(rader: Rad[]), +visaFel(fel: { fel, meddelande }), +anropa(metod: String, url: String, data): Promise | anropar Server via HTTP (fetch, JSON) |
| Server (controller) | -hushall: Hushall | +start(port: Number), +laggTillKonto(req, res), +registreraTransaktion(req, res), +visaSammanstallning(req, res), +oppna(req, res) … | 1 –– 1 Hushall |
| Hushall | -konton: Konto[]<br>-budgetposter: Budgetpost[] | +laggTillKonto(k: Konto<br>),<br>+taBortKonto(namn: String<br>),<br>+hamtaKonton() : Konto[],<br>+hamtaKategorier(): String[],<br>+andraKonto(namn: String, nyttNamn: String, nyttIngaendeSaldo: Number),<br>+registreraTransaktion(<br>kontonamn: String,<br>datum: String,<br>kategori: String,<br>belopp: Number,<br>beskrivning: String),<br>+andraTransaktion(kontonamn: String, nr: Number, datum: String, kategori: String, belopp: Number, beskrivning: String): Transaktion<br>+skapaBudgetpost(kategori: String, manad: String, belopp: Number): Budgetpost,<br>+hamtaBudgetposter(): Budgetpost[],<br>+beraknaRanta(kontonamn: String, manad: String): Transaktion \| null,<br>+hittaKonto(namn: String) : Konto,<br>+hittaBudgetpost(kategori: String, manad: String) : Budgetpost | Hushall 1 —— 0..\* Konto<br>Hushall 1 —— 0..\* Budgetpost |
| Budgetpost | -kategori: String<br>-manad: String<br>-belopp: Number<br>-status: Status | +aktiveraBudgetpost(),<br>+avslutaBudgetpost(),<br>+nyttBelopp(nytt: number<br>) | 0..\* –– 1 Status |
| Transaktion | -datum: String<br>-belopp: Number<br>-kategori: String<br>-beskrivning: String |  | 0..\* –– 1 Konto |
| \<\<abstract\>\><br>Konto | -transaktioner: Transaktion[]<br>-namn: String<br>-ingaendeSaldo: Number | +saldo() : Number, +saldoPer(datum: String) : Number,<br>+lagstaSaldo(manad: String) : Number,<br>+laggTillTransaktion(t: Transaktion) : boolean,<br>+hamtaTransaktioner() : Transaktion[],<br>+ersattTransaktion(nr: Number, t: Transaktion): boolean<br>+namn, +ingaendeSaldo (läses med get; set används bara av Hushall.andraKonto efter att reglerna är kontrollerade)<br>+beraknaRanta(manad: String) : Transaktion \| null,<br>+tillaten(belopp: Number, nyttSaldo: Number) : boolean \*<br>+rantesats() : Number \*, +kontotyp() : String \* | 1 –– 0..\* Transaktion |
| \<\<singleton\>\><br>Kontotyper | -instans: Kontotyper<br>-register: Map\<String, Klass\> | -Kontotyper()<br>+hamta(): Kontotyper<br>+skapa(typ: String, namn: String, ingaendeSaldo: Number): Konto<br>+typer(): String[] | «creates» Konto (beroende) |
| Lönekonto |  | +tillaten(belopp, nyttSaldo) : nyttSaldo \>= 0,<br>+rantesats() : 0,<br>+kontotyp() : String | ärver Konto |
| Sparkonto |  | +tillaten(belopp, nyttSaldo<br>) : nyttSaldo \>= 0,<br>+rantesats() : 0.005,<br>+kontotyp() : String | ärver Konto |
| Kreditkort | -LIMIT: Number = 10000 {readOnly} | +tillaten(belopp, nyttSaldo) : nyttSaldo \>= -10000,<br>+rantesats() : 0,<br>+kontotyp() : String | ärver Konto |
| \<\<enumeration\>\><br>Status | PLANERAD, AKTIV, AVSLUTAD |  |  |
| ValideringsFel, DubblettFel, SaknasFel, RegelFel, StatusFel, FilformatFel | -message: String<br>FilformatFel även -rad: Number | – | Ärver Error. Kastas av model/ och storage/; Server fångar dem och svarar med { fel, meddelande }. |

\* = abstrakt metod, implementeras i varje subklass.

nr i andraTransaktion och ersattTransaktion är transaktionens position i kontots lista, räknat från 1.

**Utökningspunkt för en ny variant (AK3.3):**

**Ny kontotyp, exempel Barnkonto (ränta 1 % per månad, uttag nekas helt):**

1.  Skapa en ny fil src/model/barnkonto.js med klassen Barnkonto som ärver Konto och implementerar de tre abstrakta metoderna:

    - tillaten(belopp, nyttSaldo) : belopp \> 0 (alla uttag nekas)

      rantesats() : 0.01

      kontotyp() : "Barnkonto"

2.  Lägg till en rad i registret i Kontotyper: "Barnkonto" → Barnkonto.

**Ändras inte:** Konto, Lönekonto, Sparkonto, Kreditkort, Hushall, Server, Webbvy, logic/ och storage/. Räntan beräknas av Konto.beraknaRanta(manad) på samma sätt som för Sparkonto, med rantesats() gånger lägsta saldot, avrundat nedåt. Webbvy hämtar typerna via GET /kontotyper, som anropar Kontotyper.hamta().typer(), och filinläsningen skapar konton med Kontotyper.hamta().skapa(typ, …).

**Regel:** Ingen kod utanför subklasserna och Kontotyper får jämföra kontotypens namn eller använda instanceof på subklasserna.

**API-tabellen (Webbvy ↔ Server):**

Alla anrop skickar och tar emot JSON. Vid fel svarar servern med statuskod 400 och { fel, meddelande }, som Webbvy visar med visaFel.

| **Metod** | **Adress**                      | **Server anropar**                                                                                                                       | **Svar**                            |
|-----------|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|
| GET       | /kontotyper                     | Kontotyper.hamta().typer()                                                                                                               | lista med typnamn                   |
| GET       | /konton                         | Hushall.hamtaKonton()                                                                                                                    | lista med konton (namn, typ, saldo) |
| POST      | /konton                         | Kontotyper.hamta().skapa + Hushall.laggTillKonto                                                                                         | kontot                              |
| PUT       | /konton/:namn                   | Hushall.andraKonto                                                                                                                       | kontot                              |
| DELETE    | /konton/:namn                   | Hushall.taBortKonto                                                                                                                      | –                                   |
| GET       | /konton/:namn                   | Hushall.hittaKonto                                                                                                                       | kontot med transaktioner och saldo  |
| POST      | /konton/:namn/transaktioner     | Hushall.registreraTransaktion                                                                                                            | transaktionen                       |
| PUT       | /konton/:namn/transaktioner/:nr | Hushall.andraTransaktion                                                                                                                 | transaktionen                       |
| POST      | /konton/:namn/ranta             | Hushall.beraknaRanta                                                                                                                     | transaktionen eller null            |
| GET       | /budgetposter                   | Hushall.hamtaBudgetposter()                                                                                                              | lista med budgetposter              |
| POST      | /budgetposter                   | Hushall.skapaBudgetpost                                                                                                                  | budgetposten                        |
| POST      | /budgetposter/aktivera          | Hushall.hittaBudgetpost + aktiveraBudgetpost                                                                                             | budgetposten                        |
| POST      | /budgetposter/avsluta           | Hushall.hittaBudgetpost + avslutaBudgetpost                                                                                              | budgetposten                        |
| PUT       | /budgetposter                   | Hushall.hittaBudgetpost + nyttBelopp                                                                                                     | budgetposten                        |
| GET       | /sammanstallning?manad=ÅÅÅÅ-MM  | logic: månadssammanställning                                                                                                             | lista med rader                     |
| POST      | /spara                          | storage/fil.js: sparaFil(hushall, filnamn), som skriver data/hushall.txt om inget annat filnamn anges                                    | –                                   |
| POST      | /oppna                          | storage/fil.js: lasFil(filnamn), som läser data/hushall.txt; med { exempel: true } läses data/hushallExempel.txt. Serverns filnamn förblir data/hushall.txt, så Spara aldrig skriver över exemplet. Servern byter hushåll bara om inget fel kastas | –                                   |
| POST      | /avsluta                        | stänger servern                                                                                                                          | –                                   |
| GET       | /status                         | Serverns egna fält filnamn och osparat                                                                                                   | { filnamn, osparat }                |
| GET       | /kategorier                     | Hushall.hamtaKategorier()                                                                                                                | lista med kategorinamn              |
| GET       | /, /app.js, /style.css          | storage/fil.js: lasWebbfil(namn) (/ ger index.html) | filens innehåll med rätt innehållstyp (text/html, text/javascript, text/css); okänd fil ger status 404 |

**Fält i anropen (JSON):**

Kontonamnet i adressen kodas med encodeURIComponent (t.ex. /konton/L%C3%B6n). Belopp, ingående saldo och transaktionsnummer får skickas som tal eller som text; text tolkas med tolkaHeltal (se avsnitt 7). Alla svar vid fel har formen nedan.

| **Metod** | **Adress** | **Skickar** | **Svarar med** |
|---|---|---|---|
| POST | /konton | { namn: String, typ: String, ingaendeSaldo: Number \| String } | { namn, typ, ingaendeSaldo, saldo } |
| GET | /konton | – | [ { namn, typ, saldo } ] |
| GET | /konton/:namn | – | { namn, typ, ingaendeSaldo, saldo, transaktioner: [ { nr, datum, kategori, belopp, beskrivning } ] } |
| POST | /konton/:namn/transaktioner | { datum: "ÅÅÅÅ-MM-DD", kategori: String, belopp: Number \| String, beskrivning: String } | { nr, datum, kategori, belopp, beskrivning } |
| PUT | /konton/:namn/transaktioner/:nr | { datum, kategori, belopp: Number \| String, beskrivning } (nr i adressen) | { nr, datum, kategori, belopp, beskrivning } |
| GET | /kontotyper | – | [ String ] (i registrets ordning) |
| PUT | /konton/:namn | { nyttNamn: String, nyttIngaendeSaldo: Number \| String } | { namn, typ, ingaendeSaldo, saldo } |
| DELETE | /konton/:namn | – | { namn } |
| POST | /konton/:namn/ranta | { manad: "ÅÅÅÅ-MM" } | { transaktion: { nr, datum, kategori, belopp, beskrivning } \| null } |
| GET | /budgetposter | – | [ { kategori, manad, belopp, status } ] |
| POST | /budgetposter | { kategori: String, manad: "ÅÅÅÅ-MM", belopp: Number \| String } | { kategori, manad, belopp, status } |
| POST | /budgetposter/aktivera | { kategori, manad } | { kategori, manad, belopp, status } |
| POST | /budgetposter/avsluta | { kategori, manad } | { kategori, manad, belopp, status } |
| PUT | /budgetposter | { kategori, manad, belopp: Number \| String } | { kategori, manad, belopp, status } |
| GET | /sammanstallning?manad=ÅÅÅÅ-MM | – | [ { kategori: String, budget: Number \| "–", utfall: Number, avvikelse: Number, andel: String } ] (andel t.ex. "110,0 %" eller "–"; "–" är U+2013) |
| GET | /kategorier | – | [ String ] |
| GET | /status | – | { filnamn: String, osparat: Boolean } |
| POST | /spara | {} | { filnamn } |
| POST | /oppna | {} eller { exempel: true } | { filnamn } (den fil som lästes; serverns filnamn för Spara förblir data/hushall.txt) |
| POST | /avsluta | {} | { }, varefter servern stänger |
| Alla | vid fel | – | Status 400 och { fel: felklassens namn, t.ex. "ValideringsFel" eller "SaknasFel", meddelande: String } |
| Alla | oväntat fel | – | Status 500 och { fel: "OväntatFel", meddelande: "Något gick fel i programmet. Data i programmet är oförändrad. Försök igen." }; servern fortsätter att svara |

Kategorier i alla svar ges med visningsnamn. Belopp och saldon ges som heltal; Webbvy formaterar dem. status ges som Planerad, Aktiv eller Avslutad. GET /kategorier ger alla kategorier i transaktioner och budgetposter, en gång var, i svensk bokstavsordning. osparat blir sant efter varje lyckad ändring och falskt efter lyckad Spara eller Öppna. Alla lyckade anrop svarar med status 200.

# 4. Modulkontrakt (minst fem)

| **Metod** | **Förvillkor** | **Eftervillkor** | **Vid regelbrott** |
|---|---|---|---|
| Kontotyper.hamta() | – | Returnerar alltid samma instans; första anropet skapar den med registret Lönekonto, Sparkonto och Kreditkort | – (kan inte misslyckas). new Kontotyper() utanför klassen saknar den hemliga nyckeln och kastar Error("Använd Kontotyper.hamta()") när programmet körs. |
| Kontotyper.skapa(typ, namn, ingaendeSaldo) | typ finns i typer(); namn är inte tomt; ingaendeSaldo är ett heltal som är tillåtet för typen (≥ 0 för Lönekonto och Sparkonto, ≥ −10 000 för Kreditkort) | Returnerar ett nytt konto av rätt subklass med 0 transaktioner; saldo() = ingaendeSaldo och kontotyp() = typ | Kastar ValideringsFel; inget konto skapas |
| Hushall.laggTillKonto(k) | | Inget konto i hushållet har samma namn utan hänsyn till stora och små bokstäver (K1, beslut 6); namnet lagras och visas som det skrevs | | k finns i hamtaKonton(); antalet konton har ökat med 1 | Kastar DubblettFel; hushållet oförändrat |
| Hushall.registreraTransaktion(kontonamn, datum, kategori, belopp, beskrivning) | Kontot finns (AK2.1); datum har formen ÅÅÅÅ-MM-DD och är ett giltigt datum; belopp är ett heltal ≠ 0 (AK1.3); kategori är inte tom; kontots regel godtar det nya saldot (K3) | Kontot har exakt en transaktion till; nytt saldo = gammalt saldo + belopp; övriga konton oförändrade | Kastar SaknasFel, ValideringsFel eller RegelFel; alla konton oförändrade |
| Konto.laggTillTransaktion(t) | t är en giltig Transaktion | Om tillaten(t.belopp, saldo() + t.belopp) är sant läggs t sist i kontots lista och metoden returnerar true. Gränsvärden enligt AK3.1: Lönekonto med saldo 12 000 godtar −12 000; Kreditkort med saldo 0 godtar −10 000 | Returnerar false; kontot oförändrat (−12 001 respektive −10 001 nekas) |
| Hushall.taBortKonto(namn) | Kontot finns; kontot har 0 transaktioner (K2) | Kontot finns inte längre i hamtaKonton(); övriga konton oförändrade | Kastar SaknasFel eller RegelFel; hushållet oförändrat (AK2.2) |
| Hushall.skapaBudgetpost(kategori, manad, belopp) | manad har formen ÅÅÅÅ-MM; belopp är ett heltal ≥ 0; ingen budgetpost finns för samma kategori och månad, oavsett status (AK2.3) | En ny budgetpost med status PLANERAD returneras och finns i hamtaBudgetposter() | Kastar ValideringsFel eller DubblettFel; hushållet oförändrat |
| Budgetpost.aktiveraBudgetpost() | status = PLANERAD | status = AKTIV; kategori, månad och belopp oförändrade | Kastar StatusFel; budgetposten oförändrad (AK1.2) |
| Budgetpost.avslutaBudgetpost() | status = AKTIV | status = AVSLUTAD, som är ett sluttillstånd | Kastar StatusFel, även från PLANERAD; budgetposten oförändrad (AK1.2) |
| Budgetpost.nyttBelopp(nytt) | status ≠ AVSLUTAD; nytt är ett heltal ≥ 0 | belopp = nytt; status oförändrad | Kastar StatusFel eller ValideringsFel; budgetposten oförändrad (K1, AK1.3) |
| Hushall.beraknaRanta(kontonamn, manad) | Kontot finns; manad har formen ÅÅÅÅ-MM; ingen transaktion i kategorin Ränta är redan bokförd på kontot för månaden | Låt r = ⌊lagstaSaldo(manad) × rantesats()⌋. Om r \> 0 läggs en transaktion till med datum = månadens sista dag, belopp = r och kategori = Ränta, och den returneras. Annars returneras null och kontot är oförändrat. Exempel (AK3.1): Spar i november ger 100; Lön ger null | Kastar SaknasFel, ValideringsFel eller DubblettFel; kontot oförändrat |
| filformat.lasHushall(text) | text är filens innehåll | Returnerar ett nytt Hushall med exakt filens konton, transaktioner, budgetposter och statusar (AK5.1) | Kastar FilformatFel med radnummer och orsak (AK5.2–5.4); befintlig data i minnet är orörd (K5) |
| filformat.skrivHushall(hushall) | hushall är ett giltigt Hushall | Returnerar text enligt avsnitt 6 som lasHushall läser tillbaka till samma data (AK5.1) | – |
| Hushall.andraKonto(namn, nyttNamn, nyttIngaendeSaldo) | Kontot finns; nyttNamn är inte tomt och inget annat konto har det namnet utan hänsyn till stora och små bokstäver (K1, beslut 6); nyttIngaendeSaldo är ett heltal och, om det ingående saldot ändras, godtar kontotypen tillaten(ändring, nytt saldo), där ändring = nytt ingående saldo − gammalt. Ett rent namnbyte prövas inte mot kontotypen. Kommer från Designer AI:s fråga F7 | Kontot har nytt namn och nytt ingående saldo; transaktionerna är oförändrade | Kastar SaknasFel, DubblettFel, ValideringsFel eller RegelFel; kontot oförändrat |
| fil.lasFil(filnamn) | filnamn anges relativt projektets rotmapp; standard är data/hushall.txt. | returnerar ett nytt Hushall enligt filformat.lasHushall (AK5.1). | Vid regelbrott: filen finns inte → kastar SaknasFel. Filens innehåll är trasigt → FilformatFel från lasHushall, med rad och orsak (AK5.2–5.4). I båda fallen är data i minnet orörd; servern byter hushåll bara om inget fel kastas (K5). |
| fil.sparaFil(hushall, filnamn) | hushall är ett giltigt Hushall; filnamn som ovan. | mappen data/ skapas om den saknas; filen innehåller skrivHushall(hushall); lasFil läser tillbaka samma data (AK5.1). | filen kan inte skrivas → kastar FilformatFel; hushållet i minnet är oförändrat.<br>Felmeddelandenas text står ordagrant i design-extern.md 4.4 (E-F2, E-F3, E-F4). |
| logic.manadssammanstallning(hushall, manad) | hushall är ett giltigt Hushall; manad har formen ÅÅÅÅ-MM | Returnerar en ny lista med rader { kategori, budget, utfall, avvikelse, andel } enligt avsnitt 5, sorterad enligt steg 4. kategori = visningsnamn; budget = heltal eller "–" (U+2013); utfall och avvikelse = heltal; andel = text med en decimal, decimalkomma och " %" (U+0020 före %), eller "–". Hushållet ändras inte, och samma indata ger alltid samma lista (K4). En månad utan transaktioner och budgetposter ger en tom lista (AK4.2). | Kastar ValideringsFel (E-M1); hushållet oförändrat |
| Server.start(port) | port är ett heltal ≥ 0; 0 betyder att operativsystemet väljer en ledig port | Returnerar en Promise som löses med serverobjektet när servern lyssnar på localhost (bara den egna datorn); server.address().port ger porten och server.close() stänger servern. Varje start ger ett nytt, tomt Hushall; servern läser inte data/hushall.txt vid start (kassören öppnar filen med Öppna). server.js startar sig själv på port 3000 bara när filen körs direkt (import.meta.url === pathToFileURL(process.argv[1]).href), inte när den importeras av tester. | Promisen avvisas med felet om porten inte kan användas |
| fil.lasWebbfil(namn) | namn är ett filnamn i public/, t.ex. index.html | Returnerar filens innehåll | Namnet pekar utanför public/ eller filen finns inte → SaknasFel; inget läses utanför public/ |

# 

# 5. Algoritm K4

ALGORITM Månadssammanställning(månad)

| Indata | Utdata |
|---|---|
| en månad, t.ex. "2026-11". | en lista med rader. Varje rad har kategori, budget, utfall, avvikelse och andel.<br>Algoritm ändrar ingen data. |

**Steg 1 – Räkna ut hur mycket som gått ut i varje kategori**

Utgifter är negativa belopp i kontona. Vi byter tecken så att en

utgift räknas som ett positivt utfall. Inkomster blir då negativa.

En kategori som inte har fått något värde än räknas som 0.

utfall ← tom tabell

FÖR VARJE konto I hushall.hamtaKonton()

FÖR VARJE transaktion I konto.hamtaTransaktioner()

OM transaktionen är från rätt månad

OCH kategorin inte är "Överföring" DÅ

utfall\[kategori\] ← utfall\[kategori\] − transaktion.belopp

**Steg 2 – Hämta månadens budget**

Bara budgetposter som är *AKTIV* eller *AVSLUTAD* räknas.

En *PLANERAD* post räknas som att budget saknas.

budget ← tom tabell

FÖR VARJE post I hushall.hamtaBudgetposter()

OM post.manad = månad OCH post.status är AKTIV eller AVSLUTAD DÅ

budget\[post.kategori\] ← post.belopp

**Steg 3 – Bygg raderna**

En kategori kommer med om den har en budget eller om det har gått

ut pengar i den. Kategorier med bara inkomster kommer inte med.

kategorier ← alla kategorier i budget

Kategorier läggs i utfall som har utfall större än 0

(ingen kategori tas med två gånger)

rader ← tom lista

FÖR VARJE kategori I kategorier

spenderat ← utfall\[kategori\]

OM kategorin har budget DÅ

avvikelse ← spenderat − budget\[kategori\]

OM budget\[kategori\] = 0 DÅ

andel ← "–"

ANNARS

andel ← spenderat × 100 / budget\[kategori\],

avrundat till en decimal, följt av " %" (andelen levereras med decimalkomma ("110,0 %"), avvikelsen levereras som heltal, Webbvy lägger till plustecken och tusentalsavgränsare.)

lägg till raden (kategori, budget\[kategori\], spenderat, avvikelse, andel)

ANNARS

lägg till raden (kategori, "–", spenderat, spenderat, "–")

**Steg 4 – Sortera**

Sortera raderna efter:

1\. avvikelse, störst först

2\. vid lika avvikelse: utfall, störst först

3\. vid lika utfall: kategorinamn i svensk bokstavsordning

RETURNERA rader

(finns ingen data för månaden blir listan tom)

SLUT

**Genomgång av direktivets räkneexempel steg för steg mot algoritmen:**

| **Nr** | **Konto**  | **Kategori** | **Belopp** | **Med?**         | **Utfall efter steget**     |
|--------|------------|--------------|------------|------------------|-----------------------------|
| 1      | Lönekonto  | Inkomst      | +25 000    | Ja               | Inkomst = −25 000           |
| 2      | Lönekonto  | Boende       | −6 500     | Ja               | Boende = 6 500              |
| 3      | Lönekonto  | Överföring   | −3 000     | Nej (Överföring) | –                           |
| 7      | Lönekonto  | Mat          | −2 300     | Ja               | Mat = 2 300                 |
| 4      | Sparkonto  | Överföring   | +3 000     | Nej (Överföring) | –                           |
| 5      | Kreditkort | Mat          | −1 200     | Ja               | Mat = 2 300 + 1 200 = 3 500 |
| 6      | Kreditkort | Mat          | +200       | Ja               | Mat = 3 500 − 200 = 3 300   |
| 8      | Kreditkort | Hälsa        | −300       | Ja               | Hälsa = 300                 |

**Resultat = direktivets facit:**

| **Kategori** | **Budget** | **Utfall** | **Avvikelse** | **Andel** |
|--------------|------------|------------|---------------|-----------|
| Mat          | 3 000      | 3 300      | 300           | 110,0 %   |
| Hälsa        | –          | 300        | 300           | –         |
| Boende       | 6 500      | 6 500      | 0             | 100,0 %   |
| Nöje         | 500        | 0          | −500          | 0,0 %     |

# 6. Filformat K5

- Versionsrad: HUSHALL;1. Sektioner: \[KONTON\], \[BUDGETPOSTER\] och \[TRANSAKTIONER\].  
  Radformat: en post per rad, fälten skiljs med semikolon.

- Felfall (AK5.2–5.4) och hur radnummer rapporteras: Till exempel ger en transaktion med ett konto som saknas Rad 14: kontot "Lönn" finns inte i filen (AK5.2), ett belopp som inte är ett heltal Rad 9: beloppet "tusen" är inte ett heltal (AK5.3) och en okänd status Rad 7: statusen "Klar" finns inte (Planerad, Aktiv, Avslutad) (AK5.4).

- Motivering av formatvalet: Formatet är lättläst och går enkelt att dela upp i JavaScript utan externa bibliotek.
- Tom rad hoppas över
- Kontonamn jämförs utan hänsyn till stora och små bokstäver vid inläsning (beslut 6): en transaktion med kontot "lön" hör till kontot "Lön". Två konton med samma namn i filen, även med olika skiftläge, ger FilformatFel: Rad {n}: kontot "{namn}" finns redan i filen.
- Specialtecken i textfält (kontonamn, kategori, beskrivning): semikolon skrivs `\;` och omvänt snedstreck skrivs `\\`. lasHushall läser tillbaka dem till `;` och `\`.
- Radslut: lasHushall godtar både `\n` och `\r\n` samt en BOM i början av filen. skrivHushall skriver `\n` och inga tomma rader.
- Felorsaker utöver AK5.2–5.4: Rad 1: första raden ska vara HUSHALL;1. · Rad {n}: okänd sektion "{text}". · Rad {n}: raden ligger utanför en sektion. · Rad {n}: fel antal fält ({antal}, ska vara {väntat}). Fel som modellen hittar (t.ex. ogiltigt datum, otillåtet saldo för kontotypen, dubblett av budgetpost) ges som Rad {n}: följt av modellens felmeddelande, så att ingen kontroll görs två gånger.
- Sparas data/hushall.txt

- Repot levereras med räkneexemplet som data/hushallExempel.txt (AK5.5), för provkörning. data/hushall.txt är kassörens egen fil; den skapas första gången kassören väljer Spara och committas inte.

- Version 2 (fylls i vid ÄB1)

Exempel på filformatets utseende.

HUSHALL;1

\[KONTON\]

Lön;Lönekonto;12000

Spar;Sparkonto;20000

Kort;Kreditkort;0

\[BUDGETPOSTER\]

Boende;2026-11;6500;Aktiv

Mat;2026-11;3000;Aktiv

Nöje;2026-11;500;Aktiv

Hälsa;2026-11;600;Planerad

Mat;2026-10;3000;Avslutad

\[TRANSAKTIONER\]

Lön;2026-11-01;25000;Inkomst;Månadsavgifter

Lön;2026-11-03;-6500;Boende;Hyra

Lön;2026-11-05;-3000;Överföring;Till sparkontot

Spar;2026-11-05;3000;Överföring;Från lönekontot

Kort;2026-11-08;-1200;Mat;Storhandling

Kort;2026-11-20;200;Mat;Retur av varor

Lön;2026-11-22;-2300;Mat;Veckohandling

Kort;2026-11-30;-300;Hälsa;Apotek

# 7. Designbeslut och ändringar

| **Datum**  | **Beslut/ändring**                                                                                                                                            | **Varför**                                                                                                                                      | **Påverkade delar**                                                                                                         |
|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| 2026-11-19 | Singleton och mvc struktur                                                                                                                                    | Beställaren kräver att ha en mvc struktur med singleton design pattern.                                                                         | Meny ersätts av Webbvy (view, public/) och Server (controller, src/ui/server.js); model/ är Model; Kontotyper är singleton. |
| 2026-11-18 | Webbvy och Server kommunicerar med JSON enligt API-tabellen i avsnitt 3.                                                                                      | Beställarbeslut 2 och 5: JSON och localhost är tillåtna; filen på disk har ändå eget format (K5).                                               | public/, src/ui/                                                                                                            |
| 2026-11-22 | Kategorier jämförs med normaliseraKategori (trim + gemener) och skrivs ut med stor första bokstav.                                                            | Beställarbeslut 4: ”mat” och ”Mat” är samma kategori, även i K2 och sorteringen; utskriften ska dokumenteras.                                   | model/kategori.js, Hushall, logic/                                                                                          |
| 2026-11-22 | Beslut om fast fil.                                                                                                                                           | Analys av TPL/Designer.                                                                                                                         | /storage                                                                                                                    |
| 2026-11-22 | Se svar på designer frågor F1-F7.                                                                                                                             | \-                                                                                                                                              | \-                                                                                                                          |
| 2026-11-22 | Kontrakt för lasFil och sparaFil: saknad fil ger SaknasFel; trasig fil och fil som inte kan skrivas ger FilformatFel. Data i minnet är orörd.                 | PO:s beslut i designrunda 2. Design.md hade inga kontrakt för fil.js, och inga nya felklasser behövs.                                           | storage/fil.js, src/ui/server.js                                                                                            |
| 2026-11-22 | Repot levereras med räkneexemplet som data/hushall.txt, och kassören öppnar det med Öppna.                                                                    | PO:s beslut i designrunda 2 (AK5.5) med den fasta filen.                                                                                        | data/, README                                                                                                               |
| 2026-11-22 | Servern levererar andel som text med decimalkomma ("110,0 %" eller "–") och avvikelse som heltal. Webbvy lägger bara till plustecken och tusentalsavgränsare. | PO:s beslut i designrunda 2. Det ska vara tydligt vem som formaterar, så att Webbvy inte räknar något (AK6.3) och resultatet stämmer med AK4.1. | logic/, public/                                                                                                             |
| 2026-11-25 | Tom rad i filen hoppas över vid inläsning men räknas i radnumret. | Granskning av testprotokollet: radnumren i felmeddelandena (AK5.2–5.4) måste vara entydiga. | storage/filformat.js |
| 2026-11-25 | formateraBelopp(belopp) i model/kategori.js formaterar belopp i felmeddelanden enligt design-extern.md avsnitt 1. | Felmeddelandena E-K8 och E-T6 skapas i model/ och innehåller belopp; design.md angav inte var formateringen ligger. Webbvy får inte räkna (AK6.3). | model/kategori.js |
| 2026-11-25 | Konto har setters för namn och ingående saldo, och model/ har kontrollfunktioner för kategori, månad, kontonamn och ingående saldo. | Kodagentens implementation av #1: andraKonto måste kunna ändra kontot, och samma kontroll ska ge samma felmeddelande överallt. Godkänt av PO. | model/konto.js, kategori.js, budgetpost.js |
| 2026-11-25 | I andraKonto prövas kontotypens regel bara när det ingående saldot ändras, med ändringen som belopp. | Kontraktet angav inte beloppet; utan detta skulle ett namnbyte på ett Barnkonto (AK3.3) nekas. Godkänt av PO. | model/hushall.js |
| 2026-11-25 | Kontonamn jämförs med samma normalisering som kategorier (trim + gemener) och visas som de skrevs när kontot skapades; samma jämförelse gäller när en fil öppnas. Ersätter det provisoriska beslutet om exakt jämförelse. | Beställarbeslut 6. | model/hushall.js, storage/filformat.js |
| 2026-11-25 | Kontrakt för manadssammanstallning(hushall, manad) med radformatet från testprotokollet (T19). | Testerna för K4 kodas i #3 och behöver funktionens namn och returvärde; arbetsregel 3 kräver ett kontrakt före varje kodagentrunda. | logic/ |
| 2026-11-25 | Räkneexemplet ligger i data/hushallExempel.txt för provkörning och skrivs aldrig av programmet; data/hushall.txt är kassörens fil. Ersätter beslutet 2026-11-22 om att repot levereras med exemplet som data/hushall.txt. | PO:s beslut: exemplet ska inte skrivas över när kassören sparar. design-extern.md 3.13–3.14 ändras i en designrunda före #7. | data/, storage/, ui/, public/, README |
| 2026-11-26 | Kontotyper.skapa prövar ingående saldo med kontotypens egen regel, tillaten(ingående saldo, ingående saldo); ett ingående saldo på 0 kr prövas inte. | Utan typnamn (AK3.3); samma princip som andraKonto, så att en framtida kontotyp som Barnkonto kan skapas med 0 kr. Godkänt av PO. | model/kontotyper.js |
| 2026-11-26 | Räntetransaktionen får beskrivningen "Ränta ÅÅÅÅ-MM". En Ränta-transaktion som kassören registrerat själv räknas också, så beräkna ränta ger då E-R1. | Kontraktet angav ingen beskrivning; kontraktet och design-extern 3.11: räntan bokförs en gång per konto och månad. Godkänt av PO. | model/konto.js, model/hushall.js |
| 2026-11-26 | Andelen avrundas till närmaste tiondel (exakt hälften bort från noll); en negativ andel skrivs med bindestreck (-5,0 %). | Kontraktet angav varken avrundning eller tecken för negativ andel. Bindestreck fungerar i CSV-export (K9). Godkänt av PO. | logic/ |
| 2026-11-26 | Filformatet: `\;` och `\\` för specialtecken i textfält; fasta felorsaker för filens struktur och modellens felmeddelande efter "Rad {n}: " för övriga fel; `\n` och `\r\n` godtas vid inläsning, `\n` skrivs. | Avsnitt 6 angav inte detta; utan det går filen sönder vid semikolon i en beskrivning och vid CRLF-radslut på Windows (* text=auto). PO:s beslut inför #6. | storage/filformat.js, README |
| 2026-11-26 | Belopp, ingående saldo och transaktionsnummer får komma som tal eller som text. Text tolkas av tolkaHeltal(varde) i src/model/kategori.js: valfritt minustecken följt av siffror; allt annat ("12 00", "12.5", "500kr", "") ger ValideringsFel med E-T2 (transaktionsbelopp), E-B3 (budgetbelopp) eller E-K4 (ingående saldo). Ett transaktionsnummer som inte går att tolka ger SaknasFel med E-T7. | Värden från formulär och adresser kommer som text; "12 00" och "500kr" får inte tyst bli 1200 eller 500. En gemensam funktion ger samma regel överallt. | model/kategori.js, Hushall, Kontotyper, Budgetpost |
| 2026-11-26 | Server.start(port) returnerar en Promise med serverobjektet och ger varje start ett nytt, tomt Hushall; server.js startar sig själv bara när filen körs direkt. Fälten i anropen står i tabellen Fält i anropen i avsnitt 3. | Testerna för AK6.2 startar servern på port 0 och stänger den efteråt, utan att påverka varandra eller data/hushall.txt. | ui/server.js, tests/k6.server.test.js |
| 2026-11-26 | Webbsidans filer läses av fil.lasWebbfil(namn), som bara läser i public/. Fel som inte är felklasserna ger status 500 och { fel: "OväntatFel", meddelande } och servern fortsätter att svara. | server.js får inte använda node:fs (K7 d), men måste skicka public/ till webbläsaren. Oväntade fel (t.ex. en fil som inte går att läsa, känd begränsning från #6) saknade svar. PO:s beslut inför #7. | storage/fil.js, ui/server.js |
| 2026-11-26 | Ett transaktionsnummer som inte går att tolka ger SaknasFel med E-T7 (ersätter ValideringsFel i beslutet om tal som text). Lyckade anrop svarar med status 200. Servern lyssnar bara på localhost. | E-T7 är SaknasFel i design-extern.md 4.4; samma fel ska ge samma felklass. API-tabellen angav bara statuskoder för fel. Beställarbeslut 5: localhost, ingen annan dator ska nå kassörens data. PO:s beslut på kodagentens frågor i #7 fas 1. | model/hushall.js, ui/server.js |
# När designen är klar: textversion för kodagenten

| **Det här steget gör TPL åt er – men bara omvandlingen, inte innehållet.**<br>1. Klistra in eller ladda upp det här dokumentet hos TPL med uppdraget: ”Här är vår design. Gör om den till markdown ordagrant: samma rubriker, tabeller och formuleringar. Lägg inte till, ta inte bort och förbättra ingenting. Skriv [bild] där klassdiagrammets bild står. Svara bara med markdown-texten.”<br>2. Spara svaret som docs/design.md (ny fil i VS Code, klistra in, spara).<br>3. Läs textversionen mot det här dokumentet. Stämmer något inte: rätta i design.md eller be om en ny omvandling.<br>4. Committa båda filerna och notera omvandlingen i AI-loggen.<br>5. När designen ändras: ändra först här i Word-filen och gör sedan om steg 1–4. |
|---|
