// Extension settings
var appSettings = ({
    extensionOn : true,
    startOn: true,
    NotificationPos: 'bottom',
    scrollOn: true,
    historyOn: true,
    tabOn: true,
    refreshOn: true,
    zoomOn: true,
    scrollSpeed: 1,
    scrollStep: {
        x: 5,
        y: 5
    },
});

// Variable declarations
var leap_status;
var tab_has_focus;
var lastFramePos = ({x: 0, y: 0});
var curFramePos = ({x: 0, y: 0});
var scrollLevel = ({x: 0, y: 0});
var curScrollLevel = ({x: 0, y: 0});
var refresh_threshold = 0;
var isScrolling;
var action;
var connection;
// TODO: add this to settings
var connectionTimeOut = 5;
var lastCheckTime = new Date().getTime() / 1000;
var TimeLost;
var ConnectionLost = false;

// image locations
var scrollImage = chrome.extension.getURL("images/scroll.png");
var zoomImage = chrome.extension.getURL("images/zoom.png");
var refreshImage = chrome.extension.getURL("images/refresh.png");

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// call GetSettings to fetch stored settings
GetSettings();

// add DOM element
AddDOMElement();

// popup message handler to connect/disconnect
MessagingHandler();

// event listener for scroll
//TODO: add all events to one function with action selection
document.addEventListener("scroll", function(e) {
    UpdateStatusImage();
    // Clear our timeout throughout the scroll
    window.clearTimeout( isScrolling );
    // Set a timeout to run after scrolling ends
    isScrolling = setTimeout(function() {
        // Run the callback
        console.log( 'Scrolling has stopped.' );
        FadeStatusImg(false);
    }, 300);
}, false);

// Check if Current Tab has Focus, and only run this extension on the active tab
setInterval(check_focus, 1000);
function check_focus() {
    try {
        chrome.runtime.sendMessage({ tab_status: 'current' }, function(response) {
            if(response.active && window.location.href == response.url && document.hasFocus()) {
                tab_has_focus = true;
            }
            else {
                tab_has_focus = false;
            }
        });
    }
    catch(error) {
        // If you clicked to reload this extension, you will get this error, which a refresh fixes
        if(error.message.indexOf('Error connecting to extension') !== -1) {
            document.location.reload(true);
        }
        // Something else went wrong
        else {
            console.error(error.message);
        }
    }
}

// check connection of leap device
connection = setInterval(CheckConnection, 1000);
function CheckConnection() {
    var currentTime = new Date().getTime() / 1000;
    if(currentTime - lastCheckTime > connectionTimeOut && !ConnectionLost) {
        clearInterval(connection);
        console.log("connection lost!");
        StatusMessage("Connection to device have been lost!", 'error');
        ConnectionLost = true;
        //TODO: use timeLost to implement a second notification after another period of time
        TimeLost = currentTime;
    }
}

// popup button connect/disconnect handler
function MessagingHandler() {
    try {
        chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
            console.log("onMessage data: " + JSON.stringify(request) + " " +
                JSON.stringify(sender) + " " + JSON.stringify(sendResponse));
            // disconnect command from popup button
            if (request.popUpAction === 'disconnect') {
                controller.disconnect();
                sendResponse({leap_status: leap_status});
            }
            // connect command from popup button
            else if (request.popUpAction === 'connect') {
                controller.connect();
                sendResponse({leap_status: leap_status});
            }

            return true;
        });
    } catch(error) {
        console.error(error.message);
    }


}

// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {
    // save current time of successful frame data fetch from device
    lastCheckTime = new Date().getTime() / 1000;
    ConnectionLost = false;

    // if current tab doesn't have focus or the leap is disconnected exit loop
    if(!tab_has_focus) {
            return;
    }

    // draw marker position on screen
    ScrollPage(frame);
    navigate_history(frame);
    ZoomMarker(frame);
});

// TODO: remove this test code below
window.onkeypress = function(e) {
    console.log("attempt zoom 1");
    // if (e.charCode == 65) { // Space bar
    //     console.log("attempt zoom 1");
    var frame = 1;
        ZoomMarker(frame);
    // }
}
// navigate the history back and forward
function navigate_history(frame) {
	if (frame.gestures.length > 0) {
		loop: for (var i = 0; i < frame.gestures.length; i++) {
			var gesture = frame.gestures[i];
			if(gesture.type == "swipe") {
				//Classify swipe as either horizontal or vertical
				var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
				//Classify as right-left or up-down
				if(isHorizontal){
					if(gesture.direction[0] > 0){
						history.forward();
						console.log('Next Page');
						continue loop;
					} else {
						history.back();
						console.log('Previous Page');
						continue loop;
					}
				}
			}
		}
	}
}

