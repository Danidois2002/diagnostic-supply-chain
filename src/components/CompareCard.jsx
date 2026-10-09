import { useEffect, useState } from 'react';
import { LEVEL_ORDER, LEVELS } from '../../shared/data.js';
import { getStats } from '../lib/api.js';
import { lvlVar } from '../lib/format.js';

const MIN_SAMPLE = 5; // en dessous, une comparaison n'a pas de sens

/* Statistiques anonymes de l'API (null tant qu'elles chargent, false si l'API est injoignable) */
export function useStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    getStats().then((s) => alive && setStats(s)).catch(() => alive && setStats(false));
    return () => { alive = false; };
  }, []);
  return stats;
}

/* Position du résultat parmi les autres diagnostics. Un diagnostic enregistré est déjà
   dans les statistiques : on l'en retire pour ne comparer qu'aux autres entreprises. */
function compare(stats, result, excludeSelf) {
  const scores = [...stats.scores];
  const levels = { ...stats.levels };
  let { total } = stats;
  if (excludeSelf && scores[result.score] > 0 && levels[result.level] > 0) {
    scores[result.score] -= 1;
    levels[result.level] -= 1;
    total -= 1;
  }
  const below = scores.slice(0, result.score).reduce((a, b) => a + b, 0);
  return { total, levels, percent: total ? Math.round((below / total) * 100) : 0 };
}

export default function CompareCard({ stats, result, excludeSelf }) {
  if (stats === false) return null; // API injoignable : pas de comparaison, le reste du résultat suffit
  if (!stats) {
    return (
      <article className="card card-wide compare-card no-print">
        <h2 className="card-title">Vous et les autres entreprises</h2>
        <p className="card-sub">Chargement de la comparaison…</p>
      </article>
    );
  }

  const { total, levels, percent } = compare(stats, result, excludeSelf);
  return (
    <article className="card card-wide compare-card">
      <h2 className="card-title">Vous et les autres entreprises</h2>
      <p className="card-sub">
        Comparaison avec {total} diagnostic{total > 1 ? 's' : ''}
        {stats.simulated > 0 && `, dont ${stats.simulated} simulés pour la démonstration`}.
      </p>
      {total < MIN_SAMPLE ? (
        <p className="compare-empty">Pas encore assez de diagnostics pour une comparaison fiable.</p>
      ) : (
        <div className="compare-grid">
          <div className="compare-stat">
            <strong>{percent}&nbsp;%</strong>
            <p>des entreprises ont un score de maturité inférieur au vôtre ({result.score}/100).</p>
          </div>
          <table className="dist" id="levels-share">
            <thead><tr><th scope="col">Niveau atteint</th><th scope="col">Part des entreprises</th></tr></thead>
            <tbody>
              {LEVEL_ORDER.map((key) => {
                const share = Math.round((levels[key] / total) * 100);
                return (
                  <tr key={key} style={{ '--lvl': lvlVar(key) }}>
                    <th scope="row"><span className="swatch" />{LEVELS[key].short}{key === result.level && <span className="you-tag">vous</span>}</th>
                    <td><div className="bar-cell"><div className="bar" title={`${LEVELS[key].title} : ${levels[key]} entreprise${levels[key] > 1 ? 's' : ''}`}><span style={{ '--w': `${share}%` }} /></div><span className="bar-val">{share} %</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
