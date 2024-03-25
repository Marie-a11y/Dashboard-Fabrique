const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;
const ejs = require('ejs');
const urls = require('./urls.json');
const fs = require('fs');
const path = require('path');
const minify = require('html-minifier').minify;

app.use(express.static('public'));

// Obtenez la date actuelle au format ISO (YYYY-MM-DD)
const currentUTCDate = new Date();
const currentISODate = new Date(currentUTCDate.getTime() - (currentUTCDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// Vérifiez si le dossier 'results' existe, sinon créez-le
if (!fs.existsSync(path.join(__dirname, 'results'))) {
    fs.mkdirSync(path.join(__dirname, 'results'));
}

// Fonction pour écrire les résultats dans un fichier
function writeResultsToFile(results) {
    const date = new Date();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Ajoute un zéro devant le mois si nécessaire
    const day = ('0' + date.getDate()).slice(-2); // Ajoute un zéro devant le jour si nécessaire
    const dateString = `${date.getFullYear()}-${month}-${day}`;
    const filePath = path.join(__dirname, 'results', `${dateString}.json`);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2)); // Ajoute 2 espaces d'indentation
}

async function runAxeCoreTests(page, url, analysisDate) {
    try {
        console.log(`Exécution des tests axe-core sur l'URL : ${url}`);
        await page.addScriptTag({ path: require.resolve('axe-core') });
        const results = await page.evaluate(() => {
            return axe.run(document, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a']
                }
            });
        });
        console.log(`Tests axe-core exécutés sur l'URL : ${url}`);
        const violations = results.violations.map(violation => {
            return { ...violation, analysisDate };
        });
        console.log(`Nombre d'erreurs sur l'URL ${url} : ${violations.length}`);
        return violations;
    } catch (error) {
        console.error('Erreur lors de l\'exécution des tests axe-core :', error);
        throw error;
    }
}

async function fetchHTMLContent(url) {
    try {
        console.log(`Récupération du contenu HTML de l'URL : ${url}`);
        const browser = await puppeteer.launch({ 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox'
            ]
        }); 
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
        await page.goto(url, {
          waitUntil: 'domcontentloaded' // Attendre que le DOM soit chargé
        });
        const htmlContent = await page.content();
        console.log(`Contenu HTML récupéré de l'URL : ${url}`);
        return { htmlContent, page, browser, analysisDate: currentISODate };
    } catch (error) {
        console.error(`Erreur lors de la récupération du contenu HTML de l'URL ${url}:`, error);
        throw error;
    }
}

// Endpoint pour lancer les tests axe-core
app.get('/test', async (req, res) => {
    try {
        const axeResultsList = [];

        for (const site of urls) {
            const { siteName, siteUrls } = site;
            const siteObj = { siteName, analyses: [] }; // Un tableau pour stocker les analyses

            for (const url of siteUrls) {
                const { htmlContent, page, browser, analysisDate } = await fetchHTMLContent(url);
                const violations = await runAxeCoreTests(page, url, analysisDate);
                await browser.close();
                
                const totalViolations = violations ? violations.length : 0;
                const analysisObj = { analysisDate, totalViolations, urls: [{ url, results: violations, totalViolations }] };
                const existingSiteIndex = axeResultsList.findIndex(item => item.siteName === siteName);
                if (existingSiteIndex !== -1) {
                    axeResultsList[existingSiteIndex].analyses.push(analysisObj);
                } else {
                    siteObj.analyses.push(analysisObj);
                }
            }
            if (siteObj.analyses.length > 0) {
                axeResultsList.push(siteObj);
            }
        }

        // Écrire les résultats dans un fichier
        writeResultsToFile(axeResultsList); 

        res.send("L'analyse a été lancée. Veuillez vérifier les résultats sur http://localhost:3000/");
    } catch (error) {
        console.error('Erreur lors du test axe-core :', error);
        res.status(500).json({ error: 'Une erreur s\'est produite lors du test axe-core.' });
    }
});

// Endpoint pour afficher les résultats sur une page web
app.get('/', async (req, res) => {
    try {
        // Lire les résultats
        const resultsDir = path.join(__dirname, 'results');
        let allResults = [];
        let allDates = [];
        fs.readdirSync(resultsDir).forEach(file => {
            const filePath = path.join(resultsDir, file);
            const fileContents = fs.readFileSync(filePath, 'utf8');
            const fileResults = JSON.parse(fileContents);
            allResults = allResults.concat(fileResults);
            fileResults.forEach(result => {
                result.analyses.forEach(analysis => {
                    const { analysisDate } = analysis;
                    if (!allDates.includes(analysisDate)) {
                        allDates.push(analysisDate);
                    }
                });
            });
        });

        // Regrouper les analyses par site
        const groupedResults = {};
        allResults.forEach(result => {
          if (!groupedResults[result.siteName]) {
            groupedResults[result.siteName] = [];
          }
          result.analyses.forEach(analysis => {
            const existingAnalysis = groupedResults[result.siteName].find(a => a.analysisDate === analysis.analysisDate);
            if (existingAnalysis) {
              existingAnalysis.urls = existingAnalysis.urls.concat(analysis.urls);
            } else {
              groupedResults[result.siteName].push(analysis);
            }
          });
        });

        // Regrouper les résultats par date
        const dateResults = {};
        allResults.forEach(site => {
            site.analyses.forEach(analysis => {
                const { analysisDate } = analysis;
                if (!dateResults[analysisDate]) {
                    dateResults[analysisDate] = {};
                }
                let totalViolations = 0;
                analysis.urls.forEach(url => {
                    totalViolations += url.totalViolations;
                });
                if (!dateResults[analysisDate][site.siteName]) {
                    dateResults[analysisDate][site.siteName] = totalViolations;
                } else {
                    dateResults[analysisDate][site.siteName] = Math.max(dateResults[analysisDate][site.siteName], totalViolations);
                }
            });
        });

        // Rendre le modèle EJS avec les résultats
        const html = await ejs.renderFile('./views/results.ejs', { results: groupedResults, dateResults: dateResults, allDates: allDates });
        // Minfification HTML
        const minifiedHtml = minify(html, {
            removeAttributeQuotes: true,
            collapseWhitespace: true,
            removeComments: true
        });
        res.send(minifiedHtml);

    } catch (error) {
        console.error('Erreur lors de l\'affichage des résultats :', error);
        res.status(500).json({ error: 'Une erreur s\'est produite lors de l\'affichage des résultats.' });
    }
});

app.listen(port, () => {
    console.log(`Le serveur est lancé sur http://localhost:${port}`);
});
