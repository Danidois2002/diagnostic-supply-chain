/* Accès à PostgreSQL.
   - URL "postgres://…" : vrai serveur via le pilote pg (production, Neon)
   - URL "pglite://memory" ou "pglite://dossier" : PGlite, PostgreSQL compilé en WebAssembly (local, tests)
   Les deux exposent la même petite interface : query, exec, tx, close. */

export async function connect(url) {
  if (url.startsWith('pglite://')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = url.slice('pglite://'.length);
    const pg = dir === 'memory' ? new PGlite() : new PGlite(dir);
    await pg.waitReady;
    return {
      query: (text, params) => pg.query(text, params),
      exec: (sql) => pg.exec(sql),
      tx: (fn) => pg.transaction((t) => fn({ query: (text, params) => t.query(text, params) })),
      close: () => pg.close(),
    };
  }

  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    query: (text, params) => pool.query(text, params),
    exec: (sql) => pool.query(sql),
    // Transaction : tout passe ou rien ne passe
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (text, params) => client.query(text, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
