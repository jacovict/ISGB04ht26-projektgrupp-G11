// Webbvy (view) – K6, enligt docs/design-extern.md version 1.4 och API-tabellen i docs/design.md avsnitt 3.
// Webbvy visar det servern levererar och skickar formulärens värden oförändrade som text (AK6.3).
// Den kontrollerar inga format, belopp, datum, statusar eller kontotyper, ändrar inte listornas
// ordning och avgör inte vilka operationer som är tillåtna: servern nekar och Webbvy visar meddelandet.
// Det enda Webbvy gör med talen är att visa dem (tusentalsavgränsare, minustecken, plustecken, " kr").

// E-S1 (design-extern 4.4) är det enda felmeddelande som Webbvy själv visar: servern svarar inte.
const E_S1 =
  'Programmet svarar inte. Kontrollera att programmet är startat med node src/ui/server.js och ladda sedan om sidan.';

// Svar som inte är JSON (känd begränsning: kontonamnen "." och ".." normaliseras bort ur adressen
// av webbläsaren). Texten är serverns E-S4.
const E_S4 = 'Något gick fel i programmet. Data i programmet är oförändrad. Försök igen.';

// Räkneexemplets fil, som [Öppna räkneexemplet] läser (design-extern 3.14 och T-EXEMPEL).
const EXEMPELFIL = 'data/hushallExempel.txt';

// Ett felsvar { fel, meddelande } från servern, eller E-S1.
class SvarsFel extends Error {
  constructor(svar) {
    super(svar.meddelande);
    this.svar = svar;
  }
}

const hamta = (id) => document.getElementById(id);

// Senaste svaret från GET /status.
let senasteStatus = { filnamn: '', osparat: false };

// Stänger en öppen bekräftelse med Avbryt (null när ingen är öppen).
let stangBekraftelse = null;

// ---------------------------------------------------------------------------------------------
// Anrop till servern
// ---------------------------------------------------------------------------------------------

// Skickar ett anrop i API-tabellen och returnerar svarets JSON. Felsvar (400, 404, 500) kastas som
// SvarsFel med serverns { fel, meddelande }; svarar servern inte kastas E-S1.
export async function anropa(metod, url, data) {
  const init = { method: metod };
  if (data !== undefined) {
    init.headers = { 'Content-Type': 'application/json; charset=utf-8' };
    init.body = JSON.stringify(data);
  }
  let svar;
  try {
    svar = await fetch(url, init);
  } catch {
    throw new SvarsFel({ fel: '', meddelande: E_S1 });
  }
  let innehall;
  try {
    innehall = await svar.json();
  } catch {
    throw new SvarsFel({ fel: 'OväntatFel', meddelande: E_S4 });
  }
  if (!svar.ok) {
    throw new SvarsFel(innehall);
  }
  return innehall;
}

// Adressen för ett konto; namnet kodas med encodeURIComponent (design.md, Fält i anropen).
function kontoAdress(namn) {
  return `/konton/${encodeURIComponent(namn)}`;
}

// ---------------------------------------------------------------------------------------------
// Visningsformat (design-extern avsnitt 1 och 3.12). Bara textbehandling av serverns heltal.
// ---------------------------------------------------------------------------------------------

// Sätter mellanslag som tusentalsavgränsare i en text med bara siffror: "25000" → "25 000".
function medAvgransare(siffror) {
  let ut = '';
  for (let i = 0; i < siffror.length; i++) {
    ut += siffror[i];
    const kvar = siffror.length - i - 1;
    if (kvar > 0 && kvar % 3 === 0) {
      ut += ' ';
    }
  }
  return ut;
}

// Ett heltal från servern som text med tusentalsavgränsare och minustecken U+2212: -1300 → "−1 300".
function visaTal(heltal) {
  const text = String(heltal);
  return text.startsWith('-') ? `−${medAvgransare(text.slice(1))}` : medAvgransare(text);
}

// Belopp: "25 200 kr", "−1 300 kr".
function visaBelopp(heltal) {
  return `${visaTal(heltal)} kr`;
}

// Plustecken framför ett visat tal som inte är negativt eller 0: "300" → "+300", "0" → "0".
function medTecken(visatTal) {
  return visatTal.startsWith('−') || visatTal === '0' ? visatTal : `+${visatTal}`;
}

