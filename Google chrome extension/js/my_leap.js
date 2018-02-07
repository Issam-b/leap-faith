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
    continuousScroll: false,
    scrollThreshold: {
        x: 10,
        y: 10
    },
    scrollStep: {
        x: 10,
        y: 10
    },
});

// Variable declarations
// chrome storage variables
var leap_status;
var newCenter = [0, 0, 0];

// other variables
var tab_has_focus;
var lastFramePos = ({x: 0, y: 0});
var curFramePos = ({x: 0, y: 0});
var scrollValue = ({x: 0, y: 0});
var scrollSpeed = ({
    x: getScrollMax("x") / appSettings.scrollStep.x,
    y: getScrollMax("y") / appSettings.scrollStep.y
});

var isScrolling;
var action;
var connection, messageInterval;
var connectionTimeOut = 5; // TODO: add this to settings
var lastCheckTime = new Date().getTime() / 1000;
var TimeLost;
var ConnectionLost = false;
var runOnce = 0;
var setupConfirm = false, setupDone = false;
var fpsScaleFactor = 20;
var setupModalOpen = false;
var discreteActionDelay = 500;

// image locations
var scrollImage = chrome.extension.getURL("images/scroll.png");
var zoomImage = chrome.extension.getURL("images/zoom.png");
var refreshImage = chrome.extension.getURL("images/refresh.png");

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// call GetSettings to fetch stored settings
//TODO: fix later
//GetSettings();

// add DOM element
AddDOMElement();

// popup message handler to connect/disconnect
MessagingHandler();

// handle the scroll icon display and hide
//TODO: add all events to one function with action selection
function showScroll() {
    UpdateStatusImage('scroll');
    // Clear our timeout throughout the scroll
    window.clearTimeout( isScrolling );
    // Set a timeout to run after scrolling ends
    isScrolling = setTimeout(function() {
        // Run the callback
        // console.log( 'Scrolling has stopped.' );
        FadeStatusImg(false);
    },  fpsScaleFactor * 20);
};

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
        messageInterval = setInterval(StatusMessage("Connection to device have been lost!", 'error'), 5000);
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

var fpsCounter = -1;
// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {
    // console.log("start leap loop");

    // save current time of successful frame data fetch from device
    lastCheckTime = new Date().getTime() / 1000;
    ConnectionLost = false;
    clearInterval(messageInterval);

    // attempt to reduce the fps
    fpsCounter++;
    if(fpsCounter % fpsScaleFactor === 0 && fpsCounter !== 0)
        fpsCounter = -1;

    // if current tab doesn't have focus, the leap is disconnected
    // or scale factor is not met exit loop
    if (!tab_has_focus || fpsCounter % fpsScaleFactor !== 0) {
        return;
    }

    // check frames to decide what gesture and action to do
    // this part includes also a setup of coordinates center at first run
    //TODO: add the process to options page as well
    if (frame.pointables.length > 0) {
        var position = frame.pointables[0].stabilizedTipPosition;
        var position = frame.pointables[0].stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);
        var temp = chrome.storage.sync.get('newCenter', function (items) {
            return items.newCenter;
        });
        // console.log("newCenter value fetch from storage: " + temp);
        // TODO: check value from storage also
        if (runOnce === 0) {

            NewCenterSetup();
            runOnce++;
        }
        if (setupConfirm) {
            newCenter = normalized;
            chrome.storage.sync.set({newCenter: JSON.stringify(newCenter)});
            chrome.storage.sync.set({setupDone: setupDone});
            setupDone = true;
            setupConfirm = false;
        }
        // old and new center values for debug
        //  console.log("normal: " + normalized);
        //  console.log("new: " + NewInteractionBox(normalized));

        // if setup dialog is open don't look for gestures
        if(setupModalOpen)
            return;

        // looking for gesture types
        var extendedFingers = 0;
        var fingersList = frame.hands[0].fingers;
        // check number of extended fingers
        for(var i = 0; i < 5; i++) {
            if(fingersList[i].extended)
                extendedFingers++;
        }

        // if there's 5 extended fingers go with scroll gesture
        if (extendedFingers === 5) {
            // console.log("all fingers extended");
            curFramePos.x = NewInteractionBox(normalized)[0] * window.innerWidth;
            curFramePos.y = (1 - NewInteractionBox(normalized)[1]) * window.innerHeight;
            action = 'scroll';
        }
        // refresh gesture
        else if (extendedFingers == 1) {
            if(frame.valid && frame.gestures.length > 0) {
                frame.gestures.forEach( function (gesture) {
                    var pointableIds = gesture.pointableIds;
                    pointableIds.forEach( function (pointableId) {
                        var pointable = frame.pointable(pointableId);
                        if(pointable == fingersList[1] && fingersList[1].extended && gesture.type === 'circle') {
                            action = 'refresh';
                        }
                    });
                });
            }
        }
        else
            action = '';

        // apply actions
        switch (action) {
            case 'scroll':
                ScrollPage(curFramePos);
                showScroll();
                break;
            case 'zoom':
                // code
                break;
            case 'refresh':
                UpdateStatusImage('refresh');
                setTimeout(RefreshPage, discreteActionDelay);
                break;
            case 'move_history':
                // code
                break;
            case 'change_tabs':
                // code
                break;
            default:
            // default code
        }

    }

    //navigate_history(frame);
    //ZoomMarker(frame);
    // console.log("end leap loop");
});

