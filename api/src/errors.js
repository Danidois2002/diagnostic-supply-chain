/* Erreur avec un code HTTP : le gestionnaire d'erreurs la renvoie telle quelle au client */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/* Valide une entrée avec un schéma zod, ou répond 400 avec la liste des champs en erreur */
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new HttpError(400, 'Données invalides.', details);
  }
  return result.data;
}
