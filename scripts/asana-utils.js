const Asana = require('asana');

/**
 * @param {string} accessToken
 */
function setupAsana(accessToken) {
    const client = new Asana.ApiClient();
    client.authentications.token.accessToken = accessToken;
    client.defaultHeaders['Asana-Enable'] = 'new_project_templates,new_user_task_lists,new_goal_memberships';

    return {
        tasks: new Asana.TasksApi(client),
        stories: new Asana.StoriesApi(client),
        attachments: new Asana.AttachmentsApi(client),
        apiClient: client,
    };
}

/**
 * Fetches the PR associated with a commit via the GitHub API.
 * @param {string} githubToken
 * @param {string} repo - e.g. "owner/repo"
 * @param {string} sha
 * @returns {Promise<any>}
 */
async function getMergedPr(githubToken, repo, sha) {
    const resp = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/pulls`, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/json' },
    });
    if (!resp.ok) {
        throw new Error(`GitHub API request failed: ${resp.status} ${resp.statusText}`);
    }
    const pulls = await resp.json();
    return pulls[0];
}

module.exports = { setupAsana, getMergedPr };
