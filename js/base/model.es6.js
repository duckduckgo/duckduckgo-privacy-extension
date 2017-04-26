const EventEmitter2 = require('./../../node_modules/eventemitter2');

export function BaseModel (attrs) {

    // By default EventEmitter2 is capped at 10 to prevent unintentional memory leaks/crashes,
    // bumping up so we can violate it. Need to do an audio/review at some point and see if we can
    // reduce some of the event binding.
    this.setMaxListeners(500);

    // attributes are applied directly
    // onto the instance:
    $.extend(this, attrs);
};

BaseModel.prototype = $.extend(
    {},
    EventEmitter2.prototype,
    // env.Mixins.Events,
    {

        /**
         * Setter method for modifying attributes
         * on the model. Since the attributes
         * are directly accessible + mutable on the object
         * itself, you don't *have* to use the set method.
         *
         * However, the benefit of using the set method
         * is that changes can be broadcast out
         * to any UI components that might want to observe
         * changes and update their state.
         *
         * @param {string} attr
         * @param {*} val
         * @param {object} ops
         * @api public
         */
        set: function(attr, val, ops) {
            // support passing a hash of values to set instead of
            // single attribute/value pair, i.e.:
            //
            // this.set({
            //   name: 'something',
            //   description: 'something described'
            // });
            if (typeof attr === 'object') {
                for (var key in attr) {
                    this.set(key, attr[key], val);
                }
            }

            ops = ops || {};

            var existingVal = this[attr],
                isChanging = existingVal !== val;

            this[attr] = val;

            !ops.silent && isChanging && this._emitChange(attr, existingVal);
        },

        /**
         * Actually broadcasts the changes out
         * to anyone listening.
         *
         * 2 events are emitted:
         *  - more granular a specific attribute changed: 'change:<attr>'
         *  - and the generic something changed on me: 'change'
         *
         * The change is emitted out with the new value as the first
         * arg and the old value as the second arg (if one was passed).
         *
         * @param {string} attr
         * @param {*} oldVal
         * @api private
         */
        _emitChange: function(attr, oldVal) {
            var val = this[attr];
            this.emit('change:' + attr, val, oldVal);
            this.emit('change', attr, val, oldVal);
        },

        /**
         * Convenience method for code clarity
         * so we can explicitly call clear()
         * instead of doing null sets
         */
        clear: function(attr, ops) {
            this.set(attr, null, ops);
        }

    }
);
