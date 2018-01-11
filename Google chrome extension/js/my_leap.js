console.log("LeapJS v" + Leap.version.full);
var state = 'Connected';

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