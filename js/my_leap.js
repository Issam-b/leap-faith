/**
 * @file Leap motion chrome extension content script for gestures handling.
 * @author Assam Boudjelthia <assam.bj@gmail.com>
 * @version 0.1
 */

//TODO: fix wrong error message when tab loses focus for too long
//TODO: gesture to reset zoom to normal
//TODO: if the extension crashes reload page!
//TODO: make a timeout of usage so if the user didn't interact with the device it disconnects
//TODO: reduce scroll step if page scrollMax is too big
    //TODO: fix semaphore problem

// Extension settings variable declaration
var appSettings = ({});

// Variable declarations
var attached = false, streaming = false;
var leap_status;
var curRefreshCount = 0;
var curHistoryCount = 0;
var scrollSpeed;
// TODO: add this to settings
var LostTime, stopNotificationTimeout = 20;

var tab_has_focus;
var lastFramePos = ({x: 0, y: 0, z: 0});
var lastFrame, lastExtendedFingers = 0;
var frameDiff = ({x: 0, y: 0, z: 0});
var curFramePos = ({x: 0, y: 0, z: 0});
var scrollValue = ({x: 0, y: 0});

var isScrolling, isZooming;
var action = 'none', lastAction = 'none';
var connection, messageInterval;
var lastCheckTime = new Date().getTime() / 1000;
var currentTime = 0;
var ConnectionLost = false;
var setupConfirm = false;
var setupModalOpen = false;
var fpsCounter = -1;

// image locations
var imgURL;
var scrollImage = chrome.extension.getURL("images/scroll.png");
var zoomInImage = chrome.extension.getURL("images/zoomIn.png");
var zoomOutImage = chrome.extension.getURL("images/zoomOut.png");
var refreshImage = chrome.extension.getURL("images/refresh.png");
var historyRightImage = chrome.extension.getURL("images/history_right.png");
var historyLeftImage = chrome.extension.getURL("images/history_left.png");
var tabRightImage = chrome.extension.getURL("images/tab_right.png");
var tabLeftImage = chrome.extension.getURL("images/tab_left.png");
var connectedImage = chrome.extension.getURL("images/connected.png");
var disconnectedImage = chrome.extension.getURL("images/disconnected.png");

