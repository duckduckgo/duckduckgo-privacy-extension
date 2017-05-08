function addReducer (asyncReducers, reducerName, reducerFn) {
    if (typeof reducerName !== 'string') { throw new Error('reducer name must be a string'); }
    if (typeof reducerFn !== 'function') { throw new Error('reducer must be a function')}
    if (asyncReducers[reducerName]) { reducerName = reducerName + '1'; }

    asyncReducers[reducerName] = reducerFn;
}

module.exports = addReducer;
