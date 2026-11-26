// Server (controller) – K6. Tar emot anropen i API-tabellen (design.md avsnitt 3), anropar model,
// logic och storage och svarar med JSON. Ingen affärslogik och ingen validering här (AK6.3): värdena
// i anropen skickas oförändrade till modellen, som kastar felklasserna vid regelbrott.
// Använder aldrig node:fs (K7 d); webbsidans filer läses av storage/fil.js.

import http from 'node:http';
import { pathToFileURL } from 'node:url';

import { Hushall } from '../model/hushall.js';
import { Kontotyper } from '../model/kontotyper.js';
import { visningsnamn } from '../model/kategori.js';
import {
  ValideringsFel,
  DubblettFel,
  SaknasFel,
  RegelFel,
  StatusFel,
  FilformatFel,
} from '../model/fel.js';
import { manadssammanstallning } from '../logic/manadssammanstallning.js';
import { lasFil, sparaFil, lasWebbfil, STANDARDFIL } from '../storage/fil.js';

// Räkneexemplets fil (AK5.5), som Öppna läser med { exempel: true }. Skrivs aldrig av programmet.
const EXEMPELFIL = 'data/hushallExempel.txt';

// Felklasserna som ger status 400 och { fel, meddelande }; alla andra fel ger status 500.
const FELKLASSER = [ValideringsFel, DubblettFel, SaknasFel, RegelFel, StatusFel, FilformatFel];

const OVANTAT_FEL = {
  fel: 'OväntatFel',
  meddelande: 'Något gick fel i programmet. Data i programmet är oförändrad. Försök igen.',
};

// Webbsidans filer: adress → filnamn i public/ och innehållstyp.
const WEBBFILER = new Map([
  ['/', { namn: 'index.html', typ: 'text/html; charset=utf-8' }],
  ['/app.js', { namn: 'app.js', typ: 'text/javascript; charset=utf-8' }],
  ['/style.css', { namn: 'style.css', typ: 'text/css; charset=utf-8' }],
]);

// --- Omvandling från modellens objekt till svarens JSON (fälten i "Fält i anropen") ---

function kontoJson(konto) {
  return {
    namn: konto.namn,
    typ: konto.kontotyp(),
    ingaendeSaldo: konto.ingaendeSaldo,
    saldo: konto.saldo(),
  };
}

// nr är transaktionens position i kontots lista, räknat från 1.
function transaktionJson(t, nr) {
  return {
    nr,
    datum: t.datum,
    kategori: visningsnamn(t.kategori),
    belopp: t.belopp,
    beskrivning: t.beskrivning,
  };
}

// Transaktionen t med sin position i kontots lista.
function transaktionPaKonto(konto, t) {
  return transaktionJson(t, konto.hamtaTransaktioner().indexOf(t) + 1);
}

function budgetpostJson(post) {
  return {
    kategori: visningsnamn(post.kategori),
    manad: post.manad,
    belopp: post.belopp,
    status: post.status,
  };
}

