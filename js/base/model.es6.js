const $ = require('jquery');
const mixins = require('./mixins/index.es6.js');
const store = require('./store.es6.js');

function BaseModel (attrs) {

    // attributes are applied directly
    // onto the instance:
    $.extend(this, attrs);

    // register model with `store` of global state
    // after checking `modelName` property
    if (!this.modelName || typeof this.modelName !== 'string') {
        throw new Error ('cannot init model without `modelName` property')
    } else {
        this.store = store;
        this.store.register(this.modelName);
    }

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
         * is that changes are broadcast out via store
         * to any UI components that might want to observe
         * changes and update their state.
         *
         * @param {string or object} attr
         * @param {*} val
         * @api public
         */
        set: function(attr, val) {

            // support passing a hash of values to set instead of
            // single attribute/value pair, i.e.:
            //
            // this.set({
            //   title: 'something',
            //   description: 'something described'
            // });
            if (typeof attr === 'object') {
                for (var key in attr) {
                    this.set(key, attr[key], val);
                }
                return;
            }

            const lastValue = this[attr] || null;
            this[attr] = val;

            this.store.update(
                this.modelName,
                { attribute: attr, value: val, lastValue: lastValue },
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
        },


        /**
         * Destroy any of this model's bound events
         * and remove its reducer from store so
         * there is no memeory footprint left.
         * Mostly used when view.destroy() is called.
         */
         destroy: function () {
             this.unbindEvents();
             this.store.remove(this.modelName);
         },

         /**
          * Private method for turning `this` into a
          * JSON object before sending to minidux store
          * Basically just weeds out properties that
          * are functions.
          */
         _toJSON: function () {
             let attributes = Object.assign({}, Object.getPrototypeOf(this), this);
             if (attributes.store) delete attributes.store;
             return JSON.parse(JSON.stringify(attributes));
         }

    }
);

module.exports = BaseModel;
