/* eslint-disable camelcase */
const { setupAsana } = require('./asana-utils');

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const APPLE_PR_URL = process.env.APPLE_PR_URL;
const APPLE_TASK_GID = process.env.APPLE_TASK_GID;
const VERSION = process.env.VERSION;

const embeddedReleaseTemplateTaskGid = '1213491725945432';
const extensionProjectGid = '312629933896096';
const extensionReleaseSectionGid = '1201759129227683';

async function handleAutoconsentFlow(asana) {
    await asana.stories.createStoryForTask(APPLE_TASK_GID, {
        text: `Embedded extension ZIP has been added. PR is ready for review: ${APPLE_PR_URL}`,
    });
    console.info('Apple Asana subtask updated.');
}

async function handleStandaloneFlow(asana) {
    const { new_task } = await asana.tasks.duplicateTask(embeddedReleaseTemplateTaskGid, {
        include: ['notes', 'assignee', 'subtasks', 'projects'],
        name: `Apple Embedded Extension Release ${VERSION}`,
        opt_fields: 'html_notes',
    });

    const { html_notes } = await asana.tasks.getTask(new_task.gid, { opt_fields: 'html_notes' });
    const updatedNotes = html_notes
        .replace('[[pr_url]]', `<a href="${APPLE_PR_URL}">Apple PR</a>`)
        .replace('[[version]]', VERSION);

    await asana.tasks.updateTask(new_task.gid, { html_notes: updatedNotes });

    await asana.tasks.addProjectForTask(new_task.gid, {
        project: extensionProjectGid,
        section: extensionReleaseSectionGid,
    });

    console.info(`Standalone Asana task created: https://app.asana.com/0/0/${new_task.gid}`);
}

async function run() {
    if (!APPLE_PR_URL) {
        console.info('No Apple PR URL provided, skipping Asana update.');
        return;
    }

    const asana = setupAsana(ASANA_ACCESS_TOKEN);

    if (APPLE_TASK_GID) {
        await handleAutoconsentFlow(asana);
    } else {
        await handleStandaloneFlow(asana);
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
