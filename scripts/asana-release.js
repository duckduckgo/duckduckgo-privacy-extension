/* eslint-disable no-undef */
/* eslint-disable camelcase */
const fs = require('fs')
const Asana = require('asana')
const path = require('path')

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN
const version = process.env.VERSION
const releaseUrl = process.env.RELEASE_URL
const platforms = ['chrome', 'chrome-mv3', 'firefox']
const artifacts = platforms.map((platform) => {
    const pathParts = [__dirname, '/../build/', platform, 'release']
    if (platform === 'firefox') {
        pathParts.push('web-ext-artifacts')
    }
    const folder = path.join(...pathParts)
    const filename = fs.readdirSync(folder).find(fn => fn.endsWith('.zip'))
    return path.join(folder, filename)
})

const extensionTemplateTaskGid = '1201192367380462'
const extensionProjectGid = '312629933896096'
const releaseSectionGid = '1138897367672278'
const extensionReleaseSectionGid = '1201759129227683'
const extensionVersionCustomFieldGid = '1204270899747122'

let asana

function setupAsana () {
    asana = Asana.Client.create({
        defaultHeaders: {
            'Asana-Enable': 'new_user_task_lists,new_project_templates,new_goal_memberships'
        }
    }).useAccessToken(ASANA_ACCESS_TOKEN)
}

function duplicateTemplateTask (templateTaskGid) {
    const duplicateOption = {
        include: ['notes', 'assignee', 'subtasks', 'projects'],
        name: `Extension Release ${version}`,
        opt_fields: 'html_notes'
    }

    return asana.tasks.duplicateTask(templateTaskGid, duplicateOption)
}

const getTaskList = (tasks) => tasks.map((t) =>
    `<li><a data-asana-gid="${t.gid}" /> — ${
        t.assignee ? `<a data-asana-gid="${t.assignee.gid}" />` : '…'
    }</li>`).join('')

// get list of assignees to add to the release task
const getAssigneeGids = (releaseTasks) =>
    releaseTasks.reduce(
        (assignees, task) => {
            if (task.assignee) assignees.add(task.assignee.gid)

            return assignees
        },
        new Set() // using a Set so they're unique
    )

const run = async () => {
    setupAsana()

    console.info('Getting list of release tasks')
    // get list of tasks in release section
    const { data: releaseTasks } = await asana.tasks.getTasksForSection(
        releaseSectionGid,
        {
            completed_since: 'now', // only fetch incomplete tasks
            opt_fields: 'gid,assignee,name'
        }
    )
    if (!releaseTasks || releaseTasks.length === 0) {
        console.error('No tasks found to release!')
        return
    }

    console.info('Asana on. Duplicating template task...')

    const { new_task } = await duplicateTemplateTask(extensionTemplateTaskGid)

    const { html_notes: notes } = await asana.tasks.getTask(new_task.gid, { opt_fields: 'html_notes' })

    // create html list with <a>task</a> - @assignee
    const releaseNotes = `<ul>${getTaskList(releaseTasks)}</ul>`

    const updatedNotes =
        notes.replace('[[release_url]]', `<a href="${releaseUrl}">${releaseUrl}</a>`)
            .replace('[[notes]]', releaseNotes)

    console.info('Updating task html')

    await asana.tasks.updateTask(new_task.gid, { html_notes: updatedNotes })

    console.info('Moving task to Release section...')

    await asana.tasks.addProjectForTask(new_task.gid, {
        project: extensionProjectGid,
        section: extensionReleaseSectionGid
    })

    console.info('Uploading files...')

    const uploadFile = async (pathString) => {
        // attachments.createAttachmentForTask won't work, Asana suggests this
        // https://github.com/Asana/node-asana/issues/220
        const params = {
            method: 'POST',
            url: `https://app.asana.com/api/1.0/tasks/${new_task.gid}/attachments`,
            formData: {
                file: fs.createReadStream(pathString)
            },
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
        return asana.dispatcher.dispatch(params, {})
    }

    await Promise.all(artifacts.map(uploadFile))

    console.info('Adding followers...')

    const taskAssignees = getAssigneeGids(releaseTasks)

    await asana.tasks.addFollowersForTask(
        new_task.gid,
        { followers: [...taskAssignees] }
    )

    console.info('Assigning testing task to stakeholders...')

    const { data: subtasks } = await asana.tasks.getSubtasksForTask(new_task.gid, {})

    const testingSubtask = subtasks.find((task) => task.name.includes('Extension Testing'))

    for (const taskAssignee of taskAssignees) {
        const { new_task: duplicateTestingTask } = await asana.tasks.duplicateTask(
            testingSubtask.gid,
            {
                name: 'Extension Testing',
                include: ['notes', 'parent', 'subtasks']
            }
        )
        await asana.tasks.updateTask(
            duplicateTestingTask.gid,
            { assignee: taskAssignee }
        )
    }

    console.info('Setting release version field for PR tasks...')
    for (const task of releaseTasks) {
        await asana.tasks.updateTask(task.gid, {
            custom_fields: {
                [extensionVersionCustomFieldGid]: version
            }
        })
    }

    console.info('All done. Enjoy! 🎉')
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})