// ---------------------------------------------------------------------------------------------
// Meddelanderutan
// ---------------------------------------------------------------------------------------------

function visaMeddelande(klass, text) {
  const ruta = hamta('meddelande');
  ruta.className = `meddelande ${klass}`;
  hamta('meddelandeText').textContent = text;
  ruta.hidden = false;
}

function doljMeddelande() {
  hamta('meddelande').hidden = true;
}

// Grön ruta "Klart – {kvittens}".
function klart(kvittens) {
  visaMeddelande('klart', `Klart – ${kvittens}`);
}

// Röd ruta "Fel – {meddelande}" med serverns meddelande oförändrat; fokus flyttas till rutan.
export function visaFel(fel) {
  visaMeddelande('fel', `Fel – ${fel.meddelande}`);
  hamta('meddelande').focus();
}

// Kör en handling och visar ett fel i den röda rutan. Fälten behåller inmatningen.
async function utfor(handling) {
  try {
    await handling();
  } catch (fel) {
    if (fel instanceof SvarsFel) {
      visaFel(fel.svar);
    } else {
      console.error(fel);
      visaFel({ fel: 'OväntatFel', meddelande: E_S4 });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Bekräftelser (B-TABORT, B-AVSLUTA-POST, B-OPPNA, B-AVSLUTA)
// ---------------------------------------------------------------------------------------------

// Visar en bekräftelse mitt på sidan. Avbryt har fokus från början och Esc betyder Avbryt.
// Löses med true om kassören bekräftar, annars false.
function bekrafta({ rubrik, text, knapp, fara = false }) {
  return new Promise((svara) => {
    const bakgrund = hamta('bekraftelse');
    const ja = hamta('bekraftelseJa');
    const avbryt = hamta('bekraftelseAvbryt');
    const tidigareFokus = document.activeElement;

    hamta('bekraftelseRubrik').textContent = rubrik;
    hamta('bekraftelseText').textContent = text;
    ja.textContent = knapp;
    ja.classList.toggle('fara', fara);

    const stang = (bekraftat) => {
      bakgrund.hidden = true;
      ja.onclick = null;
      avbryt.onclick = null;
      stangBekraftelse = null;
      if (tidigareFokus) {
        tidigareFokus.focus();
      }
      svara(bekraftat);
    };
    ja.onclick = () => stang(true);
    avbryt.onclick = () => stang(false);
    stangBekraftelse = () => stang(false);

    bakgrund.hidden = false;
    avbryt.focus();
  });
}

// ---------------------------------------------------------------------------------------------
// Vyer och meny
// ---------------------------------------------------------------------------------------------

// Tömmer vyns formulär och döljer det som bara visas efter ett svar (data-aterstall).
// Element med data-aterstall="visa" visas i stället.
function aterstall(sektion) {
  for (const form of sektion.querySelectorAll('form')) {
    form.reset();
  }
  for (const del of sektion.querySelectorAll('[data-aterstall]')) {
    del.hidden = del.dataset.aterstall !== 'visa';
  }
}

// Visar en vy med tomma fält och markerar den i menyn. Inget skickas till servern.
function visaVy(namn) {
  for (const sektion of document.querySelectorAll('.vy')) {
    sektion.hidden = sektion.id !== `vy-${namn}`;
  }
  for (const knapp of document.querySelectorAll('#meny [data-vy]')) {
    if (knapp.dataset.vy === namn) {
      knapp.setAttribute('aria-current', 'page');
    } else {
      knapp.removeAttribute('aria-current');
    }
  }
  doljMeddelande();
  const sektion = hamta(`vy-${namn}`);
  aterstall(sektion);
  sektion.querySelector('h2').focus();
}

// Menyval, knappar som byter vy, Avbryt och Esc: vyn visas och listorna hämtas på nytt från servern.
function gaTill(namn) {
  visaVy(namn);
  utfor(uppdateraListor);
}

function visaSlutvy() {
  hamta('meny').hidden = true;
  visaVy('slut');
}

// ---------------------------------------------------------------------------------------------
// Listor från servern
// ---------------------------------------------------------------------------------------------

// Hämtar konton, budgetposter, kategorier och status och visar dem.
async function uppdateraListor() {
  const [konton, poster, kategorier, status] = await Promise.all([
    anropa('GET', '/konton'),
    anropa('GET', '/budgetposter'),
    anropa('GET', '/kategorier'),
    anropa('GET', '/status'),
  ]);
  visaKonton(konton);
  visaBudgetposter(poster);
  visaKategorier(kategorier);
  visaStatus(status);
}

function nyCell(rad, text, klass) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (klass) {
    cell.className = klass;
  }
  rad.append(cell);
  return cell;
}

function nyKnapp(text, vidKlick, klass) {
  const knapp = document.createElement('button');
  knapp.type = 'button';
  knapp.textContent = text;
  if (klass) {
    knapp.className = klass;
  }
  knapp.addEventListener('click', vidKlick);
  return knapp;
}

function fyllForslag(id, texter) {
  const lista = hamta(id);
  lista.replaceChildren(
    ...texter.map((text) => {
      const alternativ = document.createElement('option');
      alternativ.value = text;
      return alternativ;
    })
  );
}

// 3.0 Startvy, kontoförslagen och panelen Befintliga konton (3.1), i serverns ordning.
export function visaKonton(konton) {
  const kropp = hamta('kontonTabell').querySelector('tbody');
  kropp.replaceChildren();
  for (const konto of konton) {
    const rad = document.createElement('tr');
    nyCell(rad, konto.namn);
    nyCell(rad, konto.typ);
    nyCell(rad, visaBelopp(konto.saldo), 'tal');
    nyCell(rad, '').append(nyKnapp('Visa', () => oppnaVisaKonto(konto.namn)));
    kropp.append(rad);
  }
  hamta('kontonTabell').hidden = konton.length === 0;
  hamta('kontonTom').hidden = konton.length !== 0;

  fyllForslag('kontoForslag', konton.map((konto) => konto.namn));

  hamta('befintligaKonton').replaceChildren(
    ...konton.map((konto) => {
      const punkt = document.createElement('li');
      punkt.textContent = `${konto.namn} (${konto.typ})`;
      return punkt;
    })
  );
}

// Kontotyperna i rullistan i 3.1, i registrets ordning (GET /kontotyper). Ingen typ är hårdkodad.
function visaKontotyper(typer) {
  hamta('ltkTyp').replaceChildren(
    ...typer.map((typ) => {
      const alternativ = document.createElement('option');
      alternativ.value = typ;
      alternativ.textContent = typ;
      return alternativ;
    })
  );
}

function visaKategorier(kategorier) {
  fyllForslag('kategoriForslag', kategorier);
}

// Statusraden (T-FIL, T-OSPARAT) och filnamnet i Spara och Öppna.
function visaStatus(status) {
  senasteStatus = status;
  hamta('statusFil').textContent = `Fil: ${status.filnamn}`;
  hamta('statusOsparat').hidden = !status.osparat;
  for (const falt of document.querySelectorAll('.filnamn')) {
    falt.textContent = status.filnamn;
  }
}

// Tabellen Budgetposter i 3.7–3.10, i serverns ordning. Samma radknappar på alla rader.
export function visaBudgetposter(poster) {
  for (const behallare of document.querySelectorAll('.budgetposter')) {
    const tabell = behallare.querySelector('.budgettabell');
    const kropp = tabell.querySelector('tbody');
    kropp.replaceChildren();
    for (const post of poster) {
      const rad = document.createElement('tr');
      nyCell(rad, post.kategori);
      nyCell(rad, post.manad);
      nyCell(rad, visaBelopp(post.belopp), 'tal');
      nyCell(rad, post.status);
      nyCell(rad, '', 'radknappar').append(
        nyKnapp('Aktivera', () => oppnaBudgetvy('aktivera-budgetpost', post)),
        nyKnapp('Avsluta', () => oppnaBudgetvy('avsluta-budgetpost', post)),
        nyKnapp('Ändra belopp', () => oppnaBudgetvy('andra-budgetpost', post))
      );
      kropp.append(rad);
    }
    tabell.hidden = poster.length === 0;
    behallare.querySelector('.budget-tom').hidden = poster.length !== 0;
  }
}

// Raderna i transaktionstabellerna (3.5 och 3.6), i kontots ordning. Insättningar visas med plustecken.
function fyllTransaktioner(kropp, transaktioner, knapptext, vidKlick) {
  kropp.replaceChildren();
  for (const t of transaktioner) {
    const rad = document.createElement('tr');
    nyCell(rad, String(t.nr));
    nyCell(rad, t.datum);
    nyCell(rad, `${medTecken(visaTal(t.belopp))} kr`, 'tal');
    nyCell(rad, t.kategori);
    nyCell(rad, t.beskrivning);
    nyCell(rad, '').append(nyKnapp(knapptext, () => vidKlick(t)));
    kropp.append(rad);
  }
}

// ---------------------------------------------------------------------------------------------
// Uppslag av ett konto medan kassören skriver (3.2, 3.3, 3.4, 3.5, 3.11)
// ---------------------------------------------------------------------------------------------

// Hämtar kontot med GET /konton/{konto} när fältet ändras och ger det till visa, eller null om
// servern inte hittar det. Webbvy jämför inga namn; det gör servern (PO:s beslut i #21 fas 1).
function kopplaKontouppslag(falt, visa) {
  let senaste = 0;
  let timer = null;
  falt.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const nummer = ++senaste;
      const begart = falt.value;
      let konto = null;
      try {
        konto = await anropa('GET', kontoAdress(begart));
      } catch {
        konto = null;
      }
      if (nummer === senaste && falt.value === begart && !falt.closest('.vy').hidden) {
        visa(konto);
      }
    }, 250);
  });
}

