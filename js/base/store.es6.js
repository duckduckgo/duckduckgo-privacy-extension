const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');

// TODO: notify autocomplete of change after onkeyup event in search input
// LATER: don't return store. tuck store away from public API
//        and only expose .register(), .subscribe() and .getState()

/**
 * store is our minidux state machine
 * its api is not publicly exposed. developers must use public api below.
 * @api private
 */
let store = null;


/**
 * Creates a minidux reducer for each caller (the base model will be its caller)
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
        // update reducers to include the newest registered here
        store.replaceReducer(combinedReducers);
        // send initial state of model that registered itself to store
        update(modelName, null, initialState);
    }
}


/**
 * Updates state of store by model name, which is mapped to
 * a corresponding reducer.
 * Although api is public, most of what you need to do can be
 * done with model.set() and model.clear() instead of directly here
 * @param {string} modelName
 * @param {object} change - { property, value, lastValue }
 * @param {object} model properties as JSON
 * @api public
 */
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
