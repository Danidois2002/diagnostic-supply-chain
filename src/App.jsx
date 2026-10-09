import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { DiagnosticProvider } from './state/DiagnosticContext.jsx';
import { SheetProvider } from './state/SheetContext.jsx';
import Landing from './pages/Landing.jsx';
import Quiz from './pages/Quiz.jsx';
import Results, { SavedResult } from './pages/Results.jsx';

/* Adresses : #/, #/diagnostic, #/resultats (le sien), #/resultats/:id (lien partageable), #/exemple */
export default function App() {
  return (
    <HashRouter>
      <DiagnosticProvider>
        <SheetProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="diagnostic" element={<Quiz />} />
              <Route path="resultats" element={<Results />} />
              <Route path="resultats/:id" element={<SavedResult />} />
              <Route path="exemple" element={<Results sample />} />
              <Route path="*" element={<Landing />} />
            </Route>
          </Routes>
        </SheetProvider>
      </DiagnosticProvider>
    </HashRouter>
  );
}