var statusPlaceholder, leapNotification;
// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// update settings
function GetSettings() {
    console.log("Updating settings");
    chrome.storage.local.get(['setupDone', 'notificationPos', 'extensionOn', 'startOn', 'errorPos', 'scrollOn',
        'historyOn', 'tabOn', 'refreshOn', 'zoomOn', 'scrollSpeed', 'continuousScroll',
        'scrollThresholdX', 'scrollThresholdY', 'scrollStepX', 'scrollStepY', 'connectionTimeOut', 'fpsScaleFactor',
        'discreteActionDelay', 'refreshThreshold', 'historyThreshold', 'firstSettings', 'newCenter', 'zoomScale'], function (items) {
        if(typeof(items.setupDone) === "undefined") {
            chrome.storage.local.set({setupDone: false});
            chrome.storage.local.set({newCenter: {0: 0, 1: 0, 2: 0}});
            if(typeof(items.firstSettings) === "undefined" ) {
                console.log("Setting first run settings");
                chrome.storage.local.set({
                    extensionOn: true,
                    startOn: true,
                    notificationPos: true,
                    scrollOn: true,
                    historyOn: true,
                    tabOn: true,
                    refreshOn: true,
                    zoomOn: true,
                    scrollSpeed: 1, // TODO: remove not used
                    continuousScroll: false,
                    scrollThresholdX: 10,
                    scrollThresholdY: 10,
                    scrollStepX: 10,
                    scrollStepY: 10,
                    connectionTimeOut: 5,
                    fpsScaleFactor: 20,
                    discreteActionDelay: 500,
                    refreshThreshold: 2,
                    historyThreshold: 1,
                    firstSettings: true,
                    zoomScale: 0.1
                });
            }
        }
        else {
            appSettings.setupDone = items.setupDone;
            appSettings.extensionOn = items.extensionOn;
            appSettings.notificationPos = items.notificationPos;
            appSettings.startOn = items.startOn;
            appSettings.errorPos = items.errorPos;
            appSettings.scrollOn = items.scrollOn;
            appSettings.historyOn = items.historyOn;
            appSettings.tabOn = items.tabOn;
            appSettings.refreshOn = items.refreshOn;
            appSettings.zoomOn = items.zoomOn;
            appSettings.scrollSpeed = items.scrollSpeed;
            appSettings.continuousScroll = items.continuousScroll;
            appSettings.scrollThresholdX = items.scrollThresholdX;
            appSettings.scrollThresholdY = items.scrollThresholdY;
            appSettings.scrollStepX = items.scrollStepX;
            appSettings.scrollStepY = items.scrollStepY;
            appSettings.connectionTimeOut = items.connectionTimeOut;
            appSettings.fpsScaleFactor = items.fpsScaleFactor;
            appSettings.discreteActionDelay = items.discreteActionDelay;
            appSettings.refreshThreshold = items.refreshThreshold;
            appSettings.historyThreshold = items.historyThreshold;
            appSettings.firstSettings = items.firstSettings;
            appSettings.newCenter = items.newCenter;
            appSettings.zoomScale = items.zoomScale;

            // set some other variables
            //appSettings.setupDone = false;
            scrollSpeed = ({
                x: getScrollMax('x') / appSettings.scrollStepX,
                y: getScrollMax('y') / appSettings.scrollStepY
            });
        }
    });
}

GetSettings();
// update settings periodically
var settingsInterval = setInterval(GetSettings, 10000);

// add DOM element
AddDOMElement();

// popup message handler to connect/disconnect
MessagingHandler();

// TODO: send message to background
//TODO: add condition when the leap crashes, restart it or reload browser
// check connection of leap device
connection = setInterval(CheckConnection, 1000);
// get first leap_status and save it to storage
function initStatus() {
    if(attached) {
        leap_status = 'Port connected';
        chrome.storage.local.set({leap_status: leap_status});
    }
}
initStatus();
function CheckConnection() {
    if (tab_has_focus && attached) {
        currentTime = new Date().getTime() / 1000;
        if (currentTime - lastCheckTime > appSettings.connectionTimeOut && !ConnectionLost) {
            //clearInterval(connection);
            console.log("Connection lost!");
            // console.log(currentTime + " * " + lastCheckTime);
            StatusMessage("Connection to device has been lost!", 'error');
            messageInterval = setInterval(function() {
                StatusMessage("Connection to device has been lost!", 'error')
            }, 10000);
            ConnectionLost = true;
            LostTime = currentTime;
            leap_status = 'Port disconnected';
            chrome.storage.local.set({leap_status: leap_status});
            UpdateStatusImage('disconnected');
        }
    }
}

// popup button connect/disconnect handler
function MessagingHandler() {
    try {
        chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
            console.log("onMessage data: " + JSON.stringify(request) + " " +
                JSON.stringify(sender));
            // disconnect command from popup button
            if (request.popUpAction === 'disconnect') {
                controller.disconnect();
                if(leap_status === 'Port disconnected')
                    FadeStatusImg(false);
                sendResponse({leap_status: leap_status});
            }
            // connect command from popup button
            else if (request.popUpAction === 'connect') {
                controller.connect();
                sendResponse({leap_status: leap_status});
            }

            // check for message of options page of new setting update
            // if (request.updateSettings === true) {
            //     GetSettings();
            //     sendResponse('OK');
            // }
            // reset zoom to normal only for status image
            // if(request.DOMResize === true) {
            //     $("#status-placeholder").zoom = 1.0;
            //     console.log("DOM zoom recovered");
            //     sendResponse({recoveredZoom: true});
            // }
            return true;
        });
    } catch(error) {
        console.error(error.message);
    }
}

