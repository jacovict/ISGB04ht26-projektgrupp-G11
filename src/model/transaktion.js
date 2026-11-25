// Transaktion – K1. Konstruktorn kontrollerar fälten, så en Transaktion är alltid giltig.

import { ValideringsFel } from './fel.js';
import { kontrolleraKategori } from './kategori.js';

// Kontrollerar att datum har formen ÅÅÅÅ-MM-DD (E-T3) och finns i kalendern (E-T4).
function kontrolleraDatum(datum) {
  const text = String(datum ?? '');
  const delar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!delar) {
    throw new ValideringsFel(
      `Datumet "${text}" har fel format. Skriv datumet som ÅÅÅÅ-MM-DD, till exempel 2026-11-08.`
    );
  }
  const ar = Number(delar[1]);
  const manad = Number(delar[2]);
  const dag = Number(delar[3]);
  const d = new Date(Date.UTC(ar, manad - 1, dag));
  if (d.getUTCFullYear() !== ar || d.getUTCMonth() !== manad - 1 || d.getUTCDate() !== dag) {
    throw new ValideringsFel(
      `Datumet "${text}" finns inte. Kontrollera månad och dag, till exempel 2026-11-30.`
    );
  }
  return text;
}

// Kontrollerar att beloppet är ett heltal (E-T2) och inte 0 (E-T1, AK1.3).
function kontrolleraBelopp(belopp) {
  if (!Number.isInteger(belopp)) {
    throw new ValideringsFel(
      `Beloppet "${belopp ?? ''}" är inte ett belopp i hela kronor. Skriv bara siffror utan mellanslag, med minustecken för en utgift, till exempel -1200.`
    );
  }
  if (belopp === 0) {
    throw new ValideringsFel(
      'Beloppet får inte vara 0. Skriv ett positivt belopp för en insättning eller ett negativt för en utgift, till exempel -1200.'
    );
  }
  return belopp;
}

export class Transaktion {
  #datum;
  #belopp;
  #kategori;
  #beskrivning;

  constructor(datum, belopp, kategori, beskrivning = '') {
    this.#datum = kontrolleraDatum(datum);
    this.#belopp = kontrolleraBelopp(belopp);
    this.#kategori = kontrolleraKategori(kategori);
    this.#beskrivning = String(beskrivning ?? '');
  }

  get datum() {
    return this.#datum;
  }

  get belopp() {
    return this.#belopp;
  }

  get kategori() {
    return this.#kategori;
  }

  get beskrivning() {
    return this.#beskrivning;
  }
}
