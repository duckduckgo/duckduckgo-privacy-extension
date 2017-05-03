const Parent = window.DDG.base.View;

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new trackerlist view");


};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    {

        // _handleClick: function (e) {
        //     console.log('TrackerList _handleClick()');
        // }

    }

);

module.exports = TrackerList;