// run the leap loop, this will be running until disconnected
controller.loop(function(frame) {

    // if extension is disabled exit
    if(!appSettings.extensionOn)
        return;

    // update icon status
    if(action === 'none' && leap_status === 'Port connected')
        UpdateStatusImage('connected');

    // if device is not attached exit
    if(!attached || !appSettings.extensionOn) {
        if(new Date().getTime() / 1000 - LostTime > stopNotificationTimeout) {
            clearInterval(messageInterval);
            FadeStatusImg(false);
        }
        return;
    }

    ConnectionLost = false;
    leap_status = 'Port connected';
    if(tab_has_focus)
        chrome.storage.local.set({leap_status: leap_status});
    attached = true;
    streaming = true;
    clearInterval(messageInterval);
    //connection = setInterval(CheckConnection, 1000);

    // attempt to reduce the fps
    fpsCounter++;
    if(fpsCounter % appSettings.fpsScaleFactor === 0 && fpsCounter !== 0)
        fpsCounter = -1;

    // if current tab doesn't have focus, the leap is disconnected
    // or zoomFactor factor is not met exit loop
    if (!tab_has_focus || fpsCounter % appSettings.fpsScaleFactor !== 0) {
        return;
    }

    // save current time of successful frame data fetch from device
    lastCheckTime = new Date().getTime() / 1000;

    // check frames to decide what gesture and action to do
    // this part includes also a setup of coordinates center at first run
    if (frame.valid && frame.pointables.length > 0) {
        var position = frame.pointables[0].stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);
        // old and new center values for debug
        //  console.log("normal: " + normalized);
        //  console.log("new: " + NewInteractionBox(normalized));
        // check if new center setup if not done, open the setup dialog
        if (!appSettings.setupDone  && !setupModalOpen) {
            NewCenterSetup();
        }
        // if the dialog returns OK, set the new center and save it
        if (setupConfirm) {
            appSettings.newCenter = JSON.stringify(normalized);
            chrome.storage.local.set({newCenter: JSON.parse(appSettings.newCenter)});
            chrome.storage.local.set({setupDone: appSettings.setupDone});
            setupConfirm = false;
            appSettings.newCenter = JSON.parse(appSettings.newCenter);
        }



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

        // calculate new coordinates
        curFramePos.x = NewInteractionBox(normalized)[0] * window.innerWidth;
        curFramePos.y = (1 - NewInteractionBox(normalized)[1]) * window.innerHeight;
        curFramePos.z = NewInteractionBox(normalized)[2] * 100;
        frameDiff.x = curFramePos.x - lastFramePos.x;
        frameDiff.y = curFramePos.y - lastFramePos.y;
        frameDiff.z = curFramePos.z - lastFramePos.z;

        var zoomFactor = 0;
        if (extendedFingers >= 4) {
            // scroll gesture
            // if there's 5 extended fingers go with scroll or history navigation gesture
            if (appSettings.scrollOn && extendedFingers === 5) {
                if (curHistoryCount > appSettings.historyThreshold) {
                    if (Math.abs(frameDiff.y) > appSettings.scrollThresholdY ||
                        Math.abs(frameDiff.x) > appSettings.scrollThresholdX) {
                        action = 'scroll';
                    }
                }
                curHistoryCount++;
            }

            // history navigation gesture
            if(appSettings.historyOn) {
                if (frame.valid && frame.gestures.length > 0) {
                    var gesture = frame.gestures[0];
                    if (gesture.type === 'swipe') {
                        var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
                        if (isHorizontal && curHistoryCount > 0) {
                            // TODO: might be good to add some constraint to the side that is in accordance with the hand type
                            if (gesture.direction[0] > 0 && lastAction !== 'move_history_left') {
                                action = 'move_history_right';
                            } else if (gesture.direction[0] < 0 && lastAction !== 'move_history_right'){
                                action = 'move_history_left';
                            }
                        }
                    }
                }
            }
        }

        // refresh gesture with index finger
        else if (appSettings.refreshOn && extendedFingers == 1 && fingersList[1].extended &&
            lastExtendedFingers === 1 && frame.gestures.length > 0) {
                var gesture = frame.gestures[0];
                if(gesture.type === 'circle' /*&& curRefreshCount > appSettings.refreshThreshold*/) {
                    action = 'refresh';
                    // curRefreshCount = 0;
                }
                // curRefreshCount++;
        }

        // tab move gesture with two fingers
        else if (appSettings.tabOn && extendedFingers === 2 && frame.gestures.length > 0) {
            console.log("im here yoo");
            console.log(frame.gestures);
                var gesture = frame.gestures[0];
                if(gesture.type === 'swipe') {
                    var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
                    if(isHorizontal && lastAction !== 'move_tab_left' && lastAction !== 'move_tab_right') {
                        if (gesture.direction[0] > 0) {
                            action = 'move_tab_right';
                        } else {
                            action = 'move_tab_left';
                        }
                    }
                }
        }

        // zoom gesture if thumb extended and non-extended thumb to stop it
        // zoom factor is 10%
        else if(appSettings.zoomOn && extendedFingers === 1 && lastExtendedFingers === 1 && fingersList[0].extended &&
            lastAction !== 'zoom' && Math.abs(frameDiff.z) > appSettings.scrollThresholdY) {
                    var thumbPos = fingersList[0].dipPosition;
                    var IndexPos = fingersList[1].dipPosition;
                    var distance = Math.sqrt(Math.pow(thumbPos[0]-IndexPos[0], 2) +
                        Math.pow(thumbPos[1]-IndexPos[1], 2) +
                        Math.pow(thumbPos[2]-IndexPos[2], 2));
                    if(distance > 40) {
                        if (frameDiff.z > appSettings.scrollThresholdY)
                            zoomFactor = appSettings.zoomScale;
                        else
                            zoomFactor = - appSettings.zoomScale;
                        action = 'zoom';
                    }

        }
        // else action to none
        else {
            action = 'none';
        }
        // apply actions
        console.log("action: " + action);
        switch (action) {
            case 'scroll':
                ScrollPage(frameDiff);
                curHistoryCount = 0;
                break;
            case 'zoom':
                zoomPage(zoomFactor);
                if(zoomFactor >= 0)
                    UpdateStatusImage('zoomOut');
                if(zoomFactor < 0)
                    UpdateStatusImage('zoomIn');
                curHistoryCount = 0;
                break;
            case 'refresh':
                UpdateStatusImage('refresh');
                setTimeout(RefreshPage, appSettings.discreteActionDelay);
                curHistoryCount = 0;
                break;
            case 'move_history_right':
                UpdateStatusImage('move_history_right');
                setTimeout( function() { navigateHistory('right'); }, appSettings.discreteActionDelay);
                curHistoryCount = 0;
                break;
            case 'move_history_left':
                UpdateStatusImage('move_history_left');
                setTimeout( function() { navigateHistory('left'); }, appSettings.discreteActionDelay);
                curHistoryCount = 0;
                break;
            // for tab image update is done inside the navigateTabs method
            // since it checks there if the switching was successful or not from message from
            // background page
            case 'move_tab_right':
                UpdateStatusImage('move_tab_right');
                setTimeout( function() { navigateTabs('right'); }, appSettings.discreteActionDelay);
                curHistoryCount = 0;
                break;
            case 'move_tab_left':
                UpdateStatusImage('move_tab_left');
                setTimeout( function() { navigateTabs('left'); }, appSettings.discreteActionDelay);
                curHistoryCount = 0;
                break;
            case 'none':
                // stop any ongoing fadeOut animation
                $("#status-placeholder").stop(true, true);
                FadeStatusImg(true);
                if(leap_status === 'Port connected')
                    UpdateStatusImage('connected');
                else
                    UpdateStatusImage('disconnected');
                // curHistoryCount = 0;
                break;
        }
        // save current frame value to be used for next frame
        lastFrame = frame;
        lastExtendedFingers = extendedFingers;
        lastFramePos.y = curFramePos.y;
        lastFramePos.x = curFramePos.x;
        lastFramePos.z = curFramePos.z;

        // action = 'none';
    }
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
        appSettings.setupDone = true;
        setupDialog.close();
        setupModalOpen = false;
    });
}

