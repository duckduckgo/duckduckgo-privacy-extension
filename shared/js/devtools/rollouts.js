import { getAssignedCohortSettingsKey, getRolloutSettingsKey } from '../background/components/remote-config';

async function updateSettingAndReloadConfig(settingKey, settingValue) {
    await chrome.runtime.sendMessage({
        messageType: 'updateSetting',
        options: { name: settingKey, value: settingValue },
    });
    await chrome.runtime.sendMessage({ messageType: 'forceReprocessConfig' });
}

const table = document.querySelector('table');
/** @type {HTMLTemplateElement | null} */
const rowTemplate = document.querySelector('template#rollout-row');

async function render() {
    if (!table || !rowTemplate) {
        throw new Error('Missing HTML elements');
    }

    for (const row of table.querySelectorAll('.subfeature')) {
        table.removeChild(row);
    }
    /** @type {import("../background/components/remote-config").SubFeatureStatus[]} */
    const rolloutStatus = await chrome.runtime.sendMessage({ messageType: 'getSubfeatureStatuses' });
    rolloutStatus.forEach((f) => {
        const row = rowTemplate.content.cloneNode(true);
        const cells = row.querySelectorAll('td');
        cells[0].innerText = `${f.feature} / ${f.subFeature}`;
        cells[1].classList.add(f.state);
        cells[1].innerText = f.state;
        cells[2].innerText = f.hasTargets ? 'Yes' : 'No';
        cells[3].innerText = f.rolloutPercent ? f.rolloutPercent : '-';
        cells[4].innerText = f.rolloutRoll ? Math.floor(f.rolloutRoll) : '-';
        cells[5].innerText = f.hasCohorts && f.cohort ? f.cohort.name : '-';
        cells[6].innerText = f.cohort && f.cohort.assignedAt ? new Date(f.cohort.assignedAt).toISOString().slice(0, 10) : '';
        cells[7].innerText = f.cohort && f.cohort.enrolledAt ? new Date(f.cohort.enrolledAt).toISOString().slice(0, 10) : '';
        const actionsCell = cells[8];
        if (f.hasRollout && f.rolloutRoll) {
            const resetRollout = document.createElement('button');
            resetRollout.innerText = 'Reset rollout';
            actionsCell.appendChild(resetRollout);
            resetRollout.addEventListener('click', async () => {
                await updateSettingAndReloadConfig(getRolloutSettingsKey(f.feature, f.subFeature), undefined);
                render();
            });
        }
        if (f.hasRollout && f.rolloutPercent) {
            const forceRollout = document.createElement('button');
            forceRollout.innerText = `Force ${f.state === 'enabled' ? 'leave' : 'join'} rollout`;
            actionsCell.appendChild(forceRollout);
            forceRollout.addEventListener('click', async () => {
                await updateSettingAndReloadConfig(getRolloutSettingsKey(f.feature, f.subFeature), f.state === 'enabled' ? 100.0 : 0.1);
                render();
            });
        }
        if (f.hasCohorts) {
            const reassign = document.createElement('button');
            reassign.innerText = `Reassign cohort`;
            actionsCell.appendChild(reassign);
            reassign.addEventListener('click', async () => {
                await updateSettingAndReloadConfig(getAssignedCohortSettingsKey(f.feature, f.subFeature), undefined);
                render();
            });
            const otherEligableCohort = f.availableCohorts.find((c) => c.name !== f.cohort?.name);
            if (otherEligableCohort) {
                const switchCohort = document.createElement('button');
                switchCohort.innerText = `Switch to ${otherEligableCohort.name}`;
                actionsCell.appendChild(switchCohort);
                switchCohort.addEventListener('click', async () => {
                    await updateSettingAndReloadConfig(`abn.${f.feature}.${f.subFeature}.cohort`, {
                        ...otherEligableCohort,
                        assignedAt: Date.now(),
                    });
                    render();
                });
            }
        }
        table.appendChild(row);
    });
}

render();
