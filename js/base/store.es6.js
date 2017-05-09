const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');

// TODO: notify autocomplete of change after onkeyup event in search input
// LATER: don't return store. tuck store away from public API
//        and only expose .register(), .subscribe() and .getState()
// TODO: model.modelType -> .modelName
// TODO: don't allow duplicate modelType/modelName (aka reducer names), throw error

let store = null;

/**
 * Creates a reducer for each caller (the base model will be its caller)
 * to track its state
 * @param {string} modelType
 * @param {object} initialState
 */
function register (modelType, initialState) {
    if (typeof modelType !== 'string') { throw new Error('modelType must be a string'); }
    if (reducers.asyncReducers[modelType]) { throw new Error ('modelType must be unique, no duplicates'); }

    reducers.add(modelType);
    const combinedReducers = reducers.combine();

    if (!store) {
        store = minidux.createStore(combinedReducers, {});
        store.subscribe((state) => {
            console.log('subscriber state update:')
            console.log(state)
            // make state immutable before broadcasting out to models!
            state = deepFreeze(state);
            // TODO: broadcast out changes to corresponding state.modelTypes
            // via EventEmitter2; broadcast what's changed, old value, new value
            // do a deep compare somewhere?
        });
    } else {
        store.replaceReducer(combinedReducers);
        // send initial state to reducer
        update(modelType, null, initialState);
    }
}

function update (modelType, change, properties) {
  const actionType = reducers.getActionType(modelType);
  store.dispatch({
    type: actionType,
    change: change,
    properties: properties
  });
}

// public api
module.exports = {
  register: register,
  update: update
};