// new coordinates for new interactionBox
function NewInteractionBox(currentPos) {
    var newCoordinates = [0,0,0];
    // convert stored newCenter json format to array
    var newCenterArray = [];
    for(var j in appSettings.newCenter)
        newCenterArray.push(appSettings.newCenter[j]);
    // calculate new coordinates
    for (var i = 0; i < 3; i++) {
        newCoordinates[i] = currentPos[i] - newCenterArray[i];
    }
    return newCoordinates;
}

// navigate the history back and forward
function navigateHistory (direction) {
    if(direction === 'right') {
        console.log('Next Page');
        history.forward();
    }
    else if(direction === 'left'){
        console.log('Previous Page');
        history.back();
    }
}

// navigate tabs function
function navigateTabs (direction) {
    // sends a message to the background page to handle getting tab index
    // and find the next or previous tab index and switch to it
    // response returned is whether tab switched and what index
    if(direction === 'right') {
        chrome.runtime.sendMessage({tab_direction: 'right'}, function (response) {
            if (response.tabSwitched === 'switched') {
                console.log('Next tab');
            }
        });
    }
    else if(direction === 'left') {
        chrome.runtime.sendMessage({tab_direction: 'left'}, function (response) {
            if (response.tabSwitched === 'switched') {
                console.log('Previous tab');
            }
        });
    }
}

