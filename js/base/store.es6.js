const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');

// TODO: notify autocomplete of change after onkeyup event in search input
// LATER: don't return store. tuck store away from public API
//        and only expose .register(), .subscribe() and .getState()
// TODO: model.modelType -> .modelName
// TODO: don't allow duplicate modelType/modelName (aka reducer names), throw error

let store = null;
const asyncReducers = {};

/**
 * Creates a reducer for each caller (in most cases, a model will be its caller)
 * Returns store object with with updated reducers.
 * Callers can now call .getState() and .dispatch() method on returned store obj
 * @param {string} reducer name
 * @param {actionType} uppercase action type that identifies the reducer
 */
function register (modelType, initialState) {

    const reducerName = modelType;
    const actionType = reducers.getActionType(modelType);

    reducers.add(asyncReducers, reducerName, (state, action) => {
        // this will happen during init phase:
        if (state === undefined) state = { change: null, properties: {}  }
        // this will happen during updates:
        if (action.type === actionType) {
            let change = null;
            if (action.change) change = action.change;
            return { change: change, properties: action.properties };
        } else {
            return state;
        }
    });
    const combinedReducers = minidux.combineReducers(asyncReducers);

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
  if (properties.store) delete properties.store;
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
