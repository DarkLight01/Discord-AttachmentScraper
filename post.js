const { webHook_url } = require("./settings.json");
const { greenBright, redBright, grey, yellowBright } = require("chalk");
const ora = require("ora");
const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
const fetch = require("node-fetch");  

readline.question(grey("[?] Do you wish to post these links? (Y/N) "), async (answr) => {
    if (answr.toLowerCase() === "y" || answr.toLowerCase() === "yes") {
        await Post();
    } else {
        process.exit(1);
    }
});


async function Post() {
    const spinner = ora("Preparing to post").start();

    try {
        const fetchLinks = require("./links.json");
        if (!fetchLinks.length) {
            spinner.fail(redBright("links.json is empty or no links found to post."));
            process.exit(1);
        }

        for (const [index, link] of fetchLinks.entries()) {
            try {
                const response = await fetch(webHook_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: link })
                });

                if (response.ok) {
                    spinner.succeed(greenBright(`[${index}] Link Posted: ${yellowBright(link)}`));
                } else {
                    const errorText = await response.text();
                    spinner.fail(redBright(`[${index}] Link failed to post | ${errorText}`));
                }
            } catch (err) {
                spinner.fail(redBright(`[${index}] Link failed to post | ${err.message}`));
            }
        }
    } catch (error) {
        spinner.fail(redBright(`Error reading links.json: ${error.message}`));
    } finally {
        readline.close();
    }
}
