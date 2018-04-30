module.exports = {
    animateGraphBars: function () {
        let self = this

        window.setTimeout(function () {
            if (!self.$graphbarfg) return
            self.$graphbarfg.each(function (i, el) {
                let $el = window.$(el)
                let w = $el.data().width
                $el.css('width', w + '%')
            })
        }, 250)

        window.setTimeout(function () {
            if (!self.$pct) return
            self.$pct.each(function (i, el) {
                let $el = window.$(el)
                $el.css('color', '#333333')
            })
        }, 700)
    }
}
