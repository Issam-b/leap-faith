console.log("LeapJS v" + Leap.version.full);
var state = 'play';
window.onkeypress = function(e) {
    if (e.charCode == 32) { //spacebar
        if (state == 'play') {
            state = 'pausing';
        }else{
            state = 'play';
        }
    }
};
var haveLoggedFrame = false;
var controller = new Leap.Controller({enableGestures: true});
controller.loop(function(frame) {
    if (state == 'paused') return;
    if (state == 'pausing') {
        document.getElementById('out').innerHTML = "<p><b>PAUSED</b></p><div>"+ frame.dump() + "</div>";
        state = 'paused';
    }else{
        document.getElementById('out').innerHTML = "<p>spacebar to pause</p><div>"+ frame.dump() + "</div>";
    }

    if (haveLoggedFrame == false && frame.hands[0]){
        console.log(frame);
        haveLoggedFrame = true;
    }

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