// scroll function
function ScrollPage(frameDiff) {
    if(frameDiff.y > appSettings.scrollThresholdY)
        scrollValue.y = scrollSpeed.y;

    else if(frameDiff.y < - appSettings.scrollThresholdY)
        scrollValue.y = - scrollSpeed.y;

    if(frameDiff.x > appSettings.scrollThresholdX)
        scrollValue.x = scrollSpeed.x;

    else if(frameDiff.x < - appSettings.scrollThresholdX)
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
    if(!appSettings.continuousScroll) {
        scrollValue.x = 0;
        scrollValue.y = 0;
    }

    // update image
    UpdateStatusImage('scroll');
}

// get value of max scroll possible on the current page
function getScrollMax(axis) {
    var body = document.body,
        html = document.documentElement;
    if (axis === 'y')
        return Math.max( body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight );
    if (axis === 'x')
        return Math.max( body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth );
}

// Zoom function
function zoomPage(zoomFactor) {
    chrome.runtime.sendMessage({zoomFactor: zoomFactor}, function (response) {
        // if (response.zoomDone === 'zoomed') {  // this condition doesn't make sense but let's just do
            if(zoomFactor > 0)
                console.log('Zoom Out');
            else
                console.log('Zoom In');
        // }
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
    if (action === 'scroll') {
        DOMPosition('bottom');
        imgURL = scrollImage;
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(function () {
            // fade out image when action stops
            FadeStatusImg(false);
        }, appSettings.fpsScaleFactor * 20);
    }
    else if (action === 'refresh') {
        DOMPosition();
        imgURL = refreshImage;
    }
    else if (action === 'move_history_right') {
        DOMPosition('right');
        imgURL = historyRightImage;
    }
    else if (action === 'move_history_left') {
        DOMPosition('left');
        imgURL = historyLeftImage;
    }
    else if (action === 'move_tab_left') {
        DOMPosition();
        imgURL = tabLeftImage;
    }
    else if (action === 'move_tab_right') {
        DOMPosition();
        imgURL = tabRightImage;
    }
    else if (action === 'zoomIn' || action === 'zoomOut') {
        DOMPosition();
        if(action === 'zoomIn')
            imgURL = zoomInImage;
        if(action === 'zoomOut')
            imgURL = zoomOutImage;
        window.clearTimeout( isZooming );
        isZooming = setTimeout(function() {
            // fade out image when action stops
            FadeStatusImg(false);
        },  appSettings.fpsScaleFactor * 20);
    }
    else if(action === 'connected') {
        DOMPosition('bottom');
        imgURL = connectedImage;
    }
    else if(action === 'disconnected') {
        DOMPosition('bottom');
        imgURL = disconnectedImage;
    }

    // assign image
    document.getElementById("status-image").src = imgURL;
    FadeStatusImg(true);
}

// Show a message notification of status
function StatusMessage(message, color) {
    if (color === 'error')
        $("#leap-notification").css({'background-color': '#ff0000'});
    else if (color === 'info')
        $("#leap-notification").css({'background-color': '#3aff31'});
    $("#leap-notification").fadeIn("slow").text(message);
    $("#leap-notification").fadeTo(3000, 500).fadeOut("slow");
}

// fade in or out the status image
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
        '<img id="status-image" src="" alt="scrolling" width="72" height="72"/></div>');

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

    statusPlaceholder = document.getElementById('status-placeholder');
    leapNotification = document.getElementById('leap-notification');
    DOMPosition();

}

