module.exports = {
    animateGraphBars: function () {
        const self = this;

        window.setTimeout(function () {
            if (!self.$graphbarfg) return;
            self.$graphbarfg.each(function (i, el) {
                const $el = window.$(el);
                const w = $el.data().width;
                $el.css('width', w + '%');
            });
        }, 250);

        window.setTimeout(function () {
            if (!self.$pct) return;
            self.$pct.each(function (i, el) {
                const $el = window.$(el);
                $el.css('color', '#333333');
            });
        }, 700);
    }
};
