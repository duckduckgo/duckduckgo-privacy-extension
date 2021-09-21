/*
 * Temporary helper functions used to migrate and
 * clean up old data
 */

/*
* Mapping new entity names to old entity names for data migration
*/
const entityRenameMapping = {
    Google: 'Google LLC',
    Facebook: 'Facebook, Inc.',
    Twitter: 'Twitter, Inc.',
    Amazon: 'Amazon Technologies, Inc.',
    AppNexus: 'AppNexus, Inc.',
    Oracle: 'Oracle Corporation',
    MediaMath: 'MediaMath, Inc.',
    Oath: 'Verizon Media',
    Maxcdn: 'StackPath, LLC',
    Automattic: 'Automattic, Inc.',
    Adobe: 'Adobe Inc.',
    Quantcast: 'Quantcast Corporation'
}

export function migrateCompanyData (company, storageData) {
    if (entityRenameMapping[company]) {
        const oldName = company
        const newName = entityRenameMapping[company]
        storageData[newName] = storageData[oldName]
        storageData[newName].name = newName
        delete storageData[oldName]
        company = newName
    }
    return [company, storageData]
}
