/* eslint-disable camelcase */
const { setupAsana } = require('./asana-utils');

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const APPLE_PR_URL = process.env.APPLE_PR_URL;
const APPLE_TASK_GID = process.env.APPLE_TASK_GID;

async function run() {
    if (!APPLE_TASK_GID || !APPLE_PR_URL) {
        console.info('No Apple task GID or PR URL provided, skipping Asana update.');
        return;
    }

    const asana = setupAsana(ASANA_ACCESS_TOKEN);

    await asana.stories.createStoryForTask(APPLE_TASK_GID, {
        text: `Embedded extension ZIP has been added. PR is ready for review: ${APPLE_PR_URL}`,
    });

    console.info('Apple Asana subtask updated.');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
