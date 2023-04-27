// Rewrite import.meta.trackerLookup to trackerLookup string
module.exports = function rewriteMeta (babel) {
    const { types: t } = babel
    return {
        visitor: {
            MemberExpression (path) {
                if (
                    t.isIdentifier(path.node.object.meta, { name: 'import' }) &&
                    t.isIdentifier(path.node.object.property, { name: 'meta' }) &&
                    t.isIdentifier(path.node.property, { name: 'trackerLookup' })
                ) {
                    path.replaceWith(t.valueToNode('trackerLookup'))
                }
            }
        }
    }
}
