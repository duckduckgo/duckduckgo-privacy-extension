const minidux = require('minidux');
const deepFreeze = require('deep-freeze');
const addReducer = require('./reducers.es6.js');

var store = null;

const asyncReducers = {};
function createReducer (reducerName, actionType) {
    addReducer(asyncReducers, reducerName, (state, action) => {
        if (action.type === actionType) {
            return action.properties || {};
        }
    });

    const reducers = minidux.combineReducers(asyncReducers);

    if (!store) {
        store = minidux.createStore(reducers, {});
        store.subscribe((state) => {
            console.log('subscriber state update:')
            console.log(state)
            // make state immutable before broadcasting out to models!
            state = deepFreeze(state);
            // TODO: broadcast out changes to corresponding state.modelTypes
            // via EventEmitter2
        });
    } else {
        store.replaceReducer(reducers);
    }

    return store;
}

// TODO: turn store into constructor with an init phase that gets kicked
// off (maybe) by page, and is required by page vs in base/index where it is now

// maybe we only offer model.set() method (reducer) and hide
// all this "reducer" stuff from developer, dynamically create each reducer
// behind the curtain when each model is init'd, first dispatch() is model attrs
// ...and swap this out for model._emit()
// function exampleReducer1 (state, action) {
//     if (action.type === 'SET_EXAMPLEREDUCER1') {
//         return action.properties || {};
//     }
// }

// function exampleReducer2 (state, action) {
//   if (action.type === 'SET_EXAMPLEREDUCER2') {
//     return action.properties || {};
//   }
// }

// combine reducers
// const reducers = minidux.combineReducers({exampleReducer1, exampleReducer2});

// dynamically register each model in its "default state"
// after model init (the $.extend(this, attrs) part of BaseModel.call()... etc)
// maybe the only reducer is the .set() method on each model
// after init phase!
// const store = minidux.createStore(reducers, {});

// console.log('default state:');
// console.log(store.getState());

// store.subscribe will need to be broadcast out to each model
// each model will need to subscribe
// remember: minidux only allows one store subscriber(!)
// store.subscribe((state) => {
//   console.log('subscriber state update:')
//   console.log(state)
//   // make state immutable before broadcasting out to models!
//   state = deepFreeze(state);
//   // TODO: broadcast out changes to corresponding state.modelTypes
//   // via EventEmitter2
// });

// this will happen when models call model.set(), we'll just simulate it here:
// window.setTimeout(() => {

//   store.dispatch({ type: 'SET_EXAMPLEREDUCER1', properties: {
//     modelType: 'model1',
//     foo: 'foo',
//     bar: { baz: 'baz' }
//   }
//   });
//   console.log('state after first dispatch call:')
//   console.log(store.getState());

//   store.dispatch({ type: 'SET_EXAMPLEREDUCER2', properties: {
//     modelType: 'model2',
//     hay: 'hay'
//   }
//   });
//   console.log('state after second dispatch call:')
//   console.log(store.getState());

//   // TODO: figure out if we can dynamically register a new model+reducer!

// }, 1000)

module.exports = {
  createReducer: createReducer
};