// Reposition the status image
function DOMPosition(position) {
    if(appSettings.notificationPos || position === 'bottom')
        statusPlaceholder.className = 'bottom-notification';
    else {
        if(position === 'right')
            statusPlaceholder.className = 'right-notification';
        else if(position === 'left')
            statusPlaceholder.className = 'left-notification';
        else
            statusPlaceholder.className = 'middle-notification';
    }
}

// show and hide DOM elements
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
controller.on('focus', function() {
    tab_has_focus = true;
    console.log("focus");
});
controller.on('blur', function() {
    tab_has_focus = false;
    console.log("blur");
});

controller.on('ready', function() {
    console.log("LeapJS v" + Leap.version.full);
    console.log("ready. Service version: " + controller.connection.protocol.serviceVersion);
});
controller.on('connect', function() {
    console.log("connected with protocol v" + controller.connection.opts.requestProtocolVersion);
    leap_status = 'Port connected';
    chrome.storage.local.set({leap_status: leap_status});
});
controller.on('disconnect', function() {
    console.log("Port disconnect");
    leap_status = 'Port disconnected';
    chrome.storage.local.set({leap_status: leap_status});
});

controller.on('deviceAttached', function(deviceInfo) {
    attached = true;
    console.log("deviceAttached", deviceInfo);
});
controller.on('deviceRemoved', function(deviceInfo) {
    attached = false;
    console.log("Connection lost!");
    StatusMessage("Connection to device has been lost!", 'error');
    messageInterval = setInterval(function() {
        StatusMessage("Connection to device has been lost!", 'error')
    }, 10000);
    ConnectionLost = true;
    LostTime = new Date().getTime() / 1000;
    leap_status = 'Port disconnected';
    chrome.storage.local.set({leap_status: leap_status});
    UpdateStatusImage('disconnected');

    console.log("deviceRemoved", deviceInfo);
});
controller.on('deviceStreaming', function(deviceInfo) {
    streaming = true;
    console.log("deviceStreaming", deviceInfo);
});
controller.on('deviceStopped', function(deviceInfo) {
    streaming = false;
    console.log("deviceStopped", deviceInfo);
});

controller.on('streamingStarted', function(deviceInfo) {
    console.log("streamingStarted", deviceInfo);
});
controller.on('streamingStopped', function(deviceInfo) {
    console.log("streamingStopped", deviceInfo);
});
