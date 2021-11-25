/* eslint-disable no-undef */
/* eslint-disable camelcase */
const fs = require('fs')
const Asana = require('asana')
const path = require('path')

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN
const version = process.env.VERSION
const releaseUrl = process.env.RELEASE_URL
const chromeReleaseFolder = path.join(__dirname, '/../build/chrome/release/')
const chromeFileName = fs.readdirSync(chromeReleaseFolder).find(fn => fn.endsWith('.zip'))
const chromeFilePath = path.join(chromeReleaseFolder, chromeFileName)
const firefoxReleaseFolder = path.join(__dirname, '/../build/firefox/release/web-ext-artifacts')
const firefoxFileName = fs.readdirSync(firefoxReleaseFolder).find(fn => fn.endsWith('.zip'))
const firefoxFilePath = path.join(firefoxReleaseFolder, firefoxFileName)

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

    const uploadFile = async (path) => {
        // attachments.createAttachmentForTask won't work, Asana suggests this
        // https://github.com/Asana/node-asana/issues/220
        const params = {
            method: 'POST',
            url: `https://app.asana.com/api/1.0/tasks/${new_task.gid}/attachments`,
            formData: {
                file: fs.createReadStream(path)
            },
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
        return asana.dispatcher.dispatch(params, {})
    }

    await uploadFile(chromeFilePath)
    await uploadFile(firefoxFilePath)

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
                include: ['parent', 'subtasks']
            }
        )
        await asana.tasks.updateTask(
            duplicateTestingTask.gid,
            { assignee: taskAssignee }
        )
    }

    console.info('All done. Enjoy! 🎉')
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})
