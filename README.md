<div align="center">

# 📦 Diagnostic Supply Chain

**Un quiz interactif pour évaluer la maturité de la Supply Chain d'une entreprise, en 27 questions et 5 minutes.**

Conçu lors de mon stage dans une entreprise de logistique (mai – juin 2025), puis entièrement repensé : UI/UX, puis passage à React.

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat-square&logo=css&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

<a href="https://danidois2002.github.io/diagnostic-supply-chain/"><img src="https://img.shields.io/badge/D%C3%A9mo-en%20ligne-f1b51c?style=for-the-badge&logo=githubpages&logoColor=black" alt="Voir la démo en ligne" /></a>

🔗 **[danidois2002.github.io/diagnostic-supply-chain](https://danidois2002.github.io/diagnostic-supply-chain/)** · [Voir un exemple de résultat](https://danidois2002.github.io/diagnostic-supply-chain/#/exemple)

<a href="https://danidois2002.github.io/diagnostic-supply-chain/"><img src="docs/preview.webp" alt="Page d'accueil du diagnostic : « Challengez la maturité de votre Supply Chain » et le schéma animé de la chaîne logistique" width="900" /></a>

</div>

---

## ✨ Le parcours

1. **Accueil** : présentation du diagnostic, des 4 niveaux de maturité, des 7 thématiques et d'un lexique Supply Chain.
2. **Informations** : nom de l'entreprise, fonction et coordonnées, avec validation des champs.
3. **27 affirmations en 7 thématiques** : réponse « Pas du tout », « En cours » ou « Mis en place ». Les termes techniques sont soulignés et leur définition s'ouvre d'un clic.
4. **Résultat** :
   - le niveau de maturité, avec une échelle à 4 niveaux et le score moyen ;
   - la répartition des réponses par niveau ;
   - le degré de mise en place par thématique ;
   - la définition du niveau obtenu et les risques identifiés ;
   - un rapport à télécharger en PDF.

Un lien **« Voir un exemple de résultat »** affiche directement une page de résultats avec des réponses fictives.

## 🧮 Calcul du niveau

Chaque affirmation appartient à un niveau (Fragmentée, Excellence interne, Intégration ou Collaborative). La réponse donnée attribue un niveau ; le niveau final est la moyenne de ces niveaux, arrondie. La logique est pour l'instant identique à la version d'origine (voir la feuille de route).

## 🛠️ Côté technique

- **React 19 + Vite**, en JavaScript, avec **React Router** pour la navigation (`#/diagnostic`, `#/resultats`, `#/exemple`).
- **État partagé** par contexte React : le diagnostic en cours et la fenêtre de détail (termes du lexique, niveaux).
- **Progression sauvegardée** dans le navigateur (`localStorage`) : on peut fermer l'onglet et reprendre plus tard.
- **Rapport PDF** généré par une feuille de style d'impression dédiée.
- **Accessibilité** : navigation au clavier, fenêtres `<dialog>` natives, réglage « réduire les animations » respecté, couleurs des niveaux validées pour le daltonisme.
- **Déploiement continu** : chaque push sur `main` construit le site et le publie sur GitHub Pages (GitHub Actions).

> [!NOTE]
> Cette version publique est une **démonstration** : aucune donnée n'est envoyée. La version d'origine, réalisée pendant le stage, est en PHP : elle enregistre chaque diagnostic dans un fichier Excel (PhpSpreadsheet), le dépose sur SharePoint et envoie le rapport PDF par e-mail (mPDF, PHPMailer).

## 🗺️ Feuille de route

- [x] **Passage à React + Vite**, avec un rendu identique à la version précédente
- [ ] **Nouveau calcul du niveau**, en escalier comme les modèles de maturité, pour que le niveau 4 soit atteignable
- [ ] **API Node.js + PostgreSQL** : enregistrement des diagnostics, lien de résultat partageable, comparaison avec les autres entreprises
- [ ] **Espace admin** : tableau de bord, statistiques et export

## 🚀 Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrez [localhost:5173/diagnostic-supply-chain/](http://localhost:5173/diagnostic-supply-chain/). `npm run build` produit la version de production dans `dist/`.

## 📁 Structure

```
├── index.html                # page HTML de base (Vite)
├── src/
│   ├── main.jsx              # point d'entrée React
│   ├── App.jsx               # les routes
│   ├── data.js               # le contenu : niveaux, thématiques, questions, lexique
│   ├── styles.css            # le design et le rapport imprimable
│   ├── lib/                  # calcul du résultat, formats
│   ├── state/                # contextes : diagnostic en cours, fenêtre de détail
│   ├── components/           # mise en page (barre du haut, pied de page) et petits composants
│   └── pages/                # Accueil, Diagnostic, Résultats
├── public/img/               # le logo et les illustrations des 4 niveaux
├── docs/                     # la capture utilisée dans ce README
└── .github/workflows/        # construction et publication sur GitHub Pages
```

---

<div align="center">

Réalisé par **Danial Bitar** · [GitHub](https://github.com/Danidois2002) · [LinkedIn](https://www.linkedin.com/in/daniel-bitar-992ab3258)

</div>
