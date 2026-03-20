/* eslint-disable camelcase */
const fs = require('fs');
const path = require('path');
const { setupAsana } = require('./asana-utils');

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const version = process.env.VERSION;
const releaseUrl = process.env.RELEASE_URL;
const platforms = ['chrome', 'firefox'];
const artifacts = platforms.map((platform) => {
    const pathParts = [__dirname, '/../build/', platform, 'release'];
    if (platform === 'firefox') {
        pathParts.push('web-ext-artifacts');
    }
    const folder = path.join(...pathParts);
    const filename = fs.readdirSync(folder).find((fn) => fn.endsWith('.zip'));
    return path.join(folder, filename);
});

const extensionTemplateTaskGid = '1201192367380462';
const extensionProjectGid = '312629933896096';
const releaseSectionGid = '1138897367672278';
const extensionReleaseSectionGid = '1201759129227683';
const extensionVersionCustomFieldGid = '1204270899747122';

let asana;

function duplicateTemplateTask(templateTaskGid) {
    return asana.tasks.duplicateTask(
        { data: { include: ['notes', 'assignee', 'subtasks', 'projects'], name: `Extension Release ${version}` } },
        templateTaskGid,
        { opt_fields: 'new_task,new_task.gid' },
    );
}

const getTaskList = (tasks) =>
    tasks
        .map((t) => `<li><a data-asana-gid="${t.gid}" /> — ${t.assignee ? `<a data-asana-gid="${t.assignee.gid}" />` : '…'}</li>`)
        .join('');

// get list of assignees to add to the release task
const getAssigneeGids = (releaseTasks) =>
    releaseTasks.reduce(
        (assignees, task) => {
            if (task.assignee) assignees.add(task.assignee.gid);

            return assignees;
        },
        new Set(), // using a Set so they're unique
    );

const run = async () => {
    asana = setupAsana(ASANA_ACCESS_TOKEN);

    console.info('Getting list of release tasks');
    // get list of tasks in release section
    const { data: releaseTasks } = await asana.tasks.getTasksForSection(releaseSectionGid, {
        completed_since: 'now', // only fetch incomplete tasks
        opt_fields: 'gid,assignee,name',
    });
    if (!releaseTasks || releaseTasks.length === 0) {
        console.error('No tasks found to release!');
        return;
    }

    console.info('Asana on. Duplicating template task...');

    const {
        data: { new_task },
    } = await duplicateTemplateTask(extensionTemplateTaskGid);

    const {
        data: { html_notes: notes },
    } = await asana.tasks.getTask(new_task.gid, { opt_fields: 'html_notes' });

    // create html list with <a>task</a> - @assignee
    const releaseNotes = `<ul>${getTaskList(releaseTasks)}</ul>`;

    const updatedNotes = notes.replace('[[release_url]]', `<a href="${releaseUrl}">${releaseUrl}</a>`).replace('[[notes]]', releaseNotes);

    console.info('Updating task html');

    await asana.tasks.updateTask({ data: { html_notes: updatedNotes } }, new_task.gid);

    console.info('Moving task to Release section...');

    await asana.tasks.addProjectForTask({ data: { project: extensionProjectGid, section: extensionReleaseSectionGid } }, new_task.gid);

    console.info('Uploading files...');

    const uploadFile = async (pathString) => {
        const fileBuffer = fs.readFileSync(pathString);
        const fileName = path.basename(pathString);
        const form = new FormData();
        form.append('parent', new_task.gid);
        form.append('file', new File([fileBuffer], fileName, { type: 'application/zip' }));

        const resp = await fetch('https://app.asana.com/api/1.0/attachments', {
            method: 'POST',
            headers: { Authorization: `Bearer ${ASANA_ACCESS_TOKEN}` },
            body: form,
        });
        if (!resp.ok) {
            throw new Error(`Asana attachment upload failed: ${resp.status} ${await resp.text()}`);
        }
        return resp.json();
    };

    await Promise.all(artifacts.map(uploadFile));

    console.info('Adding followers...');

    const taskAssignees = getAssigneeGids(releaseTasks);

    await asana.tasks.addFollowersForTask({ data: { followers: [...taskAssignees] } }, new_task.gid);

    console.info('Assigning testing task to stakeholders...');

    const { data: subtasks } = await asana.tasks.getSubtasksForTask(new_task.gid, {});

    const testingSubtask = subtasks.find((task) => task.name.includes('Extension Testing'));

    for (const taskAssignee of taskAssignees) {
        const {
            data: { new_task: duplicateTestingTask },
        } = await asana.tasks.duplicateTask(
            { data: { name: 'Extension Testing', include: ['notes', 'parent', 'subtasks'] } },
            testingSubtask.gid,
            { opt_fields: 'new_task,new_task.gid' },
        );
        await asana.tasks.updateTask({ data: { assignee: taskAssignee } }, duplicateTestingTask.gid);
    }

    console.info('Setting release version field for PR tasks...');
    for (const task of releaseTasks) {
        await asana.tasks.updateTask({ data: { custom_fields: { [extensionVersionCustomFieldGid]: version } } }, task.gid);
    }

    console.info('All done. Enjoy! 🎉');
};

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
