const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;
const ejs = require('ejs');
const urls = require('./urls.json');
const fs = require('fs');
const path = require('path');
const minify = require('html-minifier').minify;

// Load language data according to the language specified in urls.json
const langData = require(`./public/i18n/${urls.lang}.json`);

// Add a middleware for serving static files
app.use(express.static('public'));

// Get the current date in ISO format (YYYY-MM-DD)
const currentUTCDate = new Date();
const currentISODate = new Date(currentUTCDate.getTime() - (currentUTCDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// Check if the 'results' folder exists, if not create it
if (!fs.existsSync(path.join(__dirname, 'results'))) {
    fs.mkdirSync(path.join(__dirname, 'results'));
}

// Function to obtain the translation of a rule
function translateRule(ruleId) {
    return langData.rules[ruleId] ? langData.rules[ruleId].description : 'Rule description not available.';
}

// Function for writing results to a file
function writeResultsToFile(results) {
    const date = new Date();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add a zero in front of the month if necessary
    const day = ('0' + date.getDate()).slice(-2); // Add a zero in front of the day if necessary
    const dateString = `${date.getFullYear()}-${month}-${day}`;
    const filePath = path.join(__dirname, 'results', `${dateString}.json`);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2)); // Adds 2 indent spaces
}

// Run axe-core tests
async function runAxeCoreTests(page, url, analysisDate) {
    try {
        console.log(`Run axe-core tests on the URL: ${url}`);
        await page.addScriptTag({ path: require.resolve('axe-core') });
        const results = await page.evaluate(() => {
            return axe.run(document, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a']
                }
            });
        });
        console.log(`Axe-core tests performed on the URL: ${url}`);
        const violations = results.violations.map(violation => {
            return { ...violation, analysisDate };
        });
        console.log(`Number of URL errors ${url}: ${violations.length}`);
        return violations;
    } catch (error) {
        console.error('Axe-core test execution error:', error);
        throw error;
    }
}

// Fetch HTML content
async function fetchHTMLContent(url) {
    try {
        console.log(`Fetch HTML content from URL: ${url}`);
        const browser = await puppeteer.launch({ 
            // Running without a sandbox is strongly discouraged. Consider configuring a sandbox instead
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox'
            ]
        }); 
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
        await page.goto(url, {
          waitUntil: 'networkidle0' // Navigation is finished when there are no more than 0 network connections for at least 500 ms
        });
        const htmlContent = await page.content();
        console.log(`HTML content fetched from URL: ${url}`);
        return { htmlContent, page, browser, analysisDate: currentISODate };
    } catch (error) {
        console.error(`Error when fetching HTML content from URL ${url}:`, error);
        throw error;
    }
}

// Endpoint to launch axe-core tests
app.get('/test', async (req, res) => {
    try {
        const axeResultsList = [];

        for (const site of urls.sites) {
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

        // Write results to file
        writeResultsToFile(axeResultsList); 

        res.send(`The analysis has been launched. Please check the results on http://localhost:${port}`);
    } catch (error) {
        console.error('Axe-core test error:', error);
        res.status(500).json({ error: 'An error occurred during the axe-core test.' });
    }
});

// Endpoint to display results on a web page
app.get('/', async (req, res) => {
    try {
        // Read the results
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

        // Group analyses by site
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
          // Sort analyses for each site by date in descending order
          groupedResults[result.siteName].sort((a, b) => new Date(b.analysisDate) - new Date(a.analysisDate));
        });

        // Group results by date
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
        
        // Render EJS model with results and language data
        const html = await ejs.renderFile('./views/results.ejs', { 
            results: groupedResults, 
            dateResults: dateResults, 
            allDates: allDates,
            langData: langData,
            translateRule: translateRule
        });
        // HTML minimization
        const minifiedHtml = minify(html, {
            removeAttributeQuotes: true,
            collapseWhitespace: true,
            removeComments: true
        });
        res.send(minifiedHtml);

    } catch (error) {
        console.error('Error while displaying results:', error);
        res.status(500).json({ error: 'An error occurred while displaying the results.' });
    }
});

app.listen(port, () => {
    console.log(`The server is started at http://localhost:${port}`);
});
