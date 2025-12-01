# BUDGET_DONATEUR

Interface web pour gérer des budgets et leurs tranches (montant, devise SAR/XOF, pays, ville, export CSV/PDF).

## Démarrage rapide
1) Ouvrir `donateur.html` dans un navigateur via un serveur local (ex. Live Server VS Code).  
2) Le script principal est `donnateur.js` (chargé depuis le HTML).  
3) Les données sont conservées en localStorage (aucune base externe).

## Fonctions clés
- Création/sélection/modification/suppression de budgets.
- Gestion des tranches (pays, ville, projet, montants, conversions SAR↔XOF).
- Mise à jour manuelle ou via proxy CORS Anywhere du taux SAR→XOF (Wise).
- Export CSV/PDF et calcul du budget restant/disponible (part non utilisable déduite).

## Proxy CORS Anywhere (taux Wise)
- Lancer votre instance locale sur `http://localhost:8080/` puis cliquer « Rafraîchir les taux ».
- Sans proxy actif, la récupération auto peut échouer (CORS).

## Notes
- Le favicon n’est pas requis pour le fonctionnement.
- Pour réinitialiser un budget, utiliser le bouton prévu dans l’interface (affecte les tranches liées).