// 3.2: nuvarande uppgifter och förifyllda nya värden, eller T-INGET-KONTO-VALT och tomma fält.
function visaAndraKontoUppgifter(konto) {
  const form = hamta('formAndraKonto');
  hamta('akUppgifter').hidden = konto === null;
  hamta('akIngetValt').hidden = konto !== null;
  if (konto === null) {
    form.elements.nyttNamn.value = '';
    form.elements.nyttIngaendeSaldo.value = '';
    return;
  }
  hamta('akTyp').textContent = konto.typ;
  hamta('akSaldo').textContent = visaBelopp(konto.saldo);
  form.elements.nyttNamn.value = konto.namn;
  form.elements.nyttIngaendeSaldo.value = String(konto.ingaendeSaldo);
}

// 3.3: kontotyp, saldo och antal transaktioner (längden på serverns lista), bara som information.
function visaTaBortUppgifter(konto) {
  hamta('tbkUppgifter').hidden = konto === null;
  hamta('tbkIngetValt').hidden = konto !== null;
  if (konto !== null) {
    hamta('tbkTyp').textContent = konto.typ;
    hamta('tbkSaldo').textContent = visaBelopp(konto.saldo);
    hamta('tbkAntal').textContent = String(konto.transaktioner.length);
  }
}

// Panelen "Valt konto" i 3.4 och 3.11.
function visaValtKonto(prefix) {
  return (konto) => {
    hamta(`${prefix}Panel`).hidden = konto === null;
    if (konto !== null) {
      hamta(`${prefix}PanelKonto`).textContent = `${konto.namn} – ${konto.typ}`;
      hamta(`${prefix}PanelSaldo`).textContent = `Saldo: ${visaBelopp(konto.saldo)}`;
    }
  };
}
const visaRegistreraPanel = visaValtKonto('rt');
const visaRantaPanel = visaValtKonto('br');

