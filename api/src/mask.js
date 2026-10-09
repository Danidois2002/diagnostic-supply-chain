/* Masquage des données personnelles pour le compte de démonstration.
   Le masquage se fait ici, côté serveur : les vraies valeurs ne quittent jamais l'API. */
const DOT = '•';

/* « Acme Logistique » → « Ac•• Lo•••••• » : les deux premières lettres de chaque mot */
export const maskText = (text) => text && text.trim().split(/\s+/)
  .map((word) => [...word]) // par caractère, pas par unité UTF-16 (accents composés, emoji)
  .map((chars) => chars.slice(0, 2).join('') + DOT.repeat(Math.min(Math.max(chars.length - 2, 1), 6)))
  .join(' ');

/* « jeanne.dupont@exemple.be » → « j•••@e•••.be » */
export function maskEmail(email) {
  if (!email) return email;
  const [user, domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${[...user][0] ?? ''}${DOT.repeat(3)}@${[...domain][0] ?? ''}${DOT.repeat(3)}${tld}`;
}

/* « +32 470 12 34 56 » → « •• •• •• 56 » : seuls les deux derniers chiffres restent */
export const maskPhone = (phone) => phone && `${DOT}${DOT} ${DOT}${DOT} ${DOT}${DOT} ${phone.replace(/\D/g, '').slice(-2)}`;
