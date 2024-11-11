const { webHook_url } = require("./settings.json");
const { greenBright, redBright, yellowBright,grey } = require("chalk");
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
                } else if (response.status === 429) {
                    const errorText = await response.json();
                    const retryAfter = errorText.retry_after;
                    spinner.warn(redBright(`[${index}] Rate limit hit | Retrying in ${retryAfter+10} seconds...`));
                    await new Promise(resolve => setTimeout(resolve, (retryAfter+10) * 1000));

                    const retryResponse = await fetch(webHook_url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({content: link})
                    });

                    if (retryResponse.ok) {
                        spinner.succeed(greenBright(`[${index}] Link Retried and Posted: ${yellowBright(link)}`));
                    } else {
                        const retryErrorText = await retryResponse.text();
                        spinner.fail(redBright(`[${index}] Link failed to post after retry | ${retryErrorText}`));
                    }
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