// scroll function
function ScrollPage(frame) {

    if (frame.pointables.length > 0) {
        var position = frame.pointables[0].stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);
        curFramePos.x = window.innerWidth * normalized[0];
        curFramePos.y = window.innerHeight * (1 - normalized[1]);
        // TODO: check if hand lost or not before taking the last and current frame difference to scroll
        // TODO: add scroll speed for x and y
        // Vertical
        if(Math.abs((lastFramePos.y - curFramePos.y) / 30) > 2) {
            scrollLevel.y = - (lastFramePos.y - curFramePos.y) * ( ( getScrollMax("y") * appSettings.scrollStep.y * appSettings.scrollSpeed) / 10000);
            window.scrollBy(0, curScrollLevel.y + scrollLevel.y);
            lastFramePos.y = curFramePos.y;
            if(curScrollLevel.y + scrollLevel.y < getScrollMax("y"))
                curScrollLevel.y += scrollLevel.y;
            else
                curScrollLevel.y = getScrollMax("y")

            // logs
            console.log("hand change level Y: " + scrollLevel.y);
            console.log("scroll change Y" + -(lastFramePos.y - curFramePos.y));
        }

		// Horizontal
        if(Math.abs((lastFramePos.x - curFramePos.x) / 30) > 2) {
            scrollLevel.x = - (lastFramePos.x - curFramePos.y) * ( ( getScrollMax("x") * appSettings.scrollStep.x * appSettings.scrollSpeed) / 10000);
            window.scrollBy(curScrollLevel.x + scrollLevel.x, 0);
            lastFramePos.x = curFramePos.x;
            if(curScrollLevel.x + scrollLevel.x < getScrollMax("x"))
                curScrollLevel.x += scrollLevel.x;
            else
                curScrollLevel.x = getScrollMax("x")

            // logs
            console.log("hand change level X: " + scrollLevel.y);
            console.log("scroll change X: " + -(lastFramePos.y - curFramePos.y));
        }
    }
}

// get value of max scroll possible on the current page
function getScrollMax(axis){
    if (axis == "y")
        return ( 'scrollMaxY' in window ) ? window.scrollMaxY :
            (document.documentElement.scrollHeight - document.documentElement.clientHeight);
    if (axis == "x")
        return ( 'scrollMaxX' in window ) ? window.scrollMaxX :
            (document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// function called to change the icon of status placeholder
function UpdateStatusImage() {
    // check which image to use according to current action
    if(isScrolling) {
        var imgURL = scrollImage;
        console.log("scroll icon shown");
    }

    // assign image
    document.getElementById("status-image").src = imgURL;
    FadeStatusImg(true);
}

// Show a message notification of status
function StatusMessage(message, color) {
    if (color === 'error')
        $("#leap-notification").css({'background-color': '#ff6519'});
    else if (color === 'info')
        $("#leap-notification").css({'background-color': '#3aff31'});
    $("#leap-notification").fadeIn("slow").append(message);
    $("#leap-notification").fadeTo(3000, 500).fadeOut("slow");
}

// Zoom function
function ZoomMarker(frame) {

    //var hands = frame.hands[0];
    var hands = 1000;
    //if(frame.hands.length > 0) // zoom the page by transforming css.

    $('html').css({
        'transform': 'scale(' + hands._scaleFactor + ') translateZ(0)',
        '-webkit-transform': 'scale(' + hands._scaleFactor + ') translateZ(0)',
        'transformation-origin': 'center center'
    });
}

// get saved settings to use on runtime
function GetSettings() {
    chrome.storage.sync.get(['extensionOn', 'startOn', 'errorPos', 'scrollOn',
        'historyOn', 'tabOn', 'refreshOn', 'zoomOn', 'scrollSpeed', 'scrollStep'], function (items) {
        appSettings = items;
    });
}

function FadeStatusImg(state) {
    // TODO: fix this to fadeout only when scroll is stopped
    // it is not stopping like the actions are in a queue.
    if(state)
        $("#status-placeholder").show();
    //$("#status-placeholder").fadeIn("slow");
    else
        $("#status-placeholder").fadeOut("slow");
}

// add the status icon placeholder to the DOM of the page
function AddDOMElement() {
    // DOM for status image
    console.log("Add status image DOM");
    $('body').append('<div id="status-placeholder" style="display: none;">' +
        '<img id="status-image" src="" alt="scrolling" width="128" height="128"/></div>');

    // DOM for Connection status on top of page
    console.log("Add status top message DOM");
    window.onload = function () {
        var StatusAppendPos;
        if(document.querySelectorAll('header').length > 0)
            StatusAppendPos = 'header';
        else
            StatusAppendPos = 'body';
        $(StatusAppendPos).append('<div id="leap-notification" style="display: none"></div>');
    }
}

// hide DOM elements
function ShowDOMs(state) {
    if (state) {
        $("#leap-notification").hide();
        $("status-placeholder").hide();
    }
    else {
        $("#leap-notification").show();
        $("status-placeholder").show();
    }

}

//Refresh function that currently has the best accuracy.
controller.on('gesture', function(gesture) {
	if (gesture.type = 'circle' && refresh_threshold >= 10) {
		location.reload()
		console.log(gesture.id)}
	else {
		refresh_threshold++;
	}
});

controller.on('ready', function() {
    console.log("LeapJS v" + Leap.version.full);
    console.log("ready. Service version: " + controller.connection.protocol.serviceVersion);
});
controller.on('connect', function() {
    console.log("connected with protocol v" + controller.connection.opts.requestProtocolVersion);
    leap_status = 'connected';
    chrome.storage.sync.set({leap_status: 'connected'});
});
controller.on('disconnect', function() {
    console.log("disconnect");
    leap_status = 'disconnected';
    chrome.storage.sync.set({leap_status: 'disconnected'});
});

controller.on('focus', function() {
    console.log("focus");
});
controller.on('blur', function() {
    console.log("blur");
});

controller.on('deviceAttached', function(deviceInfo) {
    console.log("deviceAttached", deviceInfo);
});
controller.on('deviceRemoved', function(deviceInfo) {
    console.log("deviceRemoved", deviceInfo);
});
controller.on('deviceStreaming', function(deviceInfo) {
    console.log("deviceStreaming", deviceInfo);
});
controller.on('deviceStopped', function(deviceInfo) {

    console.log("deviceStopped", deviceInfo);
});
controller.on('streamingStarted', function(deviceInfo) {
    console.log("streamingStarted", deviceInfo);
});
controller.on('streamingStopped', function(deviceInfo) {
    console.log("streamingStopped", deviceInfo);
});