// 3.5: kontots transaktioner med [Välj] och saldot i panelen.
function visaAndraTransaktionKonto(konto) {
  hamta('atLista').hidden = konto === null;
  hamta('atPanelSaldo').hidden = konto === null;
  if (konto === null) {
    return;
  }
  const kropp = hamta('atTabell').querySelector('tbody');
  fyllTransaktioner(kropp, konto.transaktioner, 'Välj', valjTransaktion);
  hamta('atTabell').hidden = konto.transaktioner.length === 0;
  hamta('atTom').hidden = konto.transaktioner.length !== 0;
  hamta('atPanelSaldo').textContent = `Saldo: ${visaBelopp(konto.saldo)}`;
}

// [Välj] fyller i fälten med transaktionens nuvarande värden.
function valjTransaktion(t) {
  const f = hamta('formAndraTransaktion').elements;
  f.nr.value = String(t.nr);
  f.datum.value = t.datum;
  f.belopp.value = String(t.belopp);
  f.kategori.value = t.kategori;
  f.beskrivning.value = t.beskrivning;
}

// ---------------------------------------------------------------------------------------------
// Radknappar och knappar som öppnar en annan vy med förifyllda fält (ändrar aldrig data)
// ---------------------------------------------------------------------------------------------

// [Visa] på ett konto i startvyn → 3.6 med kontot visat.
function oppnaVisaKonto(namn) {
  gaTill('visa-konto');
  hamta('vkKonto').value = namn;
  utfor(visaValtKontoI36);
}

