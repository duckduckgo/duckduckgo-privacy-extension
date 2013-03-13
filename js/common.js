/*
 * Copyright (C) 2012 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var HEADER_ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAgCAYAAACRpmGNAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABM9JREFUeNq8WF1oHFUUPndnZid/7S5JmzVJk7V9sNJqVqOiaBof1NY+JEVIQZA8CBVfIn3yyfhkC4XogxgfJJY+VEFRKM2iJGjRrMQUSsLuNoFGmthSu+xust2Z/Z2fnb3eGZJ1dnd2fhLwwGHv3Dkz95t7znfOuYsAgIZ6QWAuVveNBDu1cf1PwOw+V2VDO3gBWrqzEXiy1xegadpfLBbnifJdXV2RXQDEFjZYD1BVxkTdql5bWh/NCXIa66RcLt8TRfGTubm5zh07m8pYKA12gal6dzMbTmQF/KggYQNJcxx3ltix27pnkGh7YCsGLs+vDu2Mn32889UnfN7xVpb26m1kWf4ikUh809vbG9ktEfRiuWN6zWazo6orsYWUSqXrRHwOdtIIg31g+Xz+HHYgKkAdOMcAbaeS2cWIn2Gbpp3kDoqiRsgHjdW823Yqou0aPtbd8zFDuSAvYfhuWQShIMCZZ1rgULu7zjaZA7j4qwAcn4G3A82TZOqqWbowm7d0p+qStURGi7PPQgr+eVXU3PYgJRq6M1szrYZDjXtZm+61B+52jNcW2kiVbcdcLMHjTE5Qc2HYABxrBc5lozpUzR9uR5DNi/DtzLKmjeS3m3fh5Htfw8yNVUAIBQhzvQ5KGmpUWw2FK0qVsbrgpcu/w9HDByFIxkYSS2a0350PGBwc7HdajGm7u1aUFTWpBtTx/lZWm3t34ge4cuGs4YPvjAxo4Ht8HsP7qT/pkWYWNMBFEeY7Xi6Fate2zdYkX4jugBt+7Th0de6HfQTk0SOdDZ95/uneyrip8H0ge4sJuBk4QbnwiN6OzE1sx+DuUomilKLJnAidbWzdwtWGGcCZWUDSA8D5BW2qLCwBq8Qm65cn5mUU4rNwwWmeq3K1JAoRriBVwBkKPwvKw/fJijHLEJZLOJhMUVP+N6SIGQCmQczVzd28lxJe9Lcbvym3CMrfQ6aISgoKSjLh06Ir+NZ5kbMq/rQT9mQEuUKKurZCWKm6Lorow30vyFPLP7L+Dg/2kB2KOuhSwFEq2SGFrJSNXeA5TYppd938wKh4XwdMk5XrjF9la2GJnrj2OevdTW3Fta5VSZEuysZxxxwCquerSsw1s3hSCjNjJLZCGAOvmTDohAthPyJaAX8MB9UY3FPhVyXLpUPJrK8xKTxvQkq8dYpe7/G0NOFhmoIR1g3jRmFFWDoT30QXtwmBnRLCkBR/rG8Kg0cONHZ9MnnK5/NVEur9X9z9ba1lP8tAwOUCnCug0MKyK1pDCMtO2LDg12ow+s+8WbEnJzI1ZzUZKGuihg2AFSHqvogvSpG8VGpcD2m63+GButE97IitWq4qydF0QTbrfquS3cFPn+uD6VemqamXhpyu5bLzBfqLrXgsxBHGpoV1+DI6DFfuXIJIKvxfkCLkIUfEYa0G/zT4kbevZY2i0ZjCUmNOdk1PCFsn/kqv9lcyfqwn5r26dh5u8xhWOAxu5IPRpwJwIxaG5WScO9NB8Vsy+KPk3kYeA1ZwqHxu4aQTcLRVbjNsd/JFNalWuSmhxGFu6yHEBQRlQN5HMnh3eVbFZhXC8qGiWApxJnGnlTppz/84gVNC4O0OhVSK6tVJwwLN0KaNXz8wAOPHP4Du5j59x8E5Ze6/AgwAHWTjLQ+v54oAAAAASUVORK5CYII=';
var DDG_URL = 'https://duckduckgo.com/?q=';

var DuckDuckBox = function (options) {
    this.inputName = options.inputName;
    this.forbiddenIDs = [];
    this.debug = false;
    
    if (options.forbiddenIDs)
        this.forbiddenIDs = options.forbiddenIDs;

    if (options.debug) 
        this.debug = true;

    if (options.className)
        this.className = options.className;
    else
        this.className = '';

    if (options.contentDiv[0] === '#')
        this.contentDiv = options.contentDiv;
    else
        this.contentDiv = '#' + options.contentDiv;

    if (options.hover) 
        this.hover = options.hover;
    else
        this.hover = false

    input = $("[name='" + this.inputName + "']"); 
    if (input.length !== 0)
        this.lastQuery = input.value;
    else
        this.lastQuery = '';
};

DuckDuckBox.prototype = {
    init: function () {
        this.search(this.getQueryFromURL());
    },

    search: function () {
        if (this.debug)
            console.log('bad search called');

        return; 
    },

    getQueryFromURL: function () {
        var regex = new RegExp('[\?\&]q=([^\&#]+)');
        if(regex.test(window.location.href)) {
            var q = window.location.href.split(regex);
            q = q[q.length - 2].replace(/\+/g," ");

            if(this.debug)
                console.log(q)

            return decodeURIComponent(q);
        }
    },

    renderZeroClick: function (res, query) {
        // disable on forbidden IDs
        for(var i in this.forbiddenIDs) {
            if ($("#" + this.forbiddenIDs[i]).length !== 0)
                return;           
        }

        if (res === '')
            return;

        if (query === '' || query === undefined)
            return;

        if (this.debug) console.log(res, query);

        if (res['AnswerType'] !== "") {
            this.displayAnswer(res['Answer']);
        } else if (res['Type'] == 'A' && res['Abstract'] !== "") {
            this.displaySummary(res, query);
        } else {     
            switch (res['Type']){
                case 'E':
                    this.displayAnswer(res['Answer']);
                    break;

                case 'A':
                    this.displayAnswer(res['Answer']);
                    break;

                case 'C':
                    this.displayCategory(res, query);
                    break;

                case 'D':
                    this.displayDisambiguation(res, query);
                    break;

                default:
                    this.hideZeroClick();
                    break;
                        
            } 
        }
   },

    hideZeroClick: function () {
        var ddg_result = $("#ddg_zeroclick");
        if (ddg_result.length !== 0)
            ddg_result.hide();
    },

    showZeroClick: function () {
        var ddg_result = $("#ddg_zeroclick");
        if (this.debug) console.log( $("#ddg_zeroclick") )

        if (ddg_result.length !== 0)
            ddg_result.show();
    },

    createResultDiv: function () {
        var ddg_result = $("#ddg_zeroclick");
        this.showZeroClick();

        if (ddg_result.length === 0) {
            ddg_result = $("<div>", {id: 'ddg_zeroclick'});
            ddg_result.addClass(this.className);
        }

        // clean it up, please!
        ddg_result.html('');

        return ddg_result;
    },

    updateResultDiv: function (result) {
        var contentDiv = $(this.contentDiv);
        contentDiv.prepend(result);
    },

    createHeader: function (heading, query) {
        return $('<div>', {id: 'ddg_zeroclick_header'})
                       .append($('<a>', {
                                   class: 'ddg_head',
                                   href: DDG_URL + encodeURIComponent(query)
                               }).text(heading))
                       .append($('<img>', {
                                   src: HEADER_ICON_URL
                               }))
                       .append($('<a>', {
                                   class: 'ddg_more',
                                   href: DDG_URL + encodeURIComponent(query)
                               }).html('See DuckDuckGo results &raquo;'));

    },

    resultsLoaded: function () {
        if(this.debug)
            console.log($(this.contentDiv));
        
        var contentDiv = $(this.contentDiv);

        if (contentDiv.length !== 0){
            if (contentDiv.css('visibility') === "visible" ||
                contentDiv.css('display') !== 'none') {
                return true;
            }
        }
        
        return false;
    },

    makeDisambig: function(text) {
        var disambig = $('<div>', {
                    class: 'ddg_zeroclick_disambig',
                })
                .click(function(event){
                    window.location.href = $(this).find('a').attr('href');
                });

        var link_html = text.match(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/);

        var parts = text.split(/<a[^>]*>.*?<\/a>/);
        disambig.append($('<span>').text(parts[0]));
        disambig.append($('<a>').attr({href: link_html[1]})
                                .text(link_html[2]));
        disambig.append($('<span>').text(parts[1]));

        return disambig;

    },

    makeCategoryItem: function(text) {
        var category_item = $('<div>', {class: 'ddg_zeroclick_category_item'});
        var parts = text.split(/<br>/);
        var link_html = parts[0].match(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/);
        category_item.append($('<a>')
                                    .attr('href', link_html[1])
                                    .text(link_html[2]));
        category_item.append($('<br>'));
        category_item.append($('<span>').text(parts[1]));
        
        return category_item;
    },

    displayAnswer: function (answer) {
        if (answer === '') {
            this.hideZeroClick();
            return;
        }

        if (this.resultsLoaded()) {
            var ddg_result = this.createResultDiv();
            ddg_result.addClass('ddg_answer');
            ddg_result.html(answer);

            if(this.debug)
                console.log('showing answer');
            
            this.updateResultDiv(ddg_result)

        } else {
            if(this.debug)
                console.log('trying again');

            var $this = this;
            setTimeout(function () { 
                $this.displayAnswer(answer); 
            }, 200);
        }
    },

    displaySummary: function (res, query) {
        var result = this.createResultDiv();

        var img_url = res['AbstractURL'];
        var official_site = {};
        var first_categoies = [];
        var hidden_categories = []; 

        var heading = (res['Heading'] === ''? "&nbsp;": res['Heading']);

        var image = '';

        if (res['Results'].length !== 0) {
            if(res['Results'][0]['Text'] === "Official site") {
                var url = res['Results'][0]['FirstURL'].match(/https?:\/\/(?:www.)?(.*\.[a-z]+)(?:\/)?/);

                official_site = {
                    text: url[1],
                    url: res['Results'][0]['FirstURL']
                };

                img_url = res['Results'][0]['FirstURL'];
            }
        } 
        
        first_categories = [];
        hidden_categories = [];

        for (var i = 0; i < res['RelatedTopics'].length; i++){
            if (res['RelatedTopics'].length === 0)
                break;
            
            var link = res['RelatedTopics'][i]['Result'].
                        match(/<a href="(.*)">(.*)<\/a>/);

            var cls = (res['RelatedTopics'][i]['FirstURL'].match(/https?:\/\/[a-z0-9\-]+\.[a-z]+(?:\/\d+)?\/c\/.*/) !== null) ? "ddg_zeroclick_category" : "ddg_zeroclick_article";
            
            link = $('<a>', {
                                href: link[1],
                                text: link[2]
                            });

            var category = $('<div>', {
                                class: cls,
                                html: link
                            }).click(function (event){
                                window.location.href = $(this).children().attr('href');
                            }).append(link);


            if (this.hover) {
                category.mouseover(function (event){
                            $(this).addClass('ddg_selected');
                        })
                        .mouseout(function (event){
                            $(this).removeClass('ddg_selected');
                        });

                if (i < 2) {
                    if (i === 0)
                        category.addClass('first_category');

                    first_categories.push(category);
                } else {
                    hidden_categories.push(category);
                }

            } else {
                category.html(link);

                if (i < 2) {
                    if (i === 0) 
                        category.addClass('first_category');
                    
                    first_categories.push(category);
                } else {
                    hidden_categories.push(category);
                }
            }
        }


        result.append(this.createHeader(heading, query));

        if (res['RelatedTopics'].length > 2){

            if (this.debug)
                console.log(tmp_div);

            var more_topics = $('<div>', {
                                class: 'ddg_zeroclick_more'
                            }).click(function (event){
                                $(this).removeClass('ddg_selected');
                                $(this).mouseover(function (event){});
                                $(this).mouseout(function (event){});
                            }).append($('<a>', {
                                    text: 'More related topics'        
                                }).click(function (event){
                                    $(this).parent().next().show();
                                    $(this).parent().hide();
                                })
                            );

            if (this.hover) {
                more_topics.mouseover(function (event){
                    $(this).addClass('ddg_selected');                
                }).mouseout(function (event){
                    $(this).removeClass('ddg_selected');
                }).click(function (event){
                    $(this).next().show();
                    $(this).hide();
                });
            }

        }

        if (res['Image']) {
            image = $('<div>', {
                id: 'ddg_zeroclick_image'
            }).append($('<a>', {
                    href: img_url
                }).append($('<img>', {
                        class: 'ddg_zeroclick_img',
                        src: res['Image']
                    }
                ))
            );
            
            result.append(image);
        }
        
        var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*?\.)?(.*\..*?)\/.*/)[2];
        var more_image = $('<img>', {
            src: 'https://duckduckgo.com/i/'+ source_base_url +'.ico'
        }); 

        if (source_base_url === "wikipedia.org")
            more_image.attr('src', 'https://duckduckgo.com/assets/icon_wikipedia.v101.png');

        var official_links = $('<div>', {
                            id: 'ddg_zeroclick_official_links'
                       })
                       .append(more_image)
                       .append($('<a>', {
                                   class: 'ddg_more_link',
                                   href: res['AbstractURL']
                               }).text('More at ' + res['AbstractSource']));

        if (official_site['url'] !== undefined) {
            official_links.append($('<span>', {text: ' | Official site: '}))
                          .append($('<a>', {
                                        href: official_site['url']
                            }).text(official_site['text']));
        }
        
        var text_div = $('<div>')
                    .click(function (event){
                                window.location.href = res['AbstractURL'];
                            })
                    .append($('<p>')
                                .html(res['Abstract']))
                    .append(official_links);


        if (this.hover) {
            text_div.mouseover(function (event){
                $(this).addClass('ddg_selected');
            }).mouseout(function (event){
                $(this).removeClass('ddg_selected');
            });
        } 

        var abst = $('<div>', {
            id: 'ddg_zeroclick_abstract',
            style:  (res['Image'] ? 'max-width: 420px': '')
        }).append(text_div);


        for (var i = 0; i < first_categories.length; i++){
            abst.append( first_categories[i] );
        };
        

        abst.append(more_topics);

        var tmp_div = $('<div>', {
                              style: 'display:none;padding-left:0px;margin-left:-1px;'
                            });

        for (var i = 0; i < hidden_categories.length; i++){
            tmp_div.append( hidden_categories[i] );
        };
        
        abst.append(tmp_div);

        result.append(abst);
        result.append($('<div>', {class: 'clear'}));

        if(this.resultsLoaded()) {
            this.updateResultDiv(result);

            if(this.debug)
                console.log('loaded and showing');
        } else {
            var $this = this;
            setTimeout(function (){
                if(this.debug)
                    console.log('trying again');
                $this.updateResultDiv(result);
            }, 200);
        }

    },

    displayDisambiguation: function (res, query) {
        
        var result;
        var disambigs = [];
        var hidden_disambigs = []; 
        var others = [];
        var nhidden = 0;

        var tmp;
        

        for (var i = 0; i < res['RelatedTopics'].length; i++){
            if (res['RelatedTopics'].length === 0)
                break;
            

            if (this.debug)
                console.log(res['RelatedTopics'][i]['Result']);
            
            // other topics
            if(res['RelatedTopics'][i]['Topics']) {
                var topics = res['RelatedTopics'][i]['Topics'];
                var output = [];
                for(var j = 0; j < topics.length; j++){
                    var disambig = this.makeDisambig(topics[j]['Result']);
                    if (this.hover) {
                        disambig.mouseover(function (event){
                            $(this).addClass('ddg_selected');
                        }).mouseout(function (event){
                            $(this).removeClass('ddg_selected');
                        });
                    }
                    
                    var icon_disambig = $('<div>', {class: 'icon_disambig'});
                    if (topics[j]['Icon']['URL'])
                        icon_disambig.append($('<img>', {src: topics[j]['Icon']['URL']}))

                    tmp = $('<div>', {class: 'wrapper'})
                                .append(icon_disambig)
                                .append(disambig);

                    output.push(tmp);

                }

               var name = res['RelatedTopics'][i]['Name'];

               var disambig_more = $('<div>', {class: 'disambig_more'})
                        .append($('<a>')
                            .text(name  + ' ('+ topics.length + ')')
                            .click(function (event){
                                
                                $(this).parent().next().show();
                                $(this).hide();
                                $(this).next().show();

                            }))
                        .click(function (event){

                            $(this).children().hide();
                            $(this).children().next().show();
                            $(this).next().show();
                            
                            $(this).removeClass('ddg_selected');
                            $(this).unbind('mouseover');
                            
                        })
                        .append($('<div>')
                                        .text(name)
                                        .append($('<hr>'))
                                        .hide()
                        );

                if (this.hover) {
                    disambig_more.mouseover(function (event){
                            $(this).addClass('ddg_selected');
                        }).mouseout(function (event){
                            $(this).removeClass('ddg_selected');
                        });
                }


                others.push(disambig_more);

                var hidden_results = $('<div>', {style: 'display:none;padding-left:0px;'});
                if (this.hover)
                    hidden_results.css('margin-left', '-1px');


                for (var z = 0; z < output.length; z++){
                    hidden_results.append( output[z] )
                };

                others.push(hidden_results);
                
                continue;
            }

            var icon_disambig = $('<div>', {class: 'icon_disambig'});

            if (res['RelatedTopics'][i]['Icon']['URL']) {
                icon_disambig.append($('<img>', {src: res['RelatedTopics'][i]['Icon']['URL']}));
            }

                                
            tmp = $('<div>', {class: 'wrapper'})
                    .append(icon_disambig)
                    .append(this.makeDisambig(res['RelatedTopics'][i]['Result']));

            if (this.hover) {
                tmp.find('div:nth-child(2)').mouseover(function (event){
                    $(this).addClass('ddg_selected');
                }).mouseout(function (event){
                    $(this).removeClass('ddg_selected'); 
                });
            }

            
            if (i <= 2) {
                disambigs.push(tmp);
            } else {
                hidden_disambigs.push(tmp);
                nhidden++;
            }
        }
        
        
        result = this.createResultDiv();
        result.append(this.createHeader('Meanings of ' + res['Heading'], query));
        
        var abst = $('<div>', {
            id: 'ddg_zeroclick_abstract',
        });

        for (var i = 0; i < disambigs.length; i++){
            abst.append( disambigs[i] );
        };


        // hidden disambigs
        if (hidden_disambigs.length > 0) {

            tmp = $('<div>', {class: 'disambig_more'})
                    .append($('<a>').click(function (event){
                        $(this).parent().hide();
                        $(this).parent().next().show();
                    }).text('More (' + nhidden + ')'))
                      .click(function (event){
                                $(this).removeClass('ddg_selected');

                                $(this).hide();
                                $(this).next().show();
                            });
            
            if (this.hover) {
                tmp.mouseover(function (event){
                    $(this).addClass('ddg_selected');
                }).mouseout(function (event){
                    $(this).removeClass('ddg_selected');
                });
            }

            abst.append(tmp);
        
            tmp = $('<div>', {style: 'display:none;padding-left:0px;'});
            if (this.hover)
                tmp.css('margin-left', '-1px');

            for (var i = 0; i < hidden_disambigs.length; i++){
                tmp.append( hidden_disambigs[i] );
            };

            abst.append(tmp);


        }

        for (var i = 0; i < others.length; i++) {
            abst.append( others[i] );
        };
        

        abst.append($('<div>', {class: 'clear'}));

        result.append(abst);
        
        if (this.debug)
            console.log('result', result);

        if(this.resultsLoaded()) {
            this.updateResultDiv(result);
        } else {
            var $this = this;
            setTimeout(function (){
                $this.displayDisambiguation(res, query);
            }, 200);
        }

    },

    displayCategory: function (res, query) {
        var result = [];
        
        var categories = []; 
        var hidden_categories = [];
        var nhidden = 0;

        for (var i = 0; i < res['RelatedTopics'].length; i++){
            if (res['RelatedTopics'].length === 0)
                break;
            
            if (this.debug)
                console.log(res['RelatedTopics'][i]['Result']);
            
            var icon_category = $('<div>', {class: 'icon_category'});

            if (res['RelatedTopics'][i]['Icon']['URL']) {
                icon_category.append($('<img>', {src: res['RelatedTopics'][i]['Icon']['URL']}))
            }

            var category_item = this.makeCategoryItem(res['RelatedTopics'][i]['Result']);
            var category = $('<div>', {class: 'wrapper'})
                .append(icon_category)
                .append(category_item);



            if (this.hover) {
                category.mouseover(function(event){
                    $(this).addClass('ddg_selected');
                }).mouseout(function(event){
                    $(this).removeClass('ddg_selected');
                }).click(function(event){
                    window.location.href = $(this).children(':last').children().attr('href');
                });
 
            }

            if (i <= 2) {
                categories.push(category);
            } else {
                hidden_categories.push(category);
                nhidden++;
            }
        }

        result = this.createResultDiv();
        result.append(this.createHeader(res['Heading'], query));
        
        var abst = $('<div>', {
            id: 'ddg_zeroclick_abstract',
        });

        for (var i = 0; i < categories.length; i++){
            abst.append( categories[i] );
        };

        tmp = $('<div>', {class: 'category_more'})
                .append($('<a>', {href: 'javascript:;'})
                            .click(function(event){
                                $(this).parent().hide();
                                $(this).parent().next().show();
                            })
                            .text('More (' + nhidden + ')'));

        if (this.hover) {
            tmp.mouseover(function(event){
                $(this).addClass('ddg_selected');
            }).mouseout(function(event){
                $(this).removeClass('ddg_selected');
            }).click(function(event){

                $(this).hide();
                $(this).next().show();

                $(this).removeClass('ddg_selected');
                $(this).unbind('mouseover');
            });
        }

        abst.append(tmp);

        tmp = $('<div>', {style: 'display:none;padding-left:0px;'});
        if (this.hover)
            tmp.css('margin-left', '-1px');

        for (var i = 0; i < hidden_categories.length; i++){
            tmp.append( hidden_categories[i] );
        };

        abst.append(tmp)

        result.append(abst);

        if (this.debug)
            console.log(result);

        if(this.resultsLoaded()) {
            
            this.updateResultDiv(result);

        } else {
            var $this = this;
            setTimeout(function (){
                $this.displayCategory(res, query);
            }, 200);
        }

    }
};

