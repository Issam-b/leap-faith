console.log("LeapJS v" + Leap.version.full);
var state = 'fetch';
window.onkeypress = function(e) {
    if (e.charCode == 32) { //spacebar
        if (state == 'fetch') {
            state = 'pausing';
        } else {
            state = 'fetch';
        }
    }
};

// var for stats div in html
const finger_name = ["thumb", "index", "middle", "ring", "pinky"];
var stats_div;
var frameDatadiv;
var handData;
var pointableData;
var gesturesData;

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
};

var haveLoggedFrame = false;
// create the leap controller instance
var controller = new Leap.Controller({enableGestures: true});
// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {
    // if paused state exist the loop
    if (state == 'paused') return;
    // if pausing state, print frame data and change state to paused
    if (state == 'pausing') {
        //stats_div.innerHTML = "<p><b>PAUSED</b></p><div>"+ frame.dump() + "</div>";
        state = 'paused';
    } else {
        //stats_div.innerHTML = "<p>Click Space bar to pause</p><div>"+ frame.dump() + "</div>";
    }

    // check if frame has been logged and log it
    if (haveLoggedFrame == false && frame.hands[0]){
        console.log(frame);
        haveLoggedFrame = true;
    }

    // some useful and clear stats
    // Show number of hands and fingers detected
    var frameString =
        // "Frame ID: " + frame.id  + "<br />" +
        // "Timestamp: " + frame.timestamp + " &micro;s<br />" +
        "Hands: " + frame.hands.length + "<br />" +
        "Fingers: " + frame.fingers.length + "<br />";

    frameDatadiv.innerHTML = frameString;

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

});

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