// Knapparna längst ned i 3.6 → 3.4 eller 3.11 med Konto förifyllt.
function oppnaMedKonto(vy, faltId, konto, visaPanel) {
  gaTill(vy);
  hamta(faltId).value = konto.namn;
  visaPanel(konto);
}

// [Ändra] på en transaktion i 3.6 → 3.5 med kontot och transaktionen förifyllda.
function oppnaAndraTransaktion(konto, t) {
  gaTill('andra-transaktion');
  hamta('atKonto').value = konto.namn;
  visaAndraTransaktionKonto(konto);
  valjTransaktion(t);
}

// [Aktivera], [Avsluta] och [Ändra belopp] → 3.8–3.10 med Kategori, Månad och "Vald budgetpost".
function oppnaBudgetvy(vy, post) {
  gaTill(vy);
  const sektion = hamta(`vy-${vy}`);
  const f = sektion.querySelector('form').elements;
  f.kategori.value = post.kategori;
  f.manad.value = post.manad;
  const vald = sektion.querySelector('.vald-budgetpost');
  vald.textContent = `Vald budgetpost: ${post.kategori} ${post.manad}, ${visaBelopp(post.belopp)}, status ${post.status}`;
  vald.hidden = false;
}

// ---------------------------------------------------------------------------------------------
// 3.6 Visa konto
// ---------------------------------------------------------------------------------------------

export function visaKonto(konto) {
  hamta('vkRubrik').textContent = `${konto.namn} – ${konto.typ}`;
  hamta('vkIngaende').textContent = visaBelopp(konto.ingaendeSaldo);
  hamta('vkSaldo').textContent = visaBelopp(konto.saldo);
  const kropp = hamta('vkTabell').querySelector('tbody');
  fyllTransaktioner(kropp, konto.transaktioner, 'Ändra', (t) => oppnaAndraTransaktion(konto, t));
  hamta('vkTabell').hidden = konto.transaktioner.length === 0;
  hamta('vkTom').hidden = konto.transaktioner.length !== 0;
  hamta('vkRegistrera').onclick = () => oppnaMedKonto('registrera-transaktion', 'rtKonto', konto, visaRegistreraPanel);
  hamta('vkRanta').onclick = () => oppnaMedKonto('berakna-ranta', 'brKonto', konto, visaRantaPanel);
  hamta('vkResultat').hidden = false;
}

async function visaValtKontoI36() {
  try {
    visaKonto(await anropa('GET', kontoAdress(hamta('vkKonto').value)));
  } catch (fel) {
    hamta('vkResultat').hidden = true;
    throw fel;
  }
}

// ---------------------------------------------------------------------------------------------
// 3.12 Månadssammanställning
// ---------------------------------------------------------------------------------------------

// Raderna i serverns ordning; Plac är radens nummer i listan. Andel och budget "–" visas oförändrade.
export function visaSammanstallning(rader, manad) {
  const tom = rader.length === 0;
  hamta('smResultat').hidden = tom;
  hamta('smTom').hidden = !tom;
  if (tom) {
    hamta('smTom').textContent = `Det finns inga transaktioner eller budgetposter för ${manad}. Sammanställningen är tom.`;
    return;
  }
  hamta('smRubrik').textContent = `Sammanställning för ${manad}`;
  const kropp = hamta('smTabell').querySelector('tbody');
  kropp.replaceChildren();
  rader.forEach((rad, index) => {
    const tr = document.createElement('tr');
    nyCell(tr, String(index + 1), 'tal');
    nyCell(tr, rad.kategori);
    nyCell(tr, typeof rad.budget === 'string' ? rad.budget : visaBelopp(rad.budget), 'tal');
    nyCell(tr, visaBelopp(rad.utfall), 'tal');
    nyCell(tr, medTecken(visaTal(rad.avvikelse)), 'tal');
    nyCell(tr, rad.andel, 'tal');
    kropp.append(tr);
  });
}

