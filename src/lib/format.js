export const pct = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 });
export const dec = new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Variable CSS de la couleur d'un niveau : 'E' → var(--lvl-e) */
export const lvlVar = (key) => `var(--lvl-${key.toLowerCase()})`;
