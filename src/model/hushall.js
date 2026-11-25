// Hushall – K1, K2. Håller konton och budgetposter och kontrollerar reglerna innan något ändras.

import { DubblettFel, SaknasFel, RegelFel } from './fel.js';
import { Transaktion } from './transaktion.js';
import { Budgetpost, kontrolleraManad } from './budgetpost.js';
import { kontrolleraKontonamn, kontrolleraIngaendeSaldo } from './konto.js';
import { normaliseraKategori, visningsnamn, formateraBelopp, kontrolleraKategori } from './kategori.js';

export class Hushall {
  #konton = [];
  #budgetposter = [];

  // Lägger till kontot om inget annat konto har samma namn utan hänsyn till stora och små
  // bokstäver (K1, beställarbeslut 6, E-K2). Namnet lagras som det skrevs.
  laggTillKonto(k) {
    const befintligt = this.#sokKonto(k.namn);
    if (befintligt) {
      throw this.#dubblettFel(befintligt);
    }
    this.#konton.push(k);
  }

  // Tar bort kontot om det saknar transaktioner (K2, AK2.2). Kontot finns inte → SaknasFel (E-K6);
  // kontot har transaktioner → RegelFel (E-K7). Hushållet ändras bara om inget fel kastas.
  taBortKonto(namn) {
    const konto = this.hittaKonto(namn);
    const antal = konto.hamtaTransaktioner().length;
    if (antal > 0) {
      throw new RegelFel(
        `Kontot "${konto.namn}" kan inte tas bort eftersom det har ${antal} transaktioner. Bara ett konto utan transaktioner kan tas bort.`
      );
    }
    this.#konton = this.#konton.filter((k) => k !== konto);
  }

  hamtaKonton() {
    return [...this.#konton];
  }

  // Returnerar kontot med namnet, utan hänsyn till stora och små bokstäver (beställarbeslut 6).
  // Annars SaknasFel (E-K6).
  hittaKonto(namn) {
    const konto = this.#sokKonto(namn);
    if (!konto) {
      throw new SaknasFel(
        `Kontot "${namn ?? ''}" finns inte. Välj ett av förslagen, eller lägg först till kontot med Lägg till konto.`
      );
    }
    return konto;
  }

  // Byter namn och ingående saldo. Alla regler kontrolleras innan kontot ändras.
  andraKonto(namn, nyttNamn, nyttIngaendeSaldo) {
    const konto = this.hittaKonto(namn);
    const namnet = kontrolleraKontonamn(nyttNamn);
    // Bara andra konton räknas som dubblett; byte av skiftläge på kontots eget namn godtas (beslut 6).
    const nyckel = normaliseraKategori(namnet);
    const annat = this.#konton.find((k) => k !== konto && normaliseraKategori(k.namn) === nyckel);
    if (annat) {
      throw this.#dubblettFel(annat);
    }
    const saldot = kontrolleraIngaendeSaldo(nyttIngaendeSaldo);

    // Kontotypens regel (K3, E-K8) prövas bara om ingående saldo ändras.
    const andring = saldot - konto.ingaendeSaldo;
    const nyttSaldo = konto.saldo() + andring;
    if (andring !== 0 && !konto.tillaten(andring, nyttSaldo)) {
      throw new RegelFel(
        `Det nya ingående saldot skulle ge kontot "${konto.namn}" saldot ${formateraBelopp(nyttSaldo)}, vilket inte är tillåtet för kontotypen ${konto.kontotyp()}. Ange ett högre ingående saldo.`
      );
    }

    konto.namn = namnet;
    konto.ingaendeSaldo = saldot;
    return konto;
  }

  // Registrerar en ny transaktion sist på kontot (AK1.3, K3).
  registreraTransaktion(kontonamn, datum, kategori, belopp, beskrivning) {
    const konto = this.hittaKonto(kontonamn);
    const t = new Transaktion(datum, belopp, kategori, beskrivning);
    if (!konto.laggTillTransaktion(t)) {
      throw this.#saldoFel(konto, konto.saldo() + t.belopp);
    }
    return t;
  }

  // Ersätter transaktion nr (räknat från 1) på plats. Statusen på månadens budgetpost spelar
  // ingen roll (beställarbeslut 3); K1-reglerna och kontotypens regel gäller.
  andraTransaktion(kontonamn, nr, datum, kategori, belopp, beskrivning) {
    const konto = this.hittaKonto(kontonamn);
    const transaktioner = konto.hamtaTransaktioner();
    if (!Number.isInteger(nr) || nr < 1 || nr > transaktioner.length) {
      throw new SaknasFel(
        `Kontot "${konto.namn}" har ingen transaktion med nummer ${nr ?? ''}. Välj en transaktion i listan.`
      );
    }
    const t = new Transaktion(datum, belopp, kategori, beskrivning);
    if (!konto.ersattTransaktion(nr, t)) {
      throw this.#saldoFel(konto, konto.saldo() - transaktioner[nr - 1].belopp + t.belopp);
    }
    return t;
  }

  // Skapar en budgetpost med status Planerad. Budgetpost kontrollerar fälten först (ValideringsFel);
  // därefter nekas en andra budgetpost för samma kategori och månad, oavsett status (AK2.3, E-B4).
  // Kategorier jämförs med normaliseraKategori (beställarbeslut 4). Inget läggs till om ett fel kastas.
  skapaBudgetpost(kategori, manad, belopp) {
    const post = new Budgetpost(kategori, manad, belopp);
    const nyckel = normaliseraKategori(post.kategori);
    const befintlig = this.#budgetposter.find(
      (p) => normaliseraKategori(p.kategori) === nyckel && p.manad === post.manad
    );
    if (befintlig) {
      throw new DubblettFel(
        `Det finns redan en budgetpost för ${visningsnamn(befintlig.kategori)} ${befintlig.manad} med status ${befintlig.status}. Ändra beloppet på den befintliga budgetposten med Ändra budgetpost.`
      );
    }
    this.#budgetposter.push(post);
    return post;
  }

