const puppeteer= require('puppeteer');
const fs = require('fs');
const fetch = require( 'node-fetch');

const targetSkyblog = 'dom-from2';
const imgSelector = '.tagImageSkyrock';
const pageCountSelector = 'ul.pagination>li.last>a';
const downloadPath = 'images'

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
}

async function loadPage(index, browser) {
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
    links.map(l => l.replace('_small', '')).forEach(async link => {
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

async function loadAllPages() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(`https://${targetSkyblog}.skyrock.com/`);

    // Wait for list items
    const liLast = pageCountSelector;
    await page.waitForSelector(liLast);

    // Extract the images
    const list = await page.evaluate(
        liLast => [...document.querySelectorAll(liLast)]
            .map(anchor => anchor.href.trim()),
        liLast
    );
    let value = parseInt(list[0].split('/').last().replace('.html', ''));
    for (let i = 1; i <= value; i++) {
        console.info(`Loading page ${i}/${value}`)
        await loadPage(i, browser);
    }

    await browser.close();
}

loadAllPages();