-- Schéma de la base (idempotent : exécuté à chaque démarrage)

CREATE TABLE IF NOT EXISTS diagnostics (
  id            text PRIMARY KEY,                       -- identifiant public et aléatoire (lien partageable)
  created_at    timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'simulation')),

  -- Coordonnées : effacées après la durée de conservation (RETENTION_DAYS)
  company       text,
  job_title     text,
  email         text,
  phone         text,
  anonymized_at timestamptz,

  -- Réponses (0, 1 ou 2 pour chacune des 27 questions) et résultat calculé par le serveur
  answers       smallint[] NOT NULL CHECK (cardinality(answers) = 27),
  level         char(1) NOT NULL CHECK (level IN ('F', 'E', 'I', 'C')),
  score         smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  theme_scores  smallint[] NOT NULL CHECK (cardinality(theme_scores) = 7)
);

-- Recherche des coordonnées à effacer
CREATE INDEX IF NOT EXISTS diagnostics_to_anonymize_idx ON diagnostics (created_at) WHERE anonymized_at IS NULL AND source = 'web';
