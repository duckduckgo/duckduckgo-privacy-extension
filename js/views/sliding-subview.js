const Parent = window.DDG.base.View;
const ANIMATION_MS = 300; // milliseconds

// TODO: use es6 class syntax
function SlidingSubview (ops) {

    Parent.call(this, ops);

}

SlidingSubview.prototype = $.extend({},
    Parent.prototype,
    {

        destroy: () => {
            console.log('SlidingSubview destroy()');
            // TODO: animate sliding until parent of current .sliding-subview is in view
            // TODO: Parent.prototype.destroy() self after animation is done
        },


        _render: (ops) => {

            // TODO: attach dom node in special container that is child of .sliding-subview--root

            Parent.prototype._render.call(this, ops);

            // TODO: this.$el by default should be offscreen to right, absolutely positioned
            //       apply class .sliding-subview to this.$el (if not present yet)

            // TODO: apply animation to .sliding-subview--root (use ANIMATION_MS)
            //       walk up to --root and slide it to left by window width

            // TODO: attach this properly for close effect
            this.$('.js-sliding-subview-collapse').click((e) => {

                e.preventDefault();
                e.stopPropagation();

                this.destroy();
            });
        },

        onResize: () => {
            // TODO: recalculate width of .sliding-subview(s)
            //       (this will probably never ever happen!)
        }


    }
)

module.exports = SlidingSubview;