// Skriver ett JSON-svar.
function svaraJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Läser anropets kropp som JSON. Tom kropp, eller JSON som inte är ett objekt, ger {}.
async function lasKropp(req) {
  const delar = [];
  for await (const del of req) {
    delar.push(del);
  }
  const text = Buffer.concat(delar).toString('utf8');
  if (text.trim() === '') {
    return {};
  }
  const data = JSON.parse(text);
  return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

export class Server {
  #hushall = new Hushall();
  #filnamn = STANDARDFIL;
  #osparat = false;
  #server = null;

  // Adresserna i API-tabellen: metod, mönster och metoden som hanterar anropet.
  // Delarna i mönstret (kontonamn, nr) avkodas och läggs i req.params.
  #vagar = [
    ['GET', /^\/kontotyper$/, 'hamtaKontotyper'],
    ['GET', /^\/konton$/, 'hamtaKonton'],
    ['POST', /^\/konton$/, 'laggTillKonto'],
    ['GET', /^\/konton\/([^/]+)$/, 'visaKonto'],
    ['PUT', /^\/konton\/([^/]+)$/, 'andraKonto'],
    ['DELETE', /^\/konton\/([^/]+)$/, 'taBortKonto'],
    ['POST', /^\/konton\/([^/]+)\/transaktioner$/, 'registreraTransaktion'],
    ['PUT', /^\/konton\/([^/]+)\/transaktioner\/([^/]+)$/, 'andraTransaktion'],
    ['POST', /^\/konton\/([^/]+)\/ranta$/, 'beraknaRanta'],
    ['GET', /^\/budgetposter$/, 'hamtaBudgetposter'],
    ['POST', /^\/budgetposter$/, 'skapaBudgetpost'],
    ['PUT', /^\/budgetposter$/, 'andraBudgetpost'],
    ['POST', /^\/budgetposter\/aktivera$/, 'aktiveraBudgetpost'],
    ['POST', /^\/budgetposter\/avsluta$/, 'avslutaBudgetpost'],
    ['GET', /^\/sammanstallning$/, 'visaSammanstallning'],
    ['GET', /^\/kategorier$/, 'hamtaKategorier'],
    ['GET', /^\/status$/, 'visaStatus'],
    ['POST', /^\/spara$/, 'spara'],
    ['POST', /^\/oppna$/, 'oppna'],
    ['POST', /^\/avsluta$/, 'avsluta'],
  ];

  // Startar servern på port (0 = ledig port) på localhost. Promisen löses med serverobjektet
  // när servern lyssnar och avvisas med felet om porten inte kan användas.
  start(port) {
    return new Promise((klar, misslyckad) => {
      const server = http.createServer((req, res) => this.#hantera(req, res));
      server.once('error', misslyckad);
      server.listen(port, 'localhost', () => {
        server.off('error', misslyckad);
        klar(server);
      });
      this.#server = server;
    });
  }

  // Tar emot ett anrop: webbsidans filer, annars en adress i API-tabellen.
  // Felklasserna ger 400 och { fel, meddelande }; andra fel ger 500 och servern fortsätter att svara.
  async #hantera(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && WEBBFILER.has(url.pathname)) {
        const { namn, typ } = WEBBFILER.get(url.pathname);
        const innehall = lasWebbfil(namn);
        res.writeHead(200, { 'Content-Type': typ });
        res.end(innehall);
        return;
      }

      for (const [metod, monster, hanterare] of this.#vagar) {
        const traff = req.method === metod ? monster.exec(url.pathname) : null;
        if (traff) {
          req.params = traff.slice(1).map((del) => decodeURIComponent(del));
          req.query = url.searchParams;
          req.data = await lasKropp(req);
          this[hanterare](req, res);
          return;
        }
      }

      svaraJson(res, 404, { fel: 'SaknasFel', meddelande: `Adressen "${url.pathname}" finns inte.` });
    } catch (fel) {
      if (res.headersSent) {
        res.destroy();
      } else if (FELKLASSER.some((klass) => fel instanceof klass)) {
        svaraJson(res, 400, { fel: fel.name, meddelande: fel.message });
      } else {
        svaraJson(res, 500, OVANTAT_FEL);
      }
    }
  }

  // Svarar 200 efter en lyckad ändring och markerar att det finns osparade ändringar.
  #andrat(res, data) {
    this.#osparat = true;
    svaraJson(res, 200, data);
  }

  // --- Konton ---

  hamtaKontotyper(req, res) {
    svaraJson(res, 200, Kontotyper.hamta().typer());
  }

  hamtaKonton(req, res) {
    svaraJson(
      res,
      200,
      this.#hushall.hamtaKonton().map((k) => ({ namn: k.namn, typ: k.kontotyp(), saldo: k.saldo() }))
    );
  }

  laggTillKonto(req, res) {
    const { namn, typ, ingaendeSaldo } = req.data;
    const konto = Kontotyper.hamta().skapa(typ, namn, ingaendeSaldo);
    this.#hushall.laggTillKonto(konto);
    this.#andrat(res, kontoJson(konto));
  }

  visaKonto(req, res) {
    const konto = this.#hushall.hittaKonto(req.params[0]);
    svaraJson(res, 200, {
      ...kontoJson(konto),
      transaktioner: konto.hamtaTransaktioner().map((t, i) => transaktionJson(t, i + 1)),
    });
  }

  andraKonto(req, res) {
    const { nyttNamn, nyttIngaendeSaldo } = req.data;
    const konto = this.#hushall.andraKonto(req.params[0], nyttNamn, nyttIngaendeSaldo);
    this.#andrat(res, kontoJson(konto));
  }

  taBortKonto(req, res) {
    const namn = this.#hushall.hittaKonto(req.params[0]).namn;
    this.#hushall.taBortKonto(req.params[0]);
    this.#andrat(res, { namn });
  }

  // --- Transaktioner och ränta ---

  registreraTransaktion(req, res) {
    const { datum, kategori, belopp, beskrivning } = req.data;
    const t = this.#hushall.registreraTransaktion(req.params[0], datum, kategori, belopp, beskrivning);
    this.#andrat(res, transaktionPaKonto(this.#hushall.hittaKonto(req.params[0]), t));
  }

  andraTransaktion(req, res) {
    const { datum, kategori, belopp, beskrivning } = req.data;
    const [kontonamn, nr] = req.params;
    const t = this.#hushall.andraTransaktion(kontonamn, nr, datum, kategori, belopp, beskrivning);
    this.#andrat(res, transaktionPaKonto(this.#hushall.hittaKonto(kontonamn), t));
  }

  beraknaRanta(req, res) {
    const t = this.#hushall.beraknaRanta(req.params[0], req.data.manad);
    const transaktion = t === null ? null : transaktionPaKonto(this.#hushall.hittaKonto(req.params[0]), t);
    if (t === null) {
      svaraJson(res, 200, { transaktion });
    } else {
      this.#andrat(res, { transaktion });
    }
  }

  // --- Budgetposter ---

  hamtaBudgetposter(req, res) {
    svaraJson(res, 200, this.#hushall.hamtaBudgetposter().map(budgetpostJson));
  }

  skapaBudgetpost(req, res) {
    const { kategori, manad, belopp } = req.data;
    this.#andrat(res, budgetpostJson(this.#hushall.skapaBudgetpost(kategori, manad, belopp)));
  }

  aktiveraBudgetpost(req, res) {
    const post = this.#hushall.hittaBudgetpost(req.data.kategori, req.data.manad);
    post.aktiveraBudgetpost();
    this.#andrat(res, budgetpostJson(post));
  }

  avslutaBudgetpost(req, res) {
    const post = this.#hushall.hittaBudgetpost(req.data.kategori, req.data.manad);
    post.avslutaBudgetpost();
    this.#andrat(res, budgetpostJson(post));
  }

  andraBudgetpost(req, res) {
    const post = this.#hushall.hittaBudgetpost(req.data.kategori, req.data.manad);
    post.nyttBelopp(req.data.belopp);
    this.#andrat(res, budgetpostJson(post));
  }

  // --- Sammanställning, kategorier och status ---

  visaSammanstallning(req, res) {
    svaraJson(res, 200, manadssammanstallning(this.#hushall, req.query.get('manad')));
  }

  hamtaKategorier(req, res) {
    svaraJson(res, 200, this.#hushall.hamtaKategorier());
  }

  visaStatus(req, res) {
    svaraJson(res, 200, { filnamn: this.#filnamn, osparat: this.#osparat });
  }

  // --- Fil ---

  spara(req, res) {
    sparaFil(this.#hushall, this.#filnamn);
    this.#osparat = false;
    svaraJson(res, 200, { filnamn: this.#filnamn });
  }

  // Läser programmets fil, eller räkneexemplet med { exempel: true }. Hushållet byts bara om
  // lasFil inte kastar något fel (K5); filnamnet för Spara ändras aldrig.
  oppna(req, res) {
    const namn = req.data.exempel === true ? EXEMPELFIL : this.#filnamn;
    const nytt = lasFil(namn);
    this.#hushall = nytt;
    this.#osparat = false;
    svaraJson(res, 200, { filnamn: namn });
  }

  // Svarar och stänger sedan servern.
  avsluta(req, res) {
    res.on('finish', () => this.#server.close());
    svaraJson(res, 200, {});
  }
}

// Startar en ny server med ett nytt, tomt Hushall (design.md avsnitt 4, Server.start).
export function start(port) {
  return new Server().start(port);
}

// Startar på port 3000 bara när filen körs direkt (node src/ui/server.js), inte när den importeras.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start(3000).then(
    () => console.log('Hushållsbudgeten körs på http://localhost:3000'),
    (fel) => {
      console.error(`Servern kunde inte starta: ${fel.message}`);
      process.exitCode = 1;
    }
  );
}
