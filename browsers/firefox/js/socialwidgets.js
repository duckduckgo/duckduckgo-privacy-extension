    
  //var bg = chrome.extension.getBackgroundPage();
  
  function replaceAllButtons() {
        var key;
        for (key in socialwidgets) {
            replaceIndividualButton(key);
        }
    }

    function replaceIndividualButton(key) {
        tracker = socialwidgets[key];
        var buttonSelectorsString = tracker.buttonSelectors.toString();
        var buttonsToReplace =
        document.querySelectorAll(buttonSelectorsString);
        
        for (var i = 0; i < buttonsToReplace.length; i++) {
            var buttonToReplace = buttonsToReplace[i];
            
            var button =
            createReplacementButtonImage(key, buttonToReplace);
            
            buttonToReplace.parentNode.replaceChild(button, buttonToReplace);
        }
    }
    
    function createReplacementButtonImage(key, trackerElem) {
        tracker = socialwidgets[key];
        var buttonData = tracker.replacementButton;
        
        var button = document.createElement("img");
        
        var buttonUrl = getReplacementButtonUrl(buttonData.imagePath);
        var buttonType = buttonData.type;
        var details = buttonData.details;
        
        button.setAttribute("src", buttonUrl);
        button.setAttribute("class", "DDGReplacementButton");
        button.setAttribute("title", "DuckDuckGo has replaced this " +
                            key + " button");
        
        switch (buttonType) {
            case 0: // normal button type; just open a new window when clicked
                var popupUrl = details + encodeURIComponent(window.location.href);
                
                button.addEventListener("click", function() {
                                        window.open(popupUrl);
                                        });
                
                break;
                
            case 1: // in place button type; replace the existing button with an
                // iframe when clicked
                var iframeUrl = details + encodeURIComponent(window.location.href);
                
                button.addEventListener("click", function() {
                                        // for some reason, the callback function can execute more than
                                        // once when the user clicks on a replacement button
                                        // (it executes for the buttons that have been previously
                                        // clicked as well)
                                        replaceButtonWithIframeAndUnblockTracker(button, buttonData.unblockDomains, iframeUrl);
                                        });
                
                break;
                
            default:
                throw "Invalid button type specified: " + buttonType;
        }
        
        return button;
    }
    
    function getReplacementButtonUrl(replacementButtonLocation) {
        return chrome.extension.getURL("../img/" + replacementButtonLocation);
    }
    
    function replaceButtonWithIframeAndUnblockTracker(button, tracker, iframeUrl) {
      unblockTracker(tracker, function() {
        if (button.parentNode !== null) {
            
            
            var iframe = document.createElement("iframe");
            
            iframe.setAttribute("src", iframeUrl);
            iframe.setAttribute("class", "ddgOriginalButton");
            
            button.parentNode.replaceChild(iframe, button);

        }
      });
    }

    function unblockTracker(tracker, callback) {
        var request = {
            "whitelist": tracker
        };
        
        chrome.runtime.sendMessage(request, callback);
    }
    
    var socialwidgets = {
        "FacebookLike": {
            "domain": "www.facebook.com",
            "buttonSelectors": [
                                "fb\\:like",
                                "iframe[src*='://www.facebook.com/plugins/like.php']",
                                "iframe[src*='://www.facebook.com/v2.0/plugins/like.php']",
                                ".fb-like"
                                ],
            "replacementButton": {
                "details": "https://www.facebook.com/plugins/like.php?href=",
                "unblockDomains": [
                                   "https://www.facebook.com/plugins/like.php?href=",
                                   "https://www.facebook.com/v2.0/plugins/like.php?href="
                                   ],
                "imagePath": "FacebookLike.svg",
                "type": 1
            }
        },
        
        "FacebookShare": {
            "domain": "www.facebook.com",
            "buttonSelectors": [
                                "fb\\:share_button",
                                "iframe[src*='://www.facebook.com/plugins/share_button.php']",
                                "iframe[src*='://www.facebook.com/v2.0/plugins/share_button.php']",
                                ".fb-share-button"
                                ],
            "replacementButton": {
                "details": "https://www.facebook.com/plugins/share_button.php?href=",
                "unblockDomains": [
                                   "https://www.facebook.com/plugins/share_button.php?href=",
                                   "https://www.facebook.com/v2.0/plugins/share_button.php?href="
                                   ],
                "imagePath": "FacebookShare.svg",
                "type": 1
            }
        },
        
        "Twitter": {
            "domain": "platform.twitter.com",
            "buttonSelectors": [
                                ".twitter-share-button"
                                ],
            "replacementButton": {
                "details": "https://twitter.com/intent/tweet?url=",
                "unblockDomains": [
                                   "https://twitter.com/intent/tweet?url="
                                   ],
                "imagePath": "Twitter.svg",
                "type": 0
            }
        }
    };


    if (localStorage['social'] === 'true') {
        replaceAllButtons();
    }
