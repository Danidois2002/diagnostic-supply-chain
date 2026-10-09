import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, LEXIQUE } from '../data.js';
import { RiskList } from '../components/ui.jsx';

/* Fenêtre « sheet » : définition d'un terme, détail d'un niveau, information */
const SheetContext = createContext(null);

export function SheetProvider({ children }) {
  const [content, setContent] = useState(null); // { kicker, title, body }
  const dialog = useRef(null);

  useEffect(() => {
    if (content && !dialog.current.open) dialog.current.showModal();
  }, [content]);

  const openSheet = useCallback((next) => setContent(next), []);
  const value = useMemo(() => ({
    openSheet,
    openLevel: (key) => {
      const level = LEVELS[key];
      openSheet({
        kicker: `Niveau ${level.rank} sur 4`,
        title: level.title,
        body: (
          <>
            <p className="sheet-lead">{level.description}</p>
            <p>{level.details}</p>
            {level.risks.length > 0 && <><h3>Risques identifiés</h3><RiskList risks={level.risks} /></>}
          </>
        ),
      });
    },
    openTerm: (key) => openSheet({ kicker: 'Lexique Supply Chain', title: key, body: <p>{LEXIQUE[key]}</p> }),
  }), [openSheet]);

  const onClick = (e) => {
    if (e.target === dialog.current || e.target.closest('[data-close]')) dialog.current.close();
  };

  return (
    <SheetContext.Provider value={value}>
      {children}
      <dialog className="sheet" id="sheet" aria-labelledby="sheet-title" ref={dialog} onClick={onClick}>
        <button className="sheet-close" type="button" aria-label="Fermer" data-close>×</button>
        <p className="eyebrow" id="sheet-kicker">{content?.kicker}</p>
        <h2 id="sheet-title">{content?.title}</h2>
        <div id="sheet-body">{content?.body}</div>
      </dialog>
    </SheetContext.Provider>
  );
}

export const useSheet = () => useContext(SheetContext);
