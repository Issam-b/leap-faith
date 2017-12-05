console.log("LeapJS v" + Leap.version.full);
var state = 'fetch';

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

// finger names mapping
const finger_name = ["thumb", "index", "middle", "ring", "pinky"];

// var for stats div in html
var stats_div;
var frameDatadiv;
var handData;
var pointableData;
var gesturesData;
var canvas;
var ctx;
var element;

var curentY = 0;
var currentX = 0;

// for gestures, part
var temp;

// Run this after page fully loads
window.onload = function () {
    stats_div = document.getElementById('stats');

    // Connect and disconnect buttons event listeners
    document.getElementById('bconnect').addEventListener("click", function () {
        controller.connect();
    });
    document.getElementById('bdisconnect').addEventListener("click", function () {
        controller.disconnect();
    });

    frameDatadiv = document.getElementById('frameData');
    handData = document.getElementById('handData');
    pointableData = document.getElementById('pointableData');
    gesturesData = document.getElementById('gesturesData');

    element = document.getElementById("position");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
};

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {

    // some useful and clear stats
    PrintPointablesCount(frame);
    PrintHandData(frame);
    PrintFingerData(frame);
    PrintGestureData(frame);

    // draw marker position on screen
    PositionMarker(frame);

    // print fingers positions and movement to canvas on screen
    ShowFingersCanvas(frame);

});

function ShowSwipePath() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    frame.gestures.forEach(function(gesture) {
        if (gesture.type != "swipe") return;
        var start = frame.interactionBox.normalizePoint(gesture.startPosition);
        var end = frame.interactionBox.normalizePoint(gesture.position);

        var startX = ctx.canvas.width * start[0];
        var startY = ctx.canvas.width * (1 - start[1]);

        var endX = ctx.canvas.width * end[0];
        var endY = ctx.canvas.width * (1 - end[1]);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    });
}

function ShowFingersCanvas(frame) {

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    frame.pointables.forEach(function(pointable) {
        var position = pointable.stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);

        var x = ctx.canvas.width * normalized[0];
        var y = ctx.canvas.height * (1 - normalized[1]);

        ctx.beginPath();
        ctx.rect(x, y, 20, 20);
        ctx.fill();
    });
}
function PositionMarker(frame) {

    if (frame.pointables.length > 0) {
        var position = frame.pointables[0].stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);
        var newX = window.innerWidth * normalized[0];
        var newY = window.innerHeight * (1 - normalized[1]);
        element.style.left = newX + "px";
        element.style.top = newY + "px";

        if(Math.abs((curentY - newY) / 30) > 2) {
            window.scrollBy(0, - (curentY - newY));
            curentY = newY;
        }

        if(Math.abs((currentX - newX) / 30) > 2) {
            window.scrollBy(- (currentX - newX), 0);
            currentX = newX;
        }
    }
}

function PrintGestureData(frame) {
    // Gestures stats
    var gesturesString = "";
    var gestures = frame.gestures;
    var hands;
    gestures.forEach(function (gesture) {
        // hands involved in the gesture
        var gestHandsIds = gesture.handIds;
        gestHandsIds.forEach(function(gestHandId) {
            hands = frame.hand(gestHandId).type + " ";
        });

        // fingers involved in the gesture
        var gestFingersIds = gesture.pointableIds;
        var fingers = "";
        gestFingersIds.forEach(function(gestFingerId) {
            fingers += finger_name[frame.pointable(gestFingerId).type] + " ";
        });

        gesturesString += "Type: " + gesture.type + ",    Hands: " +
            hands + ",    Fingers: " + fingers + "<br />";
    });

    if(gesturesString != "")
        temp = gesturesString;

    gesturesData.innerHTML = temp;
}

function PrintFingerData(frame) {
    // Display Pointable (finger) object data
    var pointableString = "";
    if (frame.pointables.length > 0) {
        for (var i = 0; i < frame.pointables.length; i++) {
            var pointable = frame.pointables[i];

            pointableString += "Pointable ID: " + finger_name[pointable.type] + "<br />";
            pointableString += "Belongs to hand with ID: " + pointable.handId + "<br />";
            pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
            pointableString += "Width: "  + pointable.width.toFixed(1) + " mm<br />";
            pointableString += "Direction: " + pointable.direction.toString() + "<br />";
            pointableString += "Tip position: " + pointable.tipPosition.toString() + " mm<br />";
            pointableString += "Tip velocity: " + pointable.tipVelocity.toString() + " mm/s<br /><br />";
        }
        pointableData.innerHTML = pointableString;
    }
}

function PrintPointablesCount(frame) {
    // Show number of hands and fingers detected
    var frameString =
        // "Frame ID: " + frame.id  + "<br />" +
        // "Timestamp: " + frame.timestamp + " &micro;s<br />" +
        "Hands: " + frame.hands.length + "<br />" +
        "Fingers: " + frame.fingers.length + "<br />";

    frameDatadiv.innerHTML = frameString;
}

function PrintHandData(frame) {
    // Display Hand object data
    var handString = "";
    if (frame.hands.length > 0) {
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
            handString += "Hand: " + hand.type + "<br />";
            handString += "Direction: " + hand.direction.toString() + "<br />";
            handString += "Palm normal: " + hand.palmNormal.toString() + "<br />";
            handString += "Palm position: " + hand.palmPosition.toString() + " mm<br />";
            handString += "Palm velocity: " + hand.palmVelocity.toString() + " mm/s<br />";
            handString += "Sphere center: " + hand.sphereCenter.toString() + " mm<br />";
            handString += "Sphere radius: " + hand.sphereRadius.toFixed(1) + " mm<br /><br />";
        }
        handData.innerHTML = handString;
    }
}

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
    console.log("deviceConnected");
});

controller.on('deviceDisconnected', function() {
    console.log("deviceDisconnected");
});