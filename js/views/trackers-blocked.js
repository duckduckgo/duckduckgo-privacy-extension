const Parent = require('./sliding-subview');

// TODO: use es6 class syntax
function TrackersBlocked (ops) {

    Parent.call(this, ops);

}

TrackersBlocked.prototype = $.extend({},
  Parent.prototype,
  {

  }
);

module.exports = TrackersBlocked;
