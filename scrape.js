const { token, fetchChanel_id } = require("./settings.json");
const { greenBright, redBright, yellowBright } = require("chalk");
const ora = require("ora");
const fs = require("fs");
const fetch = require("node-fetch");

Main();

async function request(before) {
    const options = {
        method: "GET",
        headers: { authorization: token }
    };
    const url = `https://discord.com/api/channels/${fetchChanel_id}/messages?limit=100${before ? `&before=${before}` : ""}`;
    const spinner = ora(`Fetching messages ${before ? `(before ${before})` : ""}`).start();

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            spinner.fail(redBright(`Failed to fetch messages: ${response.statusText}`));
            return [];
        }
        const data = await response.json();
        spinner.succeed(greenBright(`Fetched ${data.length} messages`));
        return data;
    } catch (error) {
        spinner.fail(redBright(`Error: ${error.message}`));
        return [];
    }
}

async function go() {
    let result = [];
    let page = await request();

    if (!page.length) {
        console.error(redBright("No messages found in the specified channel or fetch failed."));
        process.exit(1);
    }
    result = page;
    while (page.length === 100) {
        page = await request(page[page.length - 1].id);
        result = result.concat(page);
    }

    const spinner = ora("Processing messages to extract image and video links...").start();

    const imageLinks = result
        .flatMap(msg => {
            const links = [];
            if (msg.attachments) {
                links.push(...msg.attachments.map(att => processImgurLink(att.url || att.proxy_url)));
            }

            if (msg.embeds) {
                links.push(...msg.embeds.map(embed => processImgurLink(embed.thumbnail?.url || embed.url)));
            }

            return links;
        })
        .filter(Boolean); 

    if (imageLinks.length === 0) {
        spinner.fail(redBright("No image or video links found in fetched messages."));
        process.exit(1);
    }

    try {
        fs.writeFileSync("links.json", JSON.stringify(imageLinks, null, 2));
        spinner.succeed(greenBright(`Extracted ${imageLinks.length} image and video links. Check "links.json"`));
    } catch (error) {
        spinner.fail(redBright(`Failed to write links.json: ${error.message}`));
        process.exit(1);
    }
}

function processImgurLink(url) {
    if (!url) return null;

    if (url.includes("imgur.com")) {
        url = url.replace(/(h)(?=\.(jpg|mp4)$)/, "");
        return url;
    }
    try {
        const parsedUrl = new URL(url);
        parsedUrl.search = ''; 
        return parsedUrl.toString(); 
    } catch (error) {
        console.error(redBright(`Invalid URL: ${url}`));
        return null;  
    }
}

function Main() {
    console.log(yellowBright("Starting the image and video scraper..."));
    go().catch(error => {
        console.error(redBright(`Error: ${error.message}`));
    });
}
