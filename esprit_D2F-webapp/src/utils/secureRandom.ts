// Générateurs aléatoires cryptographiquement sûrs.
// Remplacent Math.random() pour lever les alertes de sécurité SonarQube (S2245).

/** Valeur réelle dans [0, 1). */
export function secureRandomUnit(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0xffffffff;
}

/** Entier dans [0, maxExclusive). */
export function secureRandomInt(maxExclusive: number): number {
  return Math.floor(secureRandomUnit() * maxExclusive);
}

/** Identifiant court non cryptographiquement sensible (ex. clé temporaire UI). */
export function secureRandomId(): string {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  return array[0].toString(36) + array[1].toString(36);
}
