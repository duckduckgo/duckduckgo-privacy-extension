import fs from 'fs';
import path from 'path';

/**
 * @typedef {import('@playwright/test').Page} Page - Playwright Page
 */

/**
 * Returns the schema of a given JavaScript Object in the given Page. Schema is
 * similar to the output of Object.getOwnPropertyDescriptors.
 * Notes:
 *  - Does not traverse up the target Object's __proto__ chain. If that is
 *    desired, call `getObjectSchema` again for the Object's prototype.
 *  - Functions are represented as a string "function(N)", where N is the number
 *    of arguments that the function accepts (aka the function's length).
 *  - Object keys are sorted alphabetically.
 *  - Object values are handled recursively.
 *  - Cyclic Object values are represented as the string "CYCLIC OBJECT VALUE".
 * @param {Page} page
 *   The Playwright page to inspect.
 * @param {string} targetObjectName
 *   The name of the Object to inspect. A string which when eval'd in the page
 *   returns the target Object. For example, "globalThis.someApi".
 * @returns {Promise<Object>}
 *   The target Object's schema.
 */
export async function getObjectSchema(page, targetObjectName) {
    // eslint-disable-next-line no-eval
    const targetObjectHandle = await page.evaluateHandle((name) => eval(name), targetObjectName);

    return await page.evaluate(function inPageGetObjectSchema(targetObject, previouslySeenObjects) {
        // On first call, the only 'seen' Object is the current target Object.
        if (!previouslySeenObjects) {
            previouslySeenObjects = new Set([targetObject]);
        }

        const result = Object.create(null);
        const descriptors = Object.getOwnPropertyDescriptors(targetObject);

        // First keep track of any Object property values that the target has.
        // That way, cyclic Object values will be spotted consistently,
        // regardless the order of the properties.
        const seenObjects = new Set(previouslySeenObjects);
        for (const { value } of Object.values(descriptors)) {
            if (typeof value === 'object' && value !== null) {
                seenObjects.add(value);
            }
        }

        // Iterate through the target Object's properties, adding each property
        // descriptor to the result. While doing so, take care to ensure the
        // values are respresented in a JSON friendly way. So that means,
        // avoiding looping Object references (aka cyclic values) and providing
        // a string representation of functions.
        // Note: In the future, it might turn out to be useful to also provide
        //       string representations of other special Object values
        //       (e.g. RegExp, Date) too.
        for (const propertyName of Object.keys(descriptors).sort()) {
            const descriptor = descriptors[propertyName];
            result[propertyName] = Object.create(null);
            for (const key of Object.keys(descriptor).sort()) {
                const value = descriptor[key];
                if (typeof value === 'function') {
                    result[propertyName][key] = 'function(' + value.length + ')';
                } else if (typeof value === 'object' && value !== null) {
                    if (previouslySeenObjects.has(value)) {
                        result[propertyName][key] = 'CYCLIC OBJECT VALUE';
                    } else {
                        result[propertyName][key] = inPageGetObjectSchema(value, seenObjects);
                    }
                } else {
                    result[propertyName][key] = JSON.stringify(value);
                }
            }
        }

        return result;
    }, targetObjectHandle);
}

/**
 * Returns the expected and actual API schemas that can be used for an API
 * schema test. As a side-effect, the actual API schema is written to disk as a
 * JSON file as a test artifact.
 * @param {Page} page
 *   The Playwright page to inspect.
 * @param {string} schemaFilename
 *   The file name of the expected schema JSON. Also used when writing the
 *   actual schema test artifact.
 *   Note: Should not include the path, that is hard-coded.
 * @param {string[]} targetObjectNames
 *   The names of Objects to inspect. Strings which when eval'd in the page
 *   return the target Objects. For example, "globalThis.someApi".
 * @returns {Promise<Object>}
 *   The target Object's schema.
 */
export async function setupAPISchemaTest(page, schemaFilename, targetObjectNames) {
    const actualSchemaPath = path.resolve(__dirname, '..', 'artifacts', 'api_schemas', schemaFilename);
    const expectedSchemaPath = path.resolve(__dirname, '..', 'data', 'api_schemas', schemaFilename);

    const actualSchema = Object.create(null);
    for (const objectName of targetObjectNames) {
        actualSchema[objectName] = await getObjectSchema(page, objectName);
    }

    fs.mkdirSync(path.dirname(actualSchemaPath), { recursive: true });
    // Write the actual schema to a file as a test artifact.
    fs.writeFileSync(actualSchemaPath, JSON.stringify(actualSchema, null, 4));

    const expectedSchema = JSON.parse(fs.readFileSync(expectedSchemaPath).toString());

    return { actualSchemaPath, expectedSchemaPath, actualSchema, expectedSchema };
}

export default {
    getObjectSchema,
    setupAPISchemaTest,
};
