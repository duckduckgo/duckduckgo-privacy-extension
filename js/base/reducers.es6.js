const minidux = require('minidux');
const asyncReducers = {}

function addReducer (reducerName, reducerFn) {
    const actionType = getActionType(reducerName);

    // auto-generate our reducer functions here,
    // add to `asyncReducers` object that
    // gets combine()'d below
    asyncReducers[reducerName] = (state, action) => {
        // this will happen during init phase:
        if (state === undefined) state = { change: null }
        // this will happen during updates:
        if (action.type === actionType) {
            let change = null;
            if (action.change) change = action.change;
            return { change: change };
        } else {
            return state;
        }
    }
}

function getActionType (reducerName) {
    return 'UPDATE_' + reducerName.toUpperCase();
}

function combine () {
    return minidux.combineReducers(asyncReducers);
}

function removeReducer (reducerName) {
    if (asyncReducers[reducerName]) {
        delete asyncReducers[reducerName];
        return true;
    }
}


// public api
module.exports = {
  asyncReducers: asyncReducers,
  add: addReducer,
  combine: combine,
  remove: removeReducer,
  getActionType: getActionType,
}
