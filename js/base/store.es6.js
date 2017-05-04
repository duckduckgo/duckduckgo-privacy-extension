const minidux = require('minidux');
const deepFreeze = require('deep-freeze');

// reducers: to go in model(s)
// eventually we'll want to combine all reducers
// maybe we only offer model.set() method (reducer) and hide
// all this "reducer" stuff from developer
// and swap this out for model._emit()
function exampleReducer (state, action) {
    if (action.type === 'example') {
        return { example: true };
    }
}

// combine reducers (...from models?)
// dynamically register each model in its "default state"
// after model init (the $.extend(this, attrs) part of BaseModel.call()... etc)
// maybe the only reducer is the .set() method on each model
// after init phase!
const store = minidux.createStore (exampleReducer, { example: false })

// store.subscribe will need to be broadcast out to each model
// each model will need to subscribe
// remember: minidux only allows one store subscriber(!)
store.subscribe((state) => {
  console.log('subscriber state update:')
  console.log(state)
  // make state immutable before broadcasting out to models!
  state = deepFreeze(state);
})

// this will happen when models call model.set()
window.setTimeout(() => {
  store.dispatch({ type: 'example' });
  console.log('state after dispatch call:')
  console.log(store.getState());
}, 1000)

module.exports = store;
