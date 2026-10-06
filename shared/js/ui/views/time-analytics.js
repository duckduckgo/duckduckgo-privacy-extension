const Parent = window.DDG.base.View;

const REFRESH_MS = 5000;

function TimeAnalytics(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.setup();
    this._refresh();
    this._timer = window.setInterval(() => this._refresh(), REFRESH_MS);
}

TimeAnalytics.prototype = window.$.extend({}, Parent.prototype, {
    setup: function () {
        this._cacheElems('.js-time-analytics', ['filter', 'range']);
        this.bindEvents([
            [this.$filter, 'change', this._onFilterChange],
            [this.$range, 'change', this._onRangeChange],
        ]);
    },

    _onFilterChange: function (event) {
        const value = event.target.value === 'allowed' ? 'allowed' : 'blocked';
        if (value === this.model.filter) {
            return;
        }
        this.model.filter = value;
        this.unbindEvents();
        this._rerender();
        this.setup();
    },

    _onRangeChange: function (event) {
        const value = event.target.value === 'week' ? 'week' : 'today';
        if (value === this.model.range) {
            return;
        }
        this.model.range = value;
        this.model.applyRange();
        this.unbindEvents();
        this._rerender();
        this.setup();
    },

    _refresh: function () {
        if (this._refreshing) {
            return;
        }
        this._refreshing = true;
        this.model
            .getState()
            .then(() => {
                if (this.$el) {
                    this.unbindEvents();
                    this._rerender();
                    this.setup();
                }
            })
            .finally(() => {
                this._refreshing = false;
            });
    },

    destroy: function () {
        if (this._timer) {
            window.clearInterval(this._timer);
            this._timer = null;
        }
        Parent.prototype.destroy.call(this);
    },
});

module.exports = TimeAnalytics;
