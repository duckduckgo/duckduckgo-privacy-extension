const Asana = require('asana');

/**
 * @param {string} accessToken
 * @returns {import('asana').Client}
 */
function setupAsana(accessToken) {
    return Asana.Client.create({
        defaultHeaders: {
            'Asana-Enable': 'new_project_templates,new_user_task_lists,new_goal_memberships',
        },
    }).useAccessToken(accessToken);
}

/**
 * Fetches the PR associated with a commit via the GitHub API.
 * @param {string} githubToken
 * @param {string} repo - e.g. "owner/repo"
 * @param {string} sha
 * @returns {Promise<any>}
 */
async function getMergedPr(githubToken, repo, sha) {
    const resp = await fetch(
        `https://api.github.com/repos/${repo}/commits/${sha}/pulls`,
        { headers: { Authorization: `token ${githubToken}`, Accept: 'application/json' } },
    );
    const pulls = await resp.json();
    return pulls[0];
}

module.exports = { setupAsana, getMergedPr };
