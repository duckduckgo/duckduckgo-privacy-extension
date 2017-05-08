const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const addReducer = require('./reducers.es6.js');

// TODO: turn this whole thing into IIFE
// TODO: notify autocomplete of change after onkeyup event in search input
// LATER: don't return store. tuck store away from public API
//        and only expose .register(), .subscribe() and .getState()
// TODO: move creation of action type string into here from model
//       and make actionType just `SET_<modelType>`
// TODO: model.modelType -> .modelName
// TODO: don't allow duplicate modelType/modelName (aka reducer names), throw error
// TODO: create another fn/method that does the actual minidux dispatch
//       from model.set() just call into that method!
var store = null;
const asyncReducers = {};

/**
 * Creates a reducer for each caller (in most cases, a model will be its caller)
 * Returns store object with with updated reducers.
 * Callers can now call .getState() and .dispatch() method on returned store obj
 * @param {string} reducer name
 * @param {actionType} uppercase action type that identifies the reducer
 */
function register (reducerName, actionType) {

    addReducer(asyncReducers, reducerName, (state, action) => {
        if (state === undefined) state = { properties: {} }
        if (action.type === actionType) {
            return { properties: action.properties };
        } else {
            return state;
        }

    });

    const reducers = minidux.combineReducers(asyncReducers);

    if (!store) {
      console.log('MINIDUX CREATE STORE')
        store = minidux.createStore(reducers, {});
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
        console.log('MINIDUX replaceReducer()')
        store.replaceReducer(reducers);
    }

    return store;
}


module.exports = {
  register: register
};
