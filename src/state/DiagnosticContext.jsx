import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QUESTIONS } from '../../shared/data.js';

/* État du diagnostic, sauvegardé dans le navigateur.
   Il n'est envoyé à l'API que si la personne choisit d'enregistrer son diagnostic (savedId = son identifiant). */
const STORE_KEY = 'diagnostic-supply-chain-v1';
const emptyState = () => ({ lead: null, answers: {}, theme: 0, done: false, savedId: null });

function load() {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(STORE_KEY)) }; } catch { return emptyState(); }
}

const DiagnosticContext = createContext(null);

export function DiagnosticProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* navigation privée */ }
  }, [state]);

  const update = useCallback((patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);
  const reset = useCallback(() => setState(emptyState()), []);

  const value = useMemo(() => {
    const answered = Object.keys(state.answers).length;
    return {
      state,
      update,
      reset,
      answered,
      isComplete: answered === QUESTIONS.length,
      firstUnanswered: QUESTIONS.findIndex((_, i) => !state.answers[i + 1]) + 1,
    };
  }, [state, update, reset]);

  return <DiagnosticContext.Provider value={value}>{children}</DiagnosticContext.Provider>;
}

export const useDiagnostic = () => useContext(DiagnosticContext);
