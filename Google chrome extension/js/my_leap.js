console.log("LeapJS v" + Leap.version.full);
var state = 'Connected';

// Excecute when page fully loaded
window.onload = function(e) {
    // add the status icon placeholder to the DOM of the page
    console.log("DOM element added.");
    $('body').append('<div id="status-placeholder" style="display: none;"><img id="status-image" src="" alt="scrolling" \
    width="128" height="128"/></div><div id="placeholder" style="display: none;"><img id="status-image2" src="" alt="zooming"/></div>');
    
    //var imgString = '<img src="'.concat(imgURL, '" alt="scrolling" width="150" height="200"/>');
    document.addEventListener("scroll", function(e) {
        ScrollStatus();
        });

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
    
 };

window.onkeypress = function(e) {
    if (e.charCode == 32) { // Space bar
        if (state == 'Connected') {
            controller.disconnect();
            state = 'Disconnected';
        } else {
            controller.connect();
            state = 'Connected';
        }
    }
};

// Extension settings
var appSettings = ({
    scrollSpeed: 1,
    scrollStep: {
        x: 5,
        y: 5
    },
});

// Variable declarations
var lastFramePos = ({x: 0, y: 0});
var curFramePos = ({x: 0, y: 0});
var scrollLevel = ({x: 0, y: 0});
var curScrollLevel = ({x: 0, y: 0});

var ScrollOn = true;

var cheese = 0;

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {

    // draw marker position on screen
    ScrollPage(frame);
    navigate_history(frame);
});

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

function Zoom_in_Status(){

    var ZoomImage = chrome.extension.getURL("images/zoom-in.png");
    document.getElementById("status-image2").src = ZoomImage;
    console.log("Zoom Icon show");
    $("#placeholder").css( {'position':'fixed',
        'display':'inline',
        'top':'50%',
        'left':'50%',
        'transform':'translate(-50%, -50%)'
        }).fadeOut("slow");
}

function Zoom_out_Status(){

    var Zoom_out_Image = chrome.extension.getURL("images/zoom-out.png");
    document.getElementById("status-image2").src = Zoom_out_Image;
    console.log("Zoom out show");
    $("#placeholder").css( {'position':'fixed',
        'display':'inline',       
        'top':'50%',
        'left':'50%',
        'transform':'translate(-50%, -50%)'
        }).fadeOut("slow");
}

//function ClickStatus() {
//     $("#popup2").css( {'padding':'12px 14px 12px 14px',
//     'display':'inline',
//     'bottom':'13px',
//     'right':'1px',
//     'z-index':'90'
//              }).fadeOut( "slow");
//}

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

function getScrollMax(axis){
    if (axis == "y")
        return ( 'scrollMaxY' in window ) ? window.scrollMaxY : (document.documentElement.scrollHeight - document.documentElement.clientHeight);
    if (axis == "x")
        return ( 'scrollMaxX' in window ) ? window.scrollMaxX : (document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

function ToggleState() {
    if(state == "Connected") {
        controller.disconnet();
        state = 'Disconnected';
        console.log("deviceDisconnected");
    } else if(state == "Disonnected") {
        controller.connet();
        state = 'Connected';
        console.log("deviceConnected");
    }
}

//Function that currently has the best accuracy.
controller.on('gesture', function(gesture) {
	if (gesture.type = 'circle' && cheese >= 40) {
		location.reload()
		console.log(gesture.id)}
	else {
		cheese++;
	}
});

/*
Make a refresh function that has better accuracy.
This one has potential, but the cheese one works better for now.

controller.on('gesture', function(gesture) {
	if (gesture.type = 'circle' && gesture.state == 'stop') {
		console.log("One complete circle.")
	}
});
*/

controller.on('ready', function() {
    console.log("ready. Service version: " + controller.connection.protocol.serviceVersion);
});
controller.on('connect', function() {
    console.log("connected with protocol v" + controller.connection.opts.requestProtocolVersion);
});
controller.on('disconnect', function() {
    console.log("disconnect");
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

controller.on('deviceConnected', function() {
    state = 'Connected';
    console.log("deviceConnected");
});

controller.on('deviceDisconnected', function() {
    state = 'Disconnected';
    console.log("deviceDisconnected");
});