// new center setup function
function NewCenterSetup() {
    $('body').append('<dialog style="position: fixed" class="modal" id="InteractionSetup">' +
        '<div class="modal-content">' +
        '<h3>New Interaction Center Setup</h3>' +
        '<p>If you wish to change the center of your interaction with the relaxed position of ' +
        'your hand, please put your hand in that position and click <strong>OK</strong>. Otherwise click ' +
        '<strong>Cancel</strong>.</p>' +
        '<br><div>' +
        '<button id="cancelModal">Cancel</button>' +
        '<button id="okModal">OK</button>' +
        '</div></div></dialog>');

    var setupDialog = document.getElementById('InteractionSetup');
    setupDialog.showModal();
    setupModalOpen = true;
    document.getElementById('cancelModal').addEventListener('click', function (e) {
        console.log('Center setup canceled');
        setupDialog.close();
    });
    document.getElementById('okModal').addEventListener('click', function (e) {
        console.log('Center changed successfully!');
        setupConfirm = true;
        setupDialog.close();
        setupModalOpen = false;
    });
}

// new coordinates for new interactionBox
function NewInteractionBox(curCenter) {
    var temp = [0,0,0];
    for (var i = 0; i < 3; i++)
        temp[i] = curCenter[i] - newCenter[i];
    return temp;
}

// TODO: remove this test code below
window.onkeypress = function(e) {
    console.log("attempt zoom 1");
    // if (e.charCode == 65) { // Space bar
    //     console.log("attempt zoom 1");
    var frame = 1;
        ZoomMarker(frame);
    // }
};

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
function ScrollPage(curFramePos) {
    var diffX = curFramePos.x - lastFramePos.x;
    var diffY = curFramePos.y - lastFramePos.y;

    if(diffY > appSettings.scrollThreshold.y)
        scrollValue.y = scrollSpeed.y;

    else if(diffY < - appSettings.scrollThreshold.y)
        scrollValue.y = - scrollSpeed.y;

    if(diffX > appSettings.scrollThreshold.x)
        scrollValue.x = scrollSpeed.x;

    else if(diffX < - appSettings.scrollThreshold.x)
        scrollValue.x = - scrollSpeed.x;

    window.scrollBy(scrollValue.x, scrollValue.y);
/*
    // scroll method 2 all scroll spectrum
    // var diffX = curFramePos.x - lastFramePos.x;
    // var diffY = curFramePos.y - lastFramePos.y;
    // scrollLevel.y = diffY * getScrollMax("y") / window.innerHeight;
    // scrollLevel.x = diffX * getScrollMax("x") / window.innerHeight;
    // window.scrollTo(scrollLevel.x, scrollAmount.y);
*/
    // reset scroll level for next frame
    // TODO: add to settings page
    if(!appSettings.continuousScroll) {
        scrollValue.x = 0;
        scrollValue.y = 0;
    }
    // save current frame position
    lastFramePos.y = curFramePos.y;
    lastFramePos.x = curFramePos.x;
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

// Refresh function that currently has the best accuracy.
function RefreshPage() {
    console.log("Refreshing page");
    location.reload();
}

// function called to change the icon of status placeholder
function UpdateStatusImage(action) {
    // check which image to use according to current action
    var imgURL;
    if(action === 'scroll' && isScrolling) {
        imgURL = scrollImage;
        // console.log("scroll icon shown");
    }
    else if (action === 'refresh')
        imgURL = refreshImage;


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

// get saved settings to use on runtime
function GetSettings() {
    chrome.storage.sync.get(['extensionOn', 'startOn', 'errorPos', 'scrollOn',
        'historyOn', 'tabOn', 'refreshOn', 'zoomOn', 'scrollSpeed', 'scrollStep'], function (items) {
        appSettings = items;
    });
}

function FadeStatusImg(state) {
    // it is not stopping like the actions are in a queue.
    if(state)
        $("#status-placeholder").show();
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

// leap events
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

// TODO: hide those events when device not streaming
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
