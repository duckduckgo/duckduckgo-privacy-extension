const Parent = window.DDG.base.View;

function SlidingSubview (ops) {

    ops.appendTo = $('.sliding-subview--root');
    Parent.call(this, ops);

    this.$root = $('.sliding-subview--root');
    this.$root.addClass('sliding-subview--open');

    this._cacheElems('.js-sliding-subview', [ 'close' ]);
    this.bindEvents([
      [this.$close, 'click', this.destroy],
    ]);

}

SlidingSubview.prototype = $.extend({},
    Parent.prototype,
    {

        destroy: function () {
            var self = this;
            this.$root.removeClass('sliding-subview--open');
            window.setTimeout(() => {
                self.destroy();
            }, 500); // 500ms = 0.35s in .sliding-subview--root transition + 150ms
        }

    }
)

module.exports = SlidingSubview;
