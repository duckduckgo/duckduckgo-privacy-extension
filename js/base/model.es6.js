const $ = require('./../../node_modules/jquery');
const mixins = require('./mixins/index.es6.js');
const store = require('./store.es6.js');

function BaseModel (attrs) {

    // attributes are applied directly
    // onto the instance:
    $.extend(this, attrs);

    // register model with minidux store
    // after checking `modelName` property
    if (!this.modelName || typeof this.modelName !== 'string') {
        throw new Error ('cannot init a model without a `modelName` property')
    } else {
        store.register(this.modelName, this._toJSON());
    }

    // subscriber to minidux store/state updates
    this.storePublisher = store.publisher;

};

BaseModel.prototype = $.extend({},
    mixins.events,
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
         * @api public
         */
        set: function(attr, val) {

            const lastValue = this[attr] || null;
            this[attr] = val;

            // send model state update to minidux store
            store.update(
                this.modelName,
                { property: attr, value: val, lastValue: lastValue },
                this._toJSON()
            );
        },


        /**
         * Convenience method for code clarity
         * so we can explicitly call clear()
         * instead of doing null sets
         */
        clear: function(attr, ops) {
            this.set(attr, null, ops);
            // TODO: update minidux store here!
        },


        /**
         * Private method for turning `this` into a
         * JSON object before sending to minidux store
         * Basically just weeds out properties that
         * are functions.
         */
        _toJSON: function () {
            return JSON.parse(JSON.stringify(this))
        }

    }
);

module.exports = BaseModel;
