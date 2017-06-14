const Parent = window.DDG.base.View;

function SlidingSubview (ops) {

    ops.appendTo = $('.sliding-subview--root');
    Parent.call(this, ops);

    this.$parent.addClass('sliding-subview--open');

    // TODO: attach a click handler that animates subview closed and calls
    //       this.destroy()
}

SlidingSubview.prototype = $.extend({},
    Parent.prototype,
    {

        destroy: () => {
            console.log('SlidingSubview destroy()');
            // TODO: animate sliding until parent of current .sliding-subview is in view
            // TODO: Parent.prototype.destroy() self after animation is done
        }

    }
)

module.exports = SlidingSubview;
