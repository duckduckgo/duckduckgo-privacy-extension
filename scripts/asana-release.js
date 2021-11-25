/* eslint-disable no-undef */
/* eslint-disable camelcase */
const fs = require('fs')
const Asana = require('asana')

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN
const version = process.env.VERSION
const releaseUrl = process.env.RELEASE_URL
const chromeFilePath = fs.readdirSync('../build/chrome/release/').find(fn => fn.endsWith('.zip'))
const firefoxFilePath = fs.readdirSync('../build/firefox/release/web-ext-artifacts').find(fn => fn.endsWith('.zip'))

const templateTaskGid = '1201192367380462'
const projectGid = '312629933896096'
const releaseSectionGid = '1138897367672278'

let asana

const setupAsana = () => {
    asana = Asana.Client.create({
        defaultHeaders: {
            'Asana-Enable': 'new_user_task_lists'
        }
    }).useAccessToken(ASANA_ACCESS_TOKEN)
}

const duplicateTemplateTask = (templateTaskGid) => {
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

    console.info('Asana on. Duplicating template task...')

    const { new_task } = await duplicateTemplateTask(templateTaskGid)

    const { html_notes: notes } = await asana.tasks.getTask(new_task.gid, { opt_fields: 'html_notes' })

    // get list of tasks in release section
    const { data: releaseTasks } = await asana.tasks.getTasksForSection(
        releaseSectionGid,
        {
            completed_since: 'now', // only fetch incomplete tasks
            opt_fields: 'gid,assignee,name'
        }
    )

    // create html list with <a>task</a> - @assignee
    const releaseNotes = `<ul>${getTaskList(releaseTasks)}</ul>`

    const updatedNotes =
        notes.replace('[[release_url]]', `<a href="${releaseUrl}">${releaseUrl}</a>`)
            .replace('[[notes]]', releaseNotes)

    console.info('Updating task and moving to Release section...')

    await asana.tasks.updateTask(new_task.gid, { html_notes: updatedNotes })

    await asana.tasks.addProjectForTask(new_task.gid, {
        project: projectGid,
        insert_before: releaseTasks[0].gid
    })

    console.info('Uploading files...')

    const uploadFile = (err, data) => {
        if (err) throw err

        asana.attachments.createAttachmentForTask(new_task, { file: data })
    }

    fs.readFile(chromeFilePath, uploadFile)
    fs.readFile(firefoxFilePath, uploadFile)

    console.info('Adding followers...')

    await asana.tasks.addFollowersForTask(
        new_task.gid,
        { followers: [...getAssigneeGids(releaseTasks)] }
    )

    console.info('All done. Enjoy! 🎉')
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})
