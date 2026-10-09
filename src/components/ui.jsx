import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEXIQUE } from '../data.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { useSheet } from '../state/SheetContext.jsx';

/* Apparition au défilement : ajoute « in-view » quand l'élément entre à l'écran */
export function Reveal({ as: Tag = 'div', className = '', ...props }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setInView(true);
      observer.disconnect();
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref} className={`${className} reveal${inView ? ' in-view' : ''}`.trim()} {...props} />;
}

/* Lien vers une section de l'accueil (#niveaux…) sans passer par le routeur */
export function SectionLink({ id, ...props }) {
  const onClick = (e) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView();
  };
  return <a href={`#${id}`} onClick={onClick} {...props} />;
}

/* « Commencer le diagnostic » : après un diagnostic terminé, on repart de zéro */
export function StartLink(props) {
  const { state, reset } = useDiagnostic();
  return <Link to="/diagnostic" onClick={() => { if (state.done) reset(); }} {...props} />;
}

export function RiskList({ risks }) {
  return <ul className="risk-list">{risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>;
}

/* Termes du lexique soulignés et cliquables dans un texte */
const termKeys = Object.keys(LEXIQUE).sort((a, b) => b.length - a.length);
const termRegex = new RegExp(`(?<!\\p{L})(${termKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?!\\p{L})`, 'giu');
const termKeyFor = (match) => termKeys.find((k) => k.toLowerCase() === match.toLowerCase());

export function TermText({ text }) {
  const { openTerm } = useSheet();
  return text.split(termRegex).map((part, i) => (i % 2
    ? <button key={i} type="button" className="term" onClick={() => openTerm(termKeyFor(part))}>{part}</button>
    : part));
}
