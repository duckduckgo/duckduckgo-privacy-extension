function addReducer (asyncReducers, reducerName, reducerFn) {
    if (typeof reducerName !== 'string') { throw new Error('reducer name must be a string'); }
    if (typeof reducerFn !== 'function') { throw new Error('reducer must be a function')}
    if (asyncReducers[reducerName]) { reducerName = reducerName + '1'; }

    asyncReducers[reducerName] = reducerFn;
}

function getActionType (modelType) {
    return 'SET_' + modelType.toUpperCase();
}

// public api
module.exports = {
  add: addReducer,
  getActionType: getActionType
}
