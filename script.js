
var req;

search();

document.getElementsByName("q")[0].onkeyup = search;

function search()
{
    var query = document.getElementsByName("q")[0].value;
    loadZeroClick(query);
}

function loadZeroClick(query) 
{
    req = new XMLHttpRequest();
    req.open('GET', 'http://api.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json', true);
    req.onload = renderZeroClick;
    req.send();
}

function renderZeroClick() 
{
    if (req.readyState != 4)  { return; } 
    var res = JSON.parse(req.responseText);

    if(res['AnswerType'] !== "") {
        displayAnswer(res['Answer']);
    } else {     
        switch (res['Type']){
            case 'E':
                displayAnswer(res['Answer']);
                break;

            case 'A':
                displayAnswer(res['Answer']);
                break;
 
            default:
               break;
                    
        } 
    }
}

function createResultDiv()
{
    var result = document.getElementById("center_col");
    var ddg_result = document.getElementById("ddg_zeroclick");
    if (ddg_result === null) {
        result.innerHTML = '<div id="ddg_zeroclick"></div>' + result.innerHTML;
        ddg_result = document.getElementById("ddg_zeroclick");
    }
    return ddg_result;
}

function displayAnswer(answer)
{
    var ddg_result = createResultDiv();
    ddg_result.className += " ddg_answer";
    ddg_result.innerHTML = answer;
}

