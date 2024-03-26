# dashboard-a11y

Démonstration : [https://dashboard-a11y.alwaysdata.net/](https://dashboard-a11y.alwaysdata.net/).
![][demo.webp]

## Objectifs
- Monitorer, par site, les tests automatisés d'accessibilité ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)) sur un échantillon de page en s'appuyant sur le moteur [axe-core](https://github.com/dequelabs/axe-core)
- Suivre une tendance par site
- Analyser les erreurs, par site et par URL
- Mettre en place des actions correctives

## Limitations
- Cet outil n'a pas vocation à indiquer un taux de conformité
- Cet outil ne permets pas de tester les pages qui sont derrière une authentification ou un accès restreint
- Une page peut avoir 0 erreur et tout de même contenir des problèmes d'accessibilité ([Building the most inaccessible site possible with a perfect Lighthouse score](https://www.matuzo.at/blog/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/))
- Cette analyse devra être complétée par une expertise humaine

## Comment cela fonctionne ?
1. Remplir le fichier `urls.json` avec les informations suivantes : 
    - le nom du site : `siteName`
    - les URLs : `siteUrls`
2. Installer les modules nodes : `npm i`
3. Pour lancer l'affichage du dashboard : `npm run build`. Le dashboard sera visible sur `http://localhost:3000/` 
4. Pour lancer l'analyse, aller sur la page `http://localhost:3000/test` (s'assurer que le serveur soit bien lancé avant, voir l'étape 3)

## Licence
To be defined.