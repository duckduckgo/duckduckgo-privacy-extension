const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');

// TODO: notify autocomplete of change after onkeyup event in search input
// LATER: don't return store. tuck store away from public API
//        and only expose .register(), .subscribe() and .getState()

let store = null;

/**
 * Creates a reducer for each caller (the base model will be its caller)
 * to track its state
 * @param {string} modelName - must be unique
 * @param {object} initialState - initial state of model
 * @api public
 */
function register (modelName, initialState) {
    if (typeof modelName !== 'string') { throw new Error('modelName must be a string'); }
    if (reducers.asyncReducers[modelName]) { throw new Error ('modelName must be unique, no duplicates'); }

    reducers.add(modelName);
    const combinedReducers = reducers.combine();

    if (!store) {
        store = minidux.createStore(combinedReducers, {});
        store.subscribe((state) => {
            console.log('state update:')
            console.log(state)
            // make state immutable before broadcasting out to models!
            state = deepFreeze(state);
            // TODO: broadcast out changes to subscribers
            // via EventEmitter2; broadcast what's changed, old value, new value
            // do a deep compare somewhere?
        });
    } else {
        store.replaceReducer(combinedReducers);
        // send initial state of model
        update(modelName, null, initialState);
    }
}

function update (modelName, change, properties) {
  const actionType = reducers.getActionType(modelName);
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
