const puppeteer= require('puppeteer');
const fs = require('fs');
const fetch = require( 'node-fetch');
const yargs = require('yargs');

// Util Array.last() implementation
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
}

const imgSelector = '.tagImageSkyrock';
let imgCount = 0;

/**
 * Download all images from a specific page of a skyblog
 * @param targetSkyblog, the id of the target skyblog
 * @param index, the page index (1 based)
 * @param browser, the currently used puppetteer browser
 * @returns {Promise<void>} void
 */
async function loadPage(targetSkyblog, index, browser) {
    const page = await browser.newPage();

    await page.goto(`https://${targetSkyblog}.skyrock.com/${index}.html`);

    // Wait for images
    const allImgs = imgSelector;
    await page.waitForSelector(allImgs);

    // Extract the images
    const links = await page.evaluate(
        allImgs => [...document.querySelectorAll(allImgs)].map(anchor => anchor.src.trim()),
        allImgs
    );

    // Download all images
    links.map(l => l.replace('_small', '')).map(async link => {
        let srcArray = link.split('/');
        let pos = srcArray.length - 1;
        let filename = srcArray[pos];
        imgCount++;
        await downloadFile(link, downloadPath + '/' + filename);
    });
}

const downloadPath = 'images';

/**
 * Downloads a single image from provided url to outputPath file
 * @param url, address of the image to download
 * @param outputPath, target file to write to
 * @returns {Promise<void>} void
 */
async function downloadFile(url, outputPath) {
    const response = await fetch(url);
    response.body.pipe(fs.createWriteStream(outputPath));
}

const pageCountSelector = '#form_pagination>option:first-child';

/**
 * Extract the number of pages for the targeted Skyblog
 * and triggers the download for each page sequentially
 * @param targetSkyblog, the id of the target skyblog
 * @returns {Promise<void>} void
 */
async function loadAllPages(targetSkyblog) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const skyblogUrl = `https://${targetSkyblog}.skyrock.com/`;
    console.info('Loading all images from: ' + skyblogUrl);
    await page.goto(skyblogUrl);

    // Wait for list items
    const liLast = pageCountSelector;
    await page.waitForSelector(liLast);

    // Extract the last paginator link element
    const list = await page.evaluate(
        liLast => [...document.querySelectorAll(liLast)]
            .map(option => option.innerHTML.trim()),
        liLast
    );

    // Only the first hit is interesting, it extract the index value of the last page
    let value = parseInt(list[0].split(' ').last());
    console.info(value + ' pages to load images from');

    // Iterates trough all pages (NB 1-based index)
    for (let i = 1; i <= value; i++) {
        console.info(`Loading page ${i}/${value}`)
        await loadPage(targetSkyblog, i, browser);
    }

    await browser.close();
}

// yargs command declaration
const argv = yargs.scriptName("sky-download")
    .usage('Usage : $0 <cmd> --skyblogId [args]')
    .command('sky-download', ' Downloads all pictures from a target skyblog', {
        skyblogId: {
            description: 'the target skyblog id, ie \'fun\' for https://fun.skyrock.com',
            alias: 'id',
            type: 'string'
        }
    })
    .example('node index.js sky-download --skyblogId fun')
    .demandOption(['skyblogId'])
    .help()
    .argv;

(async () => {
    if (argv._.includes('sky-download')) {
        const skyblogId = argv.skyblogId;
        const start = Date.now();
        await loadAllPages(skyblogId);
        const millis = Date.now() - start;
        console.info(`Dowloaded ${imgCount} images in ${millis/1000} s`)
    }
})();