  hamtaBudgetposter() {
    return [...this.#budgetposter];
  }

  // Returnerar budgetposten för kategori och månad; kategorier jämförs med normaliseraKategori
  // (beställarbeslut 4). Annars SaknasFel (E-B5).
  hittaBudgetpost(kategori, manad) {
    const kat = kontrolleraKategori(kategori);
    const man = kontrolleraManad(manad);
    const nyckel = normaliseraKategori(kat);
    const post = this.#budgetposter.find(
      (p) => normaliseraKategori(p.kategori) === nyckel && p.manad === man
    );
    if (!post) {
      throw new SaknasFel(
        `Det finns ingen budgetpost för ${visningsnamn(kat)} ${man}. Kontrollera kategori och månad i listan Budgetposter.`
      );
    }
    return post;
  }

  // Kontot vars namn är lika med namn utan hänsyn till stora och små bokstäver, samma
  // normalisering som för kategorier (beställarbeslut 6). Annars undefined.
  #sokKonto(namn) {
    const nyckel = normaliseraKategori(namn ?? '');
    return this.#konton.find((k) => normaliseraKategori(k.namn) === nyckel);
  }

  // E-K2 med det befintliga kontots namn.
  #dubblettFel(befintligt) {
    return new DubblettFel(`Det finns redan ett konto som heter "${befintligt.namn}". Välj ett annat namn.`);
  }

  // E-T6: kontotypen tillåter inte saldot som transaktionen skulle ge.
  #saldoFel(konto, nyttSaldo) {
    return new RegelFel(
      `Transaktionen nekas: saldot på kontot "${konto.namn}" skulle bli ${formateraBelopp(nyttSaldo)}, vilket inte är tillåtet för kontotypen ${konto.kontotyp()}. Saldot är nu ${formateraBelopp(konto.saldo())}. Ändra beloppet eller välj ett annat konto.`
    );
  }
}
