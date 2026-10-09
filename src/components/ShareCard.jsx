import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDiagnostic } from '../lib/api.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';

const PRIVACY = 'Il compte aussi, anonymement, dans la comparaison entre entreprises. Vos coordonnées sont effacées après 30 jours.';

/* Diagnostic enregistré : son lien, à copier */
export function ShareLink({ id }) {
  const [copied, setCopied] = useState(null); // null, 'ok' ou 'manual'
  const url = `${window.location.origin}${window.location.pathname}#/resultats/${id}`;

  const copy = async (e) => {
    const input = e.currentTarget.parentElement.querySelector('input');
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      input.select(); // presse-papiers refusé : on sélectionne le lien pour un copier-coller manuel
      setCopied('manual');
    }
  };

  return (
    <article className="card card-wide share-card no-print">
      <div>
        <h2 className="card-title">Lien de votre résultat</h2>
        <p className="card-sub">Retrouvez ce diagnostic plus tard ou partagez-le avec vos collègues. Le lien affiche le nom de l'entreprise, jamais votre e-mail ni votre téléphone.</p>
      </div>
      <div className="share-link">
        <input type="text" readOnly value={url} aria-label="Lien de votre résultat" onFocus={(e) => e.target.select()} />
        <button className="btn btn-ink" type="button" onClick={copy}>{copied === 'ok' ? 'Lien copié ✓' : 'Copier le lien'}</button>
      </div>
      {copied === 'manual' && <p className="form-status" role="status">Le lien est sélectionné : copiez-le avec Ctrl + C.</p>}
    </article>
  );
}

/* Diagnostic pas encore enregistré : on propose de l'enregistrer (le clic vaut accord) */
export function SaveOffer({ initialError }) {
  const { state, update } = useDiagnostic();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // null, 'saving' ou 'slow'
  const [error, setError] = useState(initialError || '');

  const save = async () => {
    setStatus('saving');
    setError('');
    try {
      const saved = await saveDiagnostic(state.lead, state.answers, { onSlow: () => setStatus('slow') });
      update((s) => ({ savedId: saved.id, lead: { ...s.lead, consent: true } }));
      navigate(`/resultats/${saved.id}`, { replace: true });
    } catch (err) {
      setStatus(null);
      setError(err.message);
    }
  };

  return (
    <article className="card card-wide share-card no-print">
      <div>
        <h2 className="card-title">Obtenir un lien de partage</h2>
        <p className="card-sub">Enregistrez ce diagnostic pour le retrouver plus tard ou le partager. {PRIVACY}</p>
        {error && <p className="form-error" role="alert">Le diagnostic n'a pas pu être enregistré : {error}</p>}
        {status === 'slow' && <p className="form-status" role="status">Le serveur se réveille (hébergement gratuit) : cela peut prendre jusqu'à 30 secondes.</p>}
      </div>
      <div className="share-link">
        <button className="btn btn-yellow" type="button" disabled={Boolean(status)} onClick={save}>
          {status ? 'Enregistrement…' : error ? 'Réessayer' : 'Enregistrer mon diagnostic'}
        </button>
      </div>
    </article>
  );
}
