// TODO: don't return store. tuck store away from public API
//       only expose .register(), .subscribe() and .getState()
// TODO: granular state publisher
// TODO: test state injector

const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const reducers = require('./reducers.es6.js');
const EventEmitter2 = require('./../../node_modules/eventemitter2');


/**
 * `_store` is our minidux state machine
 * Its api is not publicly exposed. Developers must use public api below.
 * @api private
 */
var _store = null;


/**
 * Creates a minidux reducer for each model.
 * The base model will be its caller in most cases.
 * @param {string} modelName - must be unique
 * @param {object} initialState - initial state of model
 * @api public
 */
function register (modelName, initialState) {
    if (typeof modelName !== 'string') { throw new Error('modelName must be a string'); }
    if (reducers.asyncReducers[modelName]) { throw new Error ('modelName must be unique, no duplicates'); }

    reducers.add(modelName);
    const combinedReducers = reducers.combine();

    if (!_store) {
        _store = minidux.createStore(combinedReducers, {});
        _store.subscribe((state) => {
            // make state immutable before publishing
            state = deepFreeze(state);
            // publish changes to subscribers
            publish(state);
        });
    } else {
        // update reducers to include the newest registered here
        _store.replaceReducer(combinedReducers);
        // send initial state of model that registered itself to store
        update(modelName, null, initialState);
    }
}


/**
 * Updates state of store by model name, which is mapped to
 * a corresponding reducer in the store.
 * Although api is public, most of what you need to do can be
 * done with model.set() and model.clear() instead of directly here
 * @param {string} modelName
 * @param {object} change - { property, value, lastValue }
 * @param {object} model properties as JSON
 * @api public
 */
function update (modelName, change, properties) {
  const actionType = reducers.getActionType(modelName);
  if (properties.storePublisher) delete properties.storePublisher;
  _store.dispatch({
    type: actionType,
    change: change,
    properties: properties
  });
}


/**
 * Actually broadcasts the changes out to models subscribed.
 *
 * 2 events are emitted:
 *  - generic something changed in global state: 'change'
 *  - more granular a specific attribute changed: 'change:<modelName>'
 */
const publisher = new EventEmitter2();
publisher.setMaxListeners(100); // default is too low at 10
function publish (state) {
  publisher.emit(`change`, state);
  // TODO: publisher.emit(`change:<modelName>`, state.<modelName>);
}


// public api
module.exports = {
  register: register,
  update: update,
  publisher: publisher
};
