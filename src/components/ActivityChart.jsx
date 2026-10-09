import { useEffect, useRef, useState } from 'react';

/* Diagnostics par jour (30 jours) : colonnes fines d'une seule couleur, info-bulle au survol
   et au clavier (flèches), valeur du pic écrite sur sa colonne, tableau des données à côté. */
const HEIGHT = 220;
const PAD = { top: 26, right: 8, bottom: 28, left: 34 };
const NICE = [4, 6, 8, 10, 12, 16, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 1000];

const dayLabel = (day, options) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-BE', options);
const plural = (n) => `${n} diagnostic${n > 1 ? 's' : ''}`;

/* Colonne aux coins arrondis côté valeur, carrée sur la ligne de base */
function columnPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/* Largeur réelle du conteneur : le texte du graphique garde sa taille sur mobile */
function useWidth(ref) {
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export default function ActivityChart({ days }) {
  const box = useRef(null);
  const width = useWidth(box);
  const [active, setActive] = useState(null);

  const max = Math.max(...days.map((d) => d.count));
  const top = NICE.find((n) => n >= max) ?? Math.ceil(max / 1000) * 1000;
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / days.length;
  const barW = Math.max(3, Math.min(14, band - 4));
  const y = (v) => PAD.top + plotH - (v / top) * plotH;
  const peak = max > 0 ? days.map((d) => d.count).lastIndexOf(max) : -1;

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive((i) => Math.max(0, Math.min(days.length - 1, (i ?? days.length - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const current = active == null ? null : days[active];
  return (
    <div className="chart">
      <div
        className="chart-box"
        ref={box}
        tabIndex={0}
        role="group"
        aria-label="Diagnostics par jour sur 30 jours. Flèches gauche et droite pour parcourir les jours."
        onKeyDown={onKeyDown}
        onFocus={() => setActive((i) => i ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true">
          {[0, top / 2, top].map((v) => (
            <g key={v} className="chart-grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const h = (d.count / top) * plotH;
            return (
              <g key={d.day}>
                {d.count > 0 && <path className={`chart-col${active != null && active !== i ? ' is-dim' : ''}`} d={columnPath(x, y(d.count), barW, h)} />}
                {i === peak && <text className="chart-peak" x={x + barW / 2} y={y(d.count) - 7} textAnchor="middle">{d.count}</text>}
                {(days.length - 1 - i) % 7 === 0 && <text className="chart-x" x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle">{dayLabel(d.day, { day: 'numeric', month: 'short' })}</text>}
                {/* Zone de survol : toute la hauteur de la bande, plus large que la colonne */}
                <rect className="chart-hit" x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} onPointerEnter={() => setActive(i)} />
              </g>
            );
          })}
        </svg>
        {current && (
          <div className="chart-tip" style={{ left: PAD.left + (active + 0.5) * band, top: y(current.count) }}>
            <strong>{plural(current.count)}</strong>
            <span>{dayLabel(current.day, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Voir les données en tableau</summary>
        <table className="dist">
          <thead><tr><th scope="col">Jour</th><th scope="col">Diagnostics</th></tr></thead>
          <tbody>
            {days.map((d) => <tr key={d.day}><th scope="row">{dayLabel(d.day, { weekday: 'short', day: 'numeric', month: 'long' })}</th><td className="num">{d.count}</td></tr>)}
          </tbody>
        </table>
      </details>
    </div>
  );
}