// ---------------------------------------------------------------------------------------------
// Primärknapparna (formulärens värden skickas oförändrade som text)
// ---------------------------------------------------------------------------------------------

function narSkickas(formId, handling) {
  const form = hamta(formId);
  form.addEventListener('submit', (handelse) => {
    handelse.preventDefault();
    utfor(() => handling(form.elements, form.closest('.vy')));
  });
}

function kopplaFormular() {
  // 3.1 Lägg till konto
  narSkickas('formLaggTillKonto', async (f, sektion) => {
    const konto = await anropa('POST', '/konton', {
      namn: f.namn.value,
      typ: f.typ.value,
      ingaendeSaldo: f.ingaendeSaldo.value,
    });
    aterstall(sektion);
    klart(`Kontot "${konto.namn}" (${konto.typ}) är tillagt med ingående saldo ${visaBelopp(konto.ingaendeSaldo)}.`);
    await uppdateraListor();
  });

  // 3.2 Ändra konto
  narSkickas('formAndraKonto', async (f, sektion) => {
    const konto = await anropa('PUT', kontoAdress(f.konto.value), {
      nyttNamn: f.nyttNamn.value,
      nyttIngaendeSaldo: f.nyttIngaendeSaldo.value,
    });
    aterstall(sektion);
    klart(
      `Kontot "${konto.namn}" är ändrat. Ingående saldo: ${visaBelopp(konto.ingaendeSaldo)}. Saldo: ${visaBelopp(konto.saldo)}.`
    );
    await uppdateraListor();
  });

  // 3.3 Ta bort konto (B-TABORT först)
  narSkickas('formTaBortKonto', async (f, sektion) => {
    const namn = f.konto.value;
    const bekraftat = await bekrafta({
      rubrik: `Ta bort kontot "${namn}"?`,
      text: 'Kontot tas bort ur programmet.',
      knapp: 'Ta bort konto',
      fara: true,
    });
    if (!bekraftat) {
      return;
    }
    const svar = await anropa('DELETE', kontoAdress(namn));
    aterstall(sektion);
    klart(`Kontot "${svar.namn}" är borttaget.`);
    await uppdateraListor();
  });

  // 3.4 Registrera transaktion (Konto behålls efter lyckad registrering)
  narSkickas('formRegistreraTransaktion', async (f, sektion) => {
    const namn = f.konto.value;
    const t = await anropa('POST', `${kontoAdress(namn)}/transaktioner`, {
      datum: f.datum.value,
      kategori: f.kategori.value,
      belopp: f.belopp.value,
      beskrivning: f.beskrivning.value,
    });
    const konto = await anropa('GET', kontoAdress(namn));
    aterstall(sektion);
    f.konto.value = namn;
    visaRegistreraPanel(konto);
    klart(
      `Transaktionen är registrerad på kontot "${konto.namn}": ${visaBelopp(t.belopp)}, ${t.kategori}, ${t.datum}. Nytt saldo: ${visaBelopp(konto.saldo)}.`
    );
    await uppdateraListor();
  });

  // 3.5 Ändra transaktion (Konto behålls så att listan syns)
  narSkickas('formAndraTransaktion', async (f, sektion) => {
    const namn = f.konto.value;
    const t = await anropa('PUT', `${kontoAdress(namn)}/transaktioner/${encodeURIComponent(f.nr.value)}`, {
      datum: f.datum.value,
      kategori: f.kategori.value,
      belopp: f.belopp.value,
      beskrivning: f.beskrivning.value,
    });
    const konto = await anropa('GET', kontoAdress(namn));
    aterstall(sektion);
    f.konto.value = namn;
    visaAndraTransaktionKonto(konto);
    klart(`Transaktion nr ${t.nr} på kontot "${konto.namn}" är ändrad. Nytt saldo: ${visaBelopp(konto.saldo)}.`);
    await uppdateraListor();
  });

  // 3.6 Visa konto
  narSkickas('formVisaKonto', () => visaValtKontoI36());

  // 3.7 Skapa budgetpost
  narSkickas('formSkapaBudgetpost', async (f, sektion) => {
    const post = await anropa('POST', '/budgetposter', {
      kategori: f.kategori.value,
      manad: f.manad.value,
      belopp: f.belopp.value,
    });
    aterstall(sektion);
    klart(`Budgetposten ${post.kategori} ${post.manad} är skapad med beloppet ${visaBelopp(post.belopp)} och status Planerad.`);
    await uppdateraListor();
  });

  // 3.8 Aktivera budgetpost
  narSkickas('formAktiveraBudgetpost', async (f, sektion) => {
    const post = await anropa('POST', '/budgetposter/aktivera', { kategori: f.kategori.value, manad: f.manad.value });
    aterstall(sektion);
    klart(`Budgetposten ${post.kategori} ${post.manad} är aktiverad. Status: Aktiv.`);
    await uppdateraListor();
  });

  // 3.9 Avsluta budgetpost (B-AVSLUTA-POST först)
  narSkickas('formAvslutaBudgetpost', async (f, sektion) => {
    const kategori = f.kategori.value;
    const manad = f.manad.value;
    const bekraftat = await bekrafta({
      rubrik: `Avsluta budgetposten ${kategori} ${manad}?`,
      text: 'Avslutad är ett sluttillstånd. Budgetposten kan inte aktiveras igen och beloppet kan inte ändras.',
      knapp: 'Avsluta budgetpost',
      fara: true,
    });
    if (!bekraftat) {
      return;
    }
    const post = await anropa('POST', '/budgetposter/avsluta', { kategori, manad });
    aterstall(sektion);
    klart(`Budgetposten ${post.kategori} ${post.manad} är avslutad. Status: Avslutad.`);
    await uppdateraListor();
  });

  // 3.10 Ändra budgetpost (belopp)
  narSkickas('formAndraBudgetpost', async (f, sektion) => {
    const post = await anropa('PUT', '/budgetposter', {
      kategori: f.kategori.value,
      manad: f.manad.value,
      belopp: f.belopp.value,
    });
    aterstall(sektion);
    klart(`Beloppet för budgetposten ${post.kategori} ${post.manad} är ändrat till ${visaBelopp(post.belopp)}.`);
    await uppdateraListor();
  });

  // 3.11 Beräkna ränta (null från servern ger T-RANTA-NOLL i grön ruta)
  narSkickas('formBeraknaRanta', async (f, sektion) => {
    const namn = f.konto.value;
    const manad = f.manad.value;
    const svar = await anropa('POST', `${kontoAdress(namn)}/ranta`, { manad });
    const konto = await anropa('GET', kontoAdress(namn));
    aterstall(sektion);
    if (svar.transaktion === null) {
      klart(`Ingen ränta bokfördes: räntan för kontot "${konto.namn}" i ${manad} blev 0 kr.`);
    } else {
      const t = svar.transaktion;
      klart(
        `Räntan för ${manad} är bokförd på kontot "${konto.namn}": ${visaBelopp(t.belopp)} den ${t.datum}. Nytt saldo: ${visaBelopp(konto.saldo)}.`
      );
    }
    await uppdateraListor();
  });

  // 3.12 Månadssammanställning (månaden behålls i fältet)
  narSkickas('formSammanstallning', async (f) => {
    const manad = f.manad.value;
    try {
      visaSammanstallning(await anropa('GET', `/sammanstallning?manad=${encodeURIComponent(manad)}`), manad);
    } catch (fel) {
      hamta('smResultat').hidden = true;
      hamta('smTom').hidden = true;
      throw fel;
    }
  });

  // 3.13 Spara
  hamta('knappSpara').addEventListener('click', () =>
    utfor(async () => {
      const svar = await anropa('POST', '/spara', {});
      klart(`Allt är sparat i filen "${svar.filnamn}".`);
      visaStatus(await anropa('GET', '/status'));
    })
  );

  // 3.14 Öppna: [Öppna] skickar {}, [Öppna räkneexemplet] skickar { exempel: true }
  hamta('knappOppna').addEventListener('click', () => utfor(() => oppna(false)));
  hamta('knappOppnaExempel').addEventListener('click', () => utfor(() => oppna(true)));

  // 3.15 Avsluta
  hamta('knappAvsluta').addEventListener('click', () => utfor(avsluta));
}

