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

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// call GetSettings to fetch stored settings
GetSettings();

// add DOM element
AddDOMElement();

// popup message handler to connect/disconnect
PopUpMessageHandler();

// event listener for scroll
document.addEventListener("scroll", function(e) {
    ScrollStatus();
});

// event listener for zoom in and out
$(window).resize(function() {
    if(screen.width == window.innerWidth){
        console.log("Normal");
    }        
    else if(screen.width > window.innerWidth){
        Zoom_in_Status();
    } 
    
    else {
        Zoom_out_Status();
    }
});

setInterval(check_focus, 1000);

// Check if Current Tab has Focus, and only run this extension on the active tab
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

// popup button connect/disconnect handler
function PopUpMessageHandler() {
    try {
        console.log("trying to catch that message!");
        chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
            console.log("onMessage data: " + JSON.stringify(request) + " " +
                JSON.stringify(sender) + " " + JSON.stringify(sendResponse));
            if (request.popUpAction === 'disconnect') {
                controller.disconnect();
                sendResponse({leap_status: leap_status});
            }
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

    // draw marker position on screen
    ScrollPage(frame);
    navigate_history(frame);
});

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
                curScrollLevel.x = getScrollMax("x");

            // logs
            console.log("hand change level X: " + scrollLevel.y);
            console.log("scroll change X: " + -(lastFramePos.y - curFramePos.y));
        }
    }
}

function getScrollMax(axis){
    if (axis == "y")
        return ( 'scrollMaxY' in window ) ? window.scrollMaxY :
            (document.documentElement.scrollHeight - document.documentElement.clientHeight);
    if (axis == "x")
        return ( 'scrollMaxX' in window ) ? window.scrollMaxX :
            (document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// function called to change the icon of status placeholder
function ScrollStatus() {

    var imgURL = chrome.extension.getURL("images/scroll.png");
    document.getElementById("status-image").src = imgURL;
    console.log("scroll icon shown");
    $("#status-placeholder").css( {'padding':'12px 14px 12px 14px',
        'display':'inline',
        'position':'fixed',
        'bottom':'13px',
        'right':'1px',
        'z-index':'90'
    }).fadeOut("slow");
}

//function called for the zoom in and zoom out status
function Zoom_in_Status(){

    var ZoomImage = chrome.extension.getURL("images/zoom_in.gif");
    document.getElementById("status-image").src = ZoomImage;
    console.log("Zoom Icon show");
    $("#status-placeholder").css( {'padding':'12px 14px 12px 14px',
        'display':'inline',
        'position':'fixed',
        'bottom':'13px',
        'right':'1px',
        'z-index':'90'
    }).fadeOut("slow");
}

function Zoom_out_Status(){

    var Zoom_out_Image = chrome.extension.getURL("images/zoom_out.gif");
    document.getElementById("status-image").src = Zoom_out_Image;
    console.log("Zoom out show");
    $("#status-placeholder").css( {'padding':'12px 14px 12px 14px',
        'display':'inline',
        'position':'fixed',
        'bottom':'13px',
        'right':'1px',
        'z-index':'90'
    }).fadeOut("slow");
}

// get saved settings to use on runtime
function GetSettings() {
    chrome.storage.sync.get(['extensionOn', 'startOn', 'errorPos', 'scrollOn',
        'historyOn', 'tabOn', 'refreshOn', 'zoomOn', 'scrollSpeed', 'scrollStep'], function (items) {
        appSettings = items;
    });
}

// add the status icon placeholder to the DOM of the page
function AddDOMElement() {
    console.log("DOM element added.");
    $('body').append('<div id="status-placeholder" style="display: none;"><img id="status-image" src="" alt="scrolling" \
    />');
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
