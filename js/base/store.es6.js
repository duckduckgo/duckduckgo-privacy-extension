// TODO: don't return store. tuck store away from public API
//       only expose
//       XX - .register(),
//       XX - .subscribe()
//       - .getState()
// TODO: follow prev nomenclature: model properties -> attributes
// TODO: model.set() should accept hash
// TODO: model.clear() should update minidux store
// TODO: this.store.update() signature arg should be hash so its readable
// TODO: make store agnostic about whether reducer is for model or view(!)
// TODO: destroying view/model destroys store reducer
// TODO: README at js/base directory level, point to it from main README
// TODO: create a state injector for test mocks


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
 * Creates a minidux reducer for each caller.
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
            state = deepFreeze(state); // make state immutable before publishing
            _publishChange(state); // publish changes to subscribers
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
  if (properties.store) delete properties.store;
  _store.dispatch({
    type: actionType,
    change: change,
    properties: properties
  });
}


/**
 * Broadcasts state change events out to subscribers
 * @api public, but exposed as `subscribe` for clarity
 */
const _publisher = new EventEmitter2();
_publisher.setMaxListeners(100); // EventEmitter2 default of 10 is too low
/**
 * Emits state change events via _publisher
 * _store.subscriber
 * @api private
 */
function _publishChange (state) {

  Object.keys(state).forEach((key) => {
      if (state[key].change) {
          console.log(`PUBLISH change:${state[key].change.modelName}`)
          _publisher.emit(`change`, state);
          _publisher.emit(`change:${state[key].change.modelName}`, state[state[key].change.modelName]);
      }
  });

}


// public api
module.exports = {
  register: register,
  update: update,
  subscribe: _publisher
};
