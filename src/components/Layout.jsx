import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { QUESTIONS } from '../../shared/data.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { SectionLink } from './ui.jsx';

const viewFor = (pathname) => {
  if (pathname.startsWith('/diagnostic')) return 'quiz';
  if (pathname.startsWith('/resultats') || pathname.startsWith('/exemple')) return 'results';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'landing';
};

/* Lien d'évitement : donne le focus au contenu sans changer d'écran */
const skipToContent = (e) => {
  e.preventDefault();
  document.getElementById('contenu').focus();
};

export default function Layout() {
  const view = viewFor(useLocation().pathname);

  // Le CSS adapte la barre du haut et le pied de page selon l'écran (body[data-view])
  useLayoutEffect(() => {
    const changed = document.body.dataset.view !== view;
    document.body.dataset.view = view;
    if (changed) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);

  return (
    <>
      <a className="skip-link" href="#contenu" onClick={skipToContent}>Aller au contenu</a>
      <Topbar />
      <main id="contenu" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function Topbar() {
  const { state, answered } = useDiagnostic();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { setScrolled(window.scrollY > 8); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`} id="topbar">
      <Link className="brand" to="/" aria-label="Diagnostic Supply Chain, accueil">
        <img src="img/logo-logistics.webp" alt="Logistics" width="154" height="32" />
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        <SectionLink id="fonctionnement">Comment ça marche</SectionLink>
        <SectionLink id="niveaux">Les 4 niveaux</SectionLink>
        <SectionLink id="lexique">Lexique</SectionLink>
      </nav>
      <div className="topbar-app">
        <span className="topbar-progress" id="topbar-progress" aria-live="polite">{state.lead ? `${answered} / ${QUESTIONS.length} réponses` : ''}</span>
        <Link className="btn btn-ghost btn-sm" to="/">Quitter</Link>
      </div>
      <Link className="btn btn-ink btn-sm topbar-cta" to="/diagnostic">Démarrer le diagnostic</Link>
      <div className="global-progress" aria-hidden="true"><span id="global-progress-bar" style={{ transform: `scaleX(${answered / QUESTIONS.length})` }} /></div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <img src="img/logo-logistics.webp" alt="Logistics" width="125" height="26" loading="lazy" />
        <p>Diagnostic de maturité Supply Chain.<br />Version de démonstration réalisée par Danial Bitar · <Link to="/admin">Espace admin</Link></p>
      </div>
    </footer>
  );
}

