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

// var for stats div in html
var curentY = 0;
var currentX = 0;

var ScrollOn = true;

// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {

    // draw marker position on screen
    //if (frame.pointables.length > 0){
    //ScrollMarker(frame);}
    //else if (frame.hands.length > 0){
    ZoomMarker(frame);
});

function ZoomMarker(frame) {

   
   var hands = frame.hands[0];
   //if(frame.hands.length > 0) // zoom the page by transforming css.   

$('html').css({
            'transform': 'scale('+hands._scaleFactor+') translateZ(0)', 
            '-webkit-transform': 'scale(' + hands._scaleFactor + ') translateZ(0)',
            'transformation-origin': 'center center'
        });



//function ScrollMarker(frame){

  //  if (frame.pointables.length > 0) {
    //    var position = frame.pointables[0].stabilizedTipPosition;
      //  var normalized = frame.interactionBox.normalizePoint(position);
        //var newX = window.innerWidth * normalized[0];
        //var newY = window.innerHeight * (1 - normalized[1]);

         //Vertical
        //if(Math.abs((curentY - newY) / 30) > 2) {
          //  window.scrollBy(0, - (curentY - newY));
            //curentY = newY;
        //}

		 //Horizontal
        //if(Math.abs((currentX - newX) / 30) > 2) {
          //  window.scrollBy(- (currentX - newX), 0);
            //currentX = newX;
        //}
    //}
//}



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