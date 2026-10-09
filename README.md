<div align="center">

# 📦 Diagnostic Supply Chain

**Un quiz interactif pour évaluer la maturité de la Supply Chain d'une entreprise, en 27 questions et 5 minutes.**

Conçu lors de mon stage chez [Logistics in Wallonia](https://www.logisticsinwallonia.be/) (mai – juin 2025), puis entièrement repensé côté UI/UX.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Aucune dépendance](https://img.shields.io/badge/d%C3%A9pendances-0-brightgreen?style=flat-square)

<a href="https://danidois2002.github.io/LIW/"><img src="https://img.shields.io/badge/D%C3%A9mo-en%20ligne-f1b51c?style=for-the-badge&logo=githubpages&logoColor=black" alt="Voir la démo en ligne" /></a>

🔗 **[danidois2002.github.io/LIW](https://danidois2002.github.io/LIW/)** · [Voir un exemple de résultat](https://danidois2002.github.io/LIW/#/exemple)

<a href="https://danidois2002.github.io/LIW/"><img src="docs/preview.webp" alt="Page d'accueil du diagnostic : « Challengez la maturité de votre Supply Chain » et le schéma animé de la chaîne logistique" width="900" /></a>

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

Chaque affirmation appartient à un niveau (Fragmentée, Excellence interne, Intégration ou Collaborative). La réponse donnée attribue un niveau ; le niveau final est la moyenne de ces niveaux, arrondie. La logique est identique à la version PHP utilisée en production.

## 🛠️ Côté technique

- **HTML, CSS et JavaScript natifs**, sans framework ni bibliothèque.
- **Navigation par écrans** (`#/diagnostic`, `#/resultats`, `#/exemple`) dans une seule page.
- **Progression sauvegardée** dans le navigateur (`localStorage`) : on peut fermer l'onglet et reprendre plus tard.
- **Rapport PDF** généré par une feuille de style d'impression dédiée.
- **Accessibilité** : navigation au clavier, fenêtres `<dialog>` natives, réglage « réduire les animations » respecté, couleurs des niveaux validées pour le daltonisme.

> [!NOTE]
> Cette version publique est une **démonstration** : aucune donnée n'est envoyée. La version utilisée par Logistics in Wallonia est en PHP : elle enregistre chaque diagnostic dans un fichier Excel (PhpSpreadsheet), le dépose sur SharePoint et envoie le rapport PDF par e-mail (mPDF, PHPMailer).

## 🚀 Lancer en local

Aucune installation : ouvrez `index.html` dans un navigateur, ou servez le dossier avec un serveur local (WAMP, `npx serve`, Live Server…).

## 📁 Structure

```
├── index.html     # les 3 écrans : accueil, diagnostic, résultats
├── styles.css     # le design et le rapport imprimable
├── data.js        # le contenu : niveaux, thématiques, questions, lexique
├── script.js      # la logique : navigation, calcul, sauvegarde
├── docs/          # la capture utilisée dans ce README
└── assets/img/    # le logo et les illustrations des 4 niveaux
```

---

<div align="center">

Réalisé par **Danial Bitar** · [GitHub](https://github.com/Danidois2002) · [LinkedIn](https://www.linkedin.com/in/daniel-bitar-992ab3258)

</div>
