const puppeteer= require('puppeteer');
const fs = require('fs');
const fetch = require( 'node-fetch');
const yargs = require('yargs');

const imgSelector = '.tagImageSkyrock';
const pageCountSelector = 'ul.pagination>li:last-of-type>a';
const downloadPath = 'images'

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
}

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
        await downloadFile(link, downloadPath + '/' + filename);
    });
}

async function downloadFile(url, outputPath) {
    const response = await fetch(url);
    response.body.pipe(fs.createWriteStream(outputPath));
}

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
            .map(anchor => anchor.href.trim()),
        liLast
    );
    let value = parseInt(list[0].split('/').last().replace('.html', ''));
    for (let i = 1; i <= value; i++) {
        console.info(`Loading page ${i}/${value}`)
        await loadPage(targetSkyblog, i, browser);
    }

    await browser.close();
}

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
    .argv

if (argv._.includes('sky-download')) {
    const skyblogId = argv.skyblogId;
    loadAllPages(skyblogId);
}