// B-OPPNA visas för båda knapparna när GET /status säger att det finns osparade ändringar.
// {filnamn} är den fil som knappen läser (design-extern 3.14).
async function oppna(exempel) {
  const status = await anropa('GET', '/status');
  visaStatus(status);
  const filnamn = exempel ? EXEMPELFIL : status.filnamn;
  if (status.osparat) {
    const bekraftat = await bekrafta({
      rubrik: 'Du har osparade ändringar',
      text: `Om du öppnar filen "${filnamn}" försvinner ändringarna sedan du senast sparade. Välj Avbryt och sedan Spara i menyn om du vill behålla dem.`,
      knapp: 'Öppna utan att spara',
    });
    if (!bekraftat) {
      return;
    }
  }
  const svar = await anropa('POST', '/oppna', exempel ? { exempel: true } : {});
  visaVy('konton');
  await uppdateraListor();
  if (exempel) {
    klart(`Räkneexemplet "${svar.filnamn}" är öppnat. Spara skriver till "${senasteStatus.filnamn}".`);
  } else {
    klart(`Filen "${svar.filnamn}" är öppnad.`);
  }
}

// B-AVSLUTA när det finns osparade ändringar, sedan POST /avsluta och slutvyn.
async function avsluta() {
  const status = await anropa('GET', '/status');
  visaStatus(status);
  if (status.osparat) {
    const bekraftat = await bekrafta({
      rubrik: 'Du har osparade ändringar',
      text: 'Om du avslutar nu försvinner ändringarna sedan du senast sparade. Välj Avbryt och sedan Spara i menyn om du vill behålla dem.',
      knapp: 'Avsluta utan att spara',
      fara: true,
    });
    if (!bekraftat) {
      return;
    }
  }
  await anropa('POST', '/avsluta', {});
  visaSlutvy();
}

