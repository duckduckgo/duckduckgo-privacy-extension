const Parent = window.DDG.base.View

function SlidingSubview (ops) {
    ops.appendTo = $('.sliding-subview--root')
    Parent.call(this, ops)

    this.$root = $('.sliding-subview--root')
    this.$root.addClass('sliding-subview--open')

    this._cacheElems('.js-sliding-subview', [ 'close' ])
    this.bindEvents([
      [this.$close, 'click', this._destroy],
    ])
}

SlidingSubview.prototype = $.extend({},
    Parent.prototype,
    {

        _destroy: function () {
            this.$root.removeClass('sliding-subview--open')
            window.setTimeout(() => {
                this.destroy()
            }, 400); // 400ms = 0.35s in .sliding-subview--root transition + 50ms padding
        }
    }
)

module.exports = SlidingSubview
