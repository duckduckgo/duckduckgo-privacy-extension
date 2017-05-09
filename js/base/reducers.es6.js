const asyncReducers = {}

function addReducer (reducerName, reducerFn) {
    if (typeof reducerName !== 'string') { throw new Error('reducer name must be a string'); }
    if (typeof reducerFn !== 'function') { throw new Error('reducer must be a function')}
    if (asyncReducers[reducerName]) { throw new Error('each reducer is named after the models\'s modelName property and must be unique'); }

    asyncReducers[reducerName] = reducerFn;
}

function getActionType (modelType) {
    return 'SET_' + modelType.toUpperCase();
}

// public api
module.exports = {
  asyncReducers: asyncReducers,
  add: addReducer,
  getActionType: getActionType,
}