// ---------------------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------------------

function kopplaNavigering() {
  for (const knapp of document.querySelectorAll('[data-vy], [data-ga]')) {
    knapp.addEventListener('click', () => gaTill(knapp.dataset.vy ?? knapp.dataset.ga));
  }
  for (const knapp of document.querySelectorAll('.vy .avbryt')) {
    knapp.addEventListener('click', () => gaTill('konton'));
  }
  hamta('meddelandeStang').addEventListener('click', doljMeddelande);

  // "Vald budgetpost" gäller bara de förifyllda värdena; den döljs när Kategori eller Månad ändras.
  for (const vald of document.querySelectorAll('.vald-budgetpost')) {
    const form = vald.closest('form');
    for (const falt of [form.elements.kategori, form.elements.manad]) {
      falt.addEventListener('input', () => {
        vald.hidden = true;
      });
    }
  }

  document.addEventListener('keydown', (handelse) => {
    if (stangBekraftelse !== null) {
      if (handelse.key === 'Escape') {
        handelse.preventDefault();
        stangBekraftelse();
      } else if (handelse.key === 'Tab') {
        // Fokus stannar i bekräftelsen.
        handelse.preventDefault();
        const ja = hamta('bekraftelseJa');
        const avbryt = hamta('bekraftelseAvbryt');
        (document.activeElement === ja ? avbryt : ja).focus();
      }
      return;
    }
    if (handelse.key === 'Escape' && hamta('vy-slut').hidden) {
      gaTill('konton');
    }
  });

  kopplaKontouppslag(hamta('akKonto'), visaAndraKontoUppgifter);
  kopplaKontouppslag(hamta('tbkKonto'), visaTaBortUppgifter);
  kopplaKontouppslag(hamta('rtKonto'), visaRegistreraPanel);
  kopplaKontouppslag(hamta('atKonto'), visaAndraTransaktionKonto);
  kopplaKontouppslag(hamta('brKonto'), visaRantaPanel);
}

// Programstart: startvyn Konton och GET /konton, /kontotyper, /budgetposter, /kategorier, /status.
function starta() {
  const mall = hamta('mallBudgetposter');
  for (const behallare of document.querySelectorAll('.budgetposter')) {
    behallare.append(mall.content.cloneNode(true));
  }
  kopplaNavigering();
  kopplaFormular();
  visaVy('konton');
  utfor(async () => {
    visaKontotyper(await anropa('GET', '/kontotyper'));
    await uppdateraListor();
  });
}

starta();
