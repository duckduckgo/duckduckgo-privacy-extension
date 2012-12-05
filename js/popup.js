
window.onload = function() {
    document.getElementById('search_form_input_homepage').focus();

    document.getElementById('search_form_homepage').onsubmit = search;

    var prefill_text = 'Search DuckDuckGo...';

    if (localStorage['meanings'] == undefined) {
      localStorage['meanings'] = 'true';
    }

    if (localStorage['advanced_options'] == undefined){
      localStorage['advanced_options'] = 'true';
    }

    if (localStorage['zeroclickinfo'] == undefined) {
      localStorage['zeroclickinfo'] = 'true';
    }


    document.getElementById('adv_ducky').onclick = ducky_check;
    document.getElementById('adv_meanings').onclick = meanings_check;
    document.getElementById('adv_zeroclick').onclick = zeroclickinfo_check;

    document.getElementById('bang_gi').onclick = function(){
      add_bang('!gi');
    }
    document.getElementById('bang_w').onclick = function(){
      add_bang('!w');
    }
    document.getElementById('bang_bi').onclick = function(){
      add_bang('!bi');
    }
    document.getElementById('bang_a').onclick = function(){
      add_bang('!a');
    }
    document.getElementById('bang_n').onclick = function(){
      add_bang('!n');
    }
    document.getElementById('bang_yt').onclick = function(){
      add_bang('!yt');
    }
    document.getElementById('bang_m').onclick = function(){
      add_bang('!m');
    }


    defaults_check();

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse){
      defaults_check();
    });


    if (localStorage['advanced_options'] !== 'true') {
      document.getElementById('icon_advanced').src = 
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2Fy" +
         "ZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAA"+
         "AAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5U"+
         "Y3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6"+
         "eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8x"+
         "Mi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRw"+
         "Oi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpE"+
         "ZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRv"+
         "YmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNv"+
         "bS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20v"+
         "eGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRv"+
         "YmUgUGhvdG9zaG9wIENTNS4xIE1hY2ludG9zaCIgeG1wTU06SW5zdGFuY2VJRD0i"+
         "eG1wLmlpZDpDODg3RTNERjk2MjkxMUUxQkVFREZENjcyMkRDQkQxOSIgeG1wTU06"+
         "RG9jdW1lbnRJRD0ieG1wLmRpZDpDODg3RTNFMDk2MjkxMUUxQkVFREZENjcyMkRD"+
         "QkQxOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAu"+
         "aWlkOkM4ODdFM0REOTYyOTExRTFCRUVERkQ2NzIyRENCRDE5IiBzdFJlZjpkb2N1"+
         "bWVudElEPSJ4bXAuZGlkOkM4ODdFM0RFOTYyOTExRTFCRUVERkQ2NzIyRENCRDE5"+
         "Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8"+
         "P3hwYWNrZXQgZW5kPSJyIj8+Bg9l7AAAAiZJREFUeNpi7OrqY6AElJYWovCZ8Kj1"+
         "AOL5QHwGiP8D8R8oeyYQO+HSxIJFTAVkEBcXpw0PDy8DGxsbAzs7O8P///+Zf/36"+
         "Zfzz50/jL1++pH3//n03UF0KED/C50InNjbWi9LS0jaSklIMvLy8YMNAgJGREczm"+
         "4+NjkJKSAmJJV1ZW1nPd3f1muAzU4ubm3iQjI8vFwcFBMOw4ObkYgBYLA32yA2io"+
         "HIaB3NxcS8XExLhBLkEHQUF+YIwOmJmZGcTExAU5OTnnw8QYobHsLSMjvYWdHbvL"+
         "7t69C7ZFWVn5Pzb5b9++MTx//twWGONHwC6UkpIowWUYMYCLi4tBQkK8GO5lFhZW"+
         "MwYKATDC7OHJhomJmQs9zJABMNCxiq9btwk5PPnhBgKjn+Hfv3/IBjBicwW6OHKY"+
         "AtMrI9zLQA56YP9Hw4TEQWb8hbtQQID/24sXP7iRbEaPZaziyICfn/8j3IXCwkLn"+
         "KI0UMTGRI3AD1dVV+4WEBMk2TFxcjEFJSbEfbiAwsNfr6WlfAEUODoARZojkwsag"+
         "ra15EMg8iJL1hISEos3MjL+ysGAWQKCwwxZ+oJLI3Nz0AzAOEjHyMtCV14BO93Nw"+
         "sPlGjPdFRUUYHBxsP4iICHsBuffR8zJyCawFpOa8fPnK8smTpwwfPnxi+PgRHIHA"+
         "1CDAICjIzwDM9yAD90HLw/vI+hlxVQFAg0EldjgQG0AxCJyF4pVAH+3DVgUABBgA"+
         "ktWRIZgIcFYAAAAASUVORK5CYII=";
      document.getElementById('advanced').style.display = 'none';
      document.getElementById('icon_advanced').className = 'minimized';
    }


    setTimeout(function(){
      document.getElementById("search_form_input_homepage").focus();               
      document.getElementById("search_form_input_homepage").onkeydown = function(){
        this.style.color = '#000000';
      };               
      document.getElementById("search_form_input_homepage").onkeyup = function(){
        if (this.value == '') {
          this.style.color = '#999999';
        }
      };               
    }, 300);


    function search(){
      var input = document.getElementById("search_form_input_homepage").value;
      
      if (document.getElementById('adv_ducky').checked === true) {
        input = "\\" + input;
      }

      var special = '';
      if(document.getElementById('adv_meanings').checked !== true) {
        special = '&d=1'; 
      }

      chrome.tabs.create({
        url: "https://duckduckgo.com/?q="+encodeURIComponent(input)+special
      });
    }

    document.getElementById('icon_advanced').onclick = function(){
      if (this.className == 'minimized') {
        this.src =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2Fy" +
           "ZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAA"+ 
           "AAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5U"+
           "Y3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6"+
           "eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8x"+
           "Mi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRw"+
           "Oi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpE"+
           "ZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRv"+
           "YmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNv"+
           "bS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20v"+
           "eGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRv"+
           "YmUgUGhvdG9zaG9wIENTNS4xIE1hY2ludG9zaCIgeG1wTU06SW5zdGFuY2VJRD0i"+
           "eG1wLmlpZDpDODg3RTNEQjk2MjkxMUUxQkVFREZENjcyMkRDQkQxOSIgeG1wTU06"+
           "RG9jdW1lbnRJRD0ieG1wLmRpZDpDODg3RTNEQzk2MjkxMUUxQkVFREZENjcyMkRD"+
           "QkQxOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAu"+
           "aWlkOkM4ODdFM0Q5OTYyOTExRTFCRUVERkQ2NzIyRENCRDE5IiBzdFJlZjpkb2N1"+
           "bWVudElEPSJ4bXAuZGlkOkM4ODdFM0RBOTYyOTExRTFCRUVERkQ2NzIyRENCRDE5"+
           "Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8"+
           "P3hwYWNrZXQgZW5kPSJyIj8+9xDTMAAAAhVJREFUeNpi7OrqY6AElJYWovBZ8KhV"+
           "BOIoIHYFYh6o2Ecg3g3Ei4H4KTZN2AwUAuIuVlaWBB4eXmZOTk4GJiYmsMS/f/8Y"+
           "vn//5vT58+eWP3/+zgIKlQHxF2TNjGheVmRhYd4rKCikyMvLy8DIyIjV6f///2f4"+
           "/PkTw7t3767+/fvPF+jt+zA5JiR1/Bwc7PulpKQV+fj4cBoGdgVQjo+PnwGoVhuo"+
           "Z3t3dz8/hoFsbGyTxcTE5VlZWYmOEKAeBlFRMXV2drZedAPVBQQEYkgxDNlQAQH+"+
           "RKArpeEGiouLpvHw8DCSm3S4uXmZBAUF0uAGcnBw+uMLM0IApJefXyAUnmyAzpb8"+
           "9+8/XEFQkB9RBq1btwnOBgaXDNxAYJpj+fnzN1wSGB5EOVdZWfk/koGsSF7m+IOe"+
           "1IjEcMDJyfEb7kJgQn7+8eNnZSSbSQ5HISHBx3AXiomJbKQkUkBZU0pKciXcQBkZ"+
           "6Vny8rL/yTVQQUHur5iY6Fy4gcBIuKmpqb6Ql5eHZMNA2VRDQ30OrPRhQgQqZ4GF"+
           "hek9UgwFGWZpaXoDmJ9LMPIy0JUfgSWMi4OD7W0lJQW8hQMozJSVFRns7a2vcnNz"+
           "uyAXYejFF6gEBjmx69u372mPHz9hfvfuPbAM/AGW4+LiZBAWFgKGudRvoI9mAoUq"+
           "CZWHyAbLQUtsSyCWhgo/AuIjQLwS6KOn2KoAgAADAOuniZmdabpzAAAAAElFTkSu"+
           "QmCC";
        document.getElementById('advanced').style.display = 'block';
        this.className = 'maximized';
      } else {
        this.src = 
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2Fy" +
           "ZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAA"+
           "AAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5U"+
           "Y3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6"+
           "eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8x"+
           "Mi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRw"+
           "Oi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpE"+
           "ZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRv"+
           "YmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNv"+
           "bS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20v"+
           "eGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRv"+
           "YmUgUGhvdG9zaG9wIENTNS4xIE1hY2ludG9zaCIgeG1wTU06SW5zdGFuY2VJRD0i"+
           "eG1wLmlpZDpDODg3RTNERjk2MjkxMUUxQkVFREZENjcyMkRDQkQxOSIgeG1wTU06"+
           "RG9jdW1lbnRJRD0ieG1wLmRpZDpDODg3RTNFMDk2MjkxMUUxQkVFREZENjcyMkRD"+
           "QkQxOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAu"+
           "aWlkOkM4ODdFM0REOTYyOTExRTFCRUVERkQ2NzIyRENCRDE5IiBzdFJlZjpkb2N1"+
           "bWVudElEPSJ4bXAuZGlkOkM4ODdFM0RFOTYyOTExRTFCRUVERkQ2NzIyRENCRDE5"+
           "Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8"+
           "P3hwYWNrZXQgZW5kPSJyIj8+Bg9l7AAAAiZJREFUeNpi7OrqY6AElJYWovCZ8Kj1"+
           "AOL5QHwGiP8D8R8oeyYQO+HSxIJFTAVkEBcXpw0PDy8DGxsbAzs7O8P///+Zf/36"+
           "Zfzz50/jL1++pH3//n03UF0KED/C50InNjbWi9LS0jaSklIMvLy8YMNAgJGREczm"+
           "4+NjkJKSAmJJV1ZW1nPd3f1muAzU4ubm3iQjI8vFwcFBMOw4ObkYgBYLA32yA2io"+
           "HIaB3NxcS8XExLhBLkEHQUF+YIwOmJmZGcTExAU5OTnnw8QYobHsLSMjvYWdHbvL"+
           "7t69C7ZFWVn5Pzb5b9++MTx//twWGONHwC6UkpIowWUYMYCLi4tBQkK8GO5lFhZW"+
           "MwYKATDC7OHJhomJmQs9zJABMNCxiq9btwk5PPnhBgKjn+Hfv3/IBjBicwW6OHKY"+
           "AtMrI9zLQA56YP9Hw4TEQWb8hbtQQID/24sXP7iRbEaPZaziyICfn/8j3IXCwkLn"+
           "KI0UMTGRI3AD1dVV+4WEBMk2TFxcjEFJSbEfbiAwsNfr6WlfAEUODoARZojkwsag"+
           "ra15EMg8iJL1hISEos3MjL+ysGAWQKCwwxZ+oJLI3Nz0AzAOEjHyMtCV14BO93Nw"+
           "sPlGjPdFRUUYHBxsP4iICHsBuffR8zJyCawFpOa8fPnK8smTpwwfPnxi+PgRHIHA"+
           "1CDAICjIzwDM9yAD90HLw/vI+hlxVQFAg0EldjgQG0AxCJyF4pVAH+3DVgUABBgA"+
           "ktWRIZgIcFYAAAAASUVORK5CYII=";
        document.getElementById('advanced').style.display = 'none';
        this.className = 'minimized';
      }
      localStorage['advanced_options'] = (document.getElementById('advanced').style.display === 'block');
      document.getElementById('search_form_input_homepage').focus();
    }

    function add_bang(bang) {
      var inp = document.getElementById('search_form_input_homepage');
      if (inp.value === prefill_text || inp.value === '') {
        inp.style.color = '#000';
        inp.value = bang + ' ';
        inp.focus();
      } else {
        inp.value += bang;
        search();
      }
    }

    function ducky_check(){
      localStorage['ducky'] = document.getElementById('adv_ducky').checked;
    }

    function meanings_check(){
      localStorage['meanings'] = document.getElementById('adv_meanings').checked;
    }

    function zeroclickinfo_check(){
      localStorage['zeroclickinfo'] = document.getElementById('adv_zeroclick').checked;
    }

    function defaults_check(){
      if (localStorage['ducky'] === 'true') {
        document.getElementById('adv_ducky').checked = true;  
      }

      if (localStorage['meanings'] === 'true') {
        document.getElementById('adv_meanings').checked = true;  
      }

      if (localStorage['zeroclickinfo'] === 'true') {
        document.getElementById('adv_zeroclick').checked = true;  
      }

    }


}

