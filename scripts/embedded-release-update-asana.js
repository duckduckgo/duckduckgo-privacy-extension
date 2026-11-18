/* eslint-disable camelcase */
const { setupAsana } = require('./asana-utils');

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const APPLE_PR_URL = process.env.APPLE_PR_URL;
const APPLE_TASK_GID = process.env.APPLE_TASK_GID;
const VERSION = process.env.VERSION;
// "projectGid:sectionGid,..." pairs from the autoconsent release, which defers adding the Apple task to them until the PR is ready
const APPLE_PROJECTS = process.env.APPLE_PROJECTS || '';

const embeddedReleaseTemplateTaskGid = '1213491725945432';
const extensionProjectGid = '312629933896096';
const extensionReleaseSectionGid = '1201759129227683';

async function handleAutoconsentFlow(asana) {
    for (const projectAndSection of APPLE_PROJECTS.split(',').filter(Boolean)) {
        const [project, section] = projectAndSection.split(':');
        await asana.tasks.addProjectForTask({ data: { project, section } }, APPLE_TASK_GID);
    }
    if (!APPLE_PROJECTS) {
        console.warn('No Apple projects provided, the Apple task was not added to any project.');
    }
    await asana.stories.createStoryForTask(
        { data: { text: `Embedded extension ZIP has been added. PR is ready for review: ${APPLE_PR_URL}` } },
        APPLE_TASK_GID,
    );
    console.info('Apple Asana subtask updated.');
}

async function handleStandaloneFlow(asana) {
    const {
        data: { new_task },
    } = await asana.tasks.duplicateTask(
        { data: { include: ['notes', 'assignee', 'subtasks', 'projects'], name: `Apple Embedded Extension Release ${VERSION}` } },
        embeddedReleaseTemplateTaskGid,
        { opt_fields: 'new_task,new_task.gid' },
    );

    const {
        data: { html_notes },
    } = await asana.tasks.getTask(new_task.gid, { opt_fields: 'html_notes' });
    const updatedNotes = html_notes.replace('[[pr_url]]', `<a href="${APPLE_PR_URL}">Apple PR</a>`).replace('[[version]]', VERSION);

    await asana.tasks.updateTask({ data: { html_notes: updatedNotes } }, new_task.gid);

    await asana.tasks.addProjectForTask({ data: { project: extensionProjectGid, section: extensionReleaseSectionGid } }, new_task.gid);

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
