// Felklasser – K1–K3, K5. Kastas av model/ och storage/; servern fångar dem och svarar med { fel, meddelande }.

export class ValideringsFel extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValideringsFel';
  }
}

export class DubblettFel extends Error {
  constructor(message) {
    super(message);
    this.name = 'DubblettFel';
  }
}

export class SaknasFel extends Error {
  constructor(message) {
    super(message);
    this.name = 'SaknasFel';
  }
}

export class RegelFel extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegelFel';
  }
}

export class StatusFel extends Error {
  constructor(message) {
    super(message);
    this.name = 'StatusFel';
  }
}

export class FilformatFel extends Error {
  constructor(message, rad) {
    super(message);
    this.name = 'FilformatFel';
    this.rad = rad;
  }
}
