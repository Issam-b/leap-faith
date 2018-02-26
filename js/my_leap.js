/**
 * @file Leap motion chrome extension content script for gestures handling.
 * @author Assam Boudjelthia <assam.bj@gmail.com>
 * @version 0.1
 */

// Extension settings variable declaration
var appSettings = ({});
var DEBUG = true;
// Variable declarations
var attached = false, streaming = false;
var leap_status;
var curHistoryCount = 0;
var scrollSpeed;
var user_disconnect;

// DOM element names
var STATUS_IMAGE_DOM_NAME = 'status-image';
var STATUS_DIV_DOM_NAME = 'status-placeholder';
var NOTIFICATION_MESSAGE_DOM_NAME = 'leap-notification';
var INTERACTION_BOX_SETUP_DOM_NAME = 'InteractionSetup';

var LostTime, stopNotificationTimeout = 20;

var lastFramePos = ({x: 0, y: 0, z: 0});
var lastFrame, lastExtendedFingers = 0;
var frameDiff = ({x: 0, y: 0, z: 0});
var curFramePos = ({x: 0, y: 0, z: 0});
var scrollValue = ({x: 0, y: 0});

var isScrolling, isZooming;
var action = 'none', lastAction = 'none';
var connection, messageInterval;
var lastCheckTime = new Date().getTime() / 1000;
var tab_has_focus, last_focus_time = lastCheckTime;
var currentTime = 0;
var ConnectionLost = false;
var setupConfirm = false;
var setupModalOpen = false;
var fpsCounter = -1;
var zoomFactor = 0;

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

var statusPlaceholderDom, statusImageDom, leapNotificationDom;
// create the leap controller instance with parameters
var controller = new Leap.Controller( {
    enableGestures: true
});

// update settings, fetch settings from local storage
function GetSettings() {
    if(DEBUG)
        console.log("Updating settings");
    chrome.storage.local.get(['setupDone', 'notificationPos', 'extensionOn', 'startOn', 'errorPos', 'scrollOn',
        'historyOn', 'tabOn', 'refreshOn', 'zoomOn', 'continuousScroll',
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

            // set some other runtime variables variables
            //appSettings.setupDone = false;
            scrollSpeed = ({
                x: getScrollMax('x') / appSettings.scrollStepX,
                y: getScrollMax('y') / appSettings.scrollStepY
            });
        }
    });

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
}

// get settings for first time
GetSettings();

// update settings periodically
setInterval(function() {
    if(appSettings.extensionOn && attached && leap_status)
        GetSettings()
}, 10000);

// add DOM element
AddDOMElement();

// popup message handler to connect/disconnect
MessagingHandler();

// check connection of leap device
connection = setInterval(CheckConnection, 1000);
function CheckConnection() {
    if (tab_has_focus && attached) {
        // check whether the difference between last time leap loop was running and
        // last time the page had focus doesn't exceed the connection timeout
        // also don't execute if the connection is already
        currentTime = new Date().getTime() / 1000;
        if (currentTime - lastCheckTime - last_focus_time > appSettings.connectionTimeOut && !ConnectionLost) {
            PushNotification('Connection to device has been lost!', 'error');
            ConnectionLost = true;
            LostTime = currentTime;
            leap_status = 'Port disconnected';
            chrome.storage.local.set({leap_status: leap_status});
            console.log("disconnected image from checkConnection");
            UpdateStatusImage('disconnected');
            last_focus_time = 0;
            if(DEBUG) {
                console.log("Connection lost!");
                console.log("current time: " + currentTime + " lastCheckTime: " + lastCheckTime);
                console.log("lea_status: " + leap_status);
            }
        }
    }
}

// get first leap_status and save it to storage
initStatus();
function initStatus() {
    if(attached) {
        if(DEBUG)
            console.log("Start init check");
        leap_status = 'Port connected';
        chrome.storage.local.set({leap_status: leap_status});
    }
}

// popup button connect/disconnect handler
function MessagingHandler() {
    var popup_command_timeout;
    try {
        chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
            if(DEBUG)
                console.log("onMessage data: " + JSON.stringify(request) + " " + JSON.stringify(sender));
            // disconnect command from popup button
            if (request.popUpAction === 'disconnect') {
                user_disconnect = true;
                controller.disconnect();
                user_disconnect = false;
                // display the disconnect icon and hide it after 20 seconds
                if(leap_status === 'Port disconnected')
                    popup_command_timeout = setTimeout(function() { FadeStatusImg(false)}, stopNotificationTimeout * 1000);
                sendResponse({leap_status: leap_status, attached: attached});
            }
            // connect command from popup button
            else if (request.popUpAction === 'connect') {
                clearTimeout(popup_command_timeout);
                controller.connect();
                sendResponse({leap_status: leap_status, attached: attached});
            }

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
    if(action === 'none' && leap_status === 'Port connected' && attached &&
        statusImageDom.attr('src') !== connectedImage) {
        console.log("connected image from loop");
            UpdateStatusImage('connected');
    }

    // if device is not attached exit
    if(!attached || !appSettings.extensionOn) {
        if(new Date().getTime() / 1000 - LostTime > stopNotificationTimeout) {
            clearInterval(messageInterval);
            FadeStatusImg(false);
        }
        return;
    }

    // if device connection is ok set appropriate flags
    ConnectionLost = false;
    leap_status = 'Port connected';
    if(tab_has_focus)
        chrome.storage.local.set({leap_status: leap_status});
    attached = true;
    streaming = true;
    clearInterval(messageInterval);

    // shape the fps of the device according to the settings fpsScaleFactor
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
        // get the normalized coordinated from the device
        var position = frame.pointables[0].stabilizedTipPosition;
        var normalized = frame.interactionBox.normalizePoint(position);
        var new_normalized = NewInteractionBox(normalized);
        var gesture, isHorizontal;

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

        // get number of extended fingers
        for(var i = 0; i < 5; i++) {
            if(fingersList[i].extended)
                extendedFingers++;
        }

        // calculate new coordinates
        // old and new center values for debug

        if(DEBUG) {
            console.log("default coordinates: " + normalized);
            console.log("new coordinates: " + new_normalized);
        }

        // calculate positions related to the current page
        curFramePos.x = new_normalized[0] * window.innerWidth;
        curFramePos.y = (1 - new_normalized[1]) * window.innerHeight;
        curFramePos.z = new_normalized[2] * 100;

        // calculate position differences
        frameDiff.x = curFramePos.x - lastFramePos.x;
        frameDiff.y = curFramePos.y - lastFramePos.y;
        frameDiff.z = curFramePos.z - lastFramePos.z;

        zoomFactor = 0;
        if (extendedFingers >= 4) {
            // scroll gesture
            // if there's 5 extended fingers go with scroll or history navigation gesture
            if (appSettings.scrollOn && extendedFingers === 5) {
                if (curHistoryCount > appSettings.historyThreshold &&
                    (Math.abs(frameDiff.y) > appSettings.scrollThresholdY ||
                        Math.abs(frameDiff.x) > appSettings.scrollThresholdX)) {
                    action = 'scroll';
                }
                curHistoryCount++;
            }

            // history navigation gesture
            if(appSettings.historyOn) {
                if (frame.valid && frame.gestures.length > 0) {
                    gesture = frame.gestures[0];
                    if (gesture.type === 'swipe') {
                        isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
                        if (isHorizontal && curHistoryCount > 0) {
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
        else if (appSettings.refreshOn && extendedFingers === 1 && fingersList[1].extended &&
            lastExtendedFingers === 1 && frame.gestures.length > 0) {
                gesture = frame.gestures[0];
                if(gesture.type === 'circle') {
                    action = 'refresh';
                }
        }

        // tab move gesture with two fingers
        else if (appSettings.tabOn && extendedFingers === 2 && frame.gestures.length > 0) {
            console.log(frame.gestures);
                gesture = frame.gestures[0];
                if(gesture.type === 'swipe') {
                    isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
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
        // log action
        if(DEBUG)
            console.log("current action: " + action);

        // apply actions
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
                statusPlaceholderDom.stop(true, true);
                FadeStatusImg(true);
                if(leap_status === 'Port connected') {
                    console.log("connected image from case none");
                    UpdateStatusImage('connected');
                }
                else {
                    console.log("disconnected image from case none");
                    UpdateStatusImage('disconnected');
                }
                // curHistoryCount = 0;
                break;
        }

        // save current frame value to be used for next frame
        lastFrame = frame;
        lastExtendedFingers = extendedFingers;
        lastFramePos.y = curFramePos.y;
        lastFramePos.x = curFramePos.x;
        lastFramePos.z = curFramePos.z;
    }
    else
        action = 'none';

    // actions execution functions
    // navigate the history back and forward
    function navigateHistory (direction) {
        if(direction === 'right') {
            if(DEBUG)
                console.log('Next history page');
            history.forward();
        }
        else if(direction === 'left') {
            if(DEBUG)
                console.log('Previous history page');
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
                if (response.tabSwitched === 'switched' && DEBUG) {
                    console.log('Next tab');
                }
            });
        }
        else if(direction === 'left') {
            chrome.runtime.sendMessage({tab_direction: 'left'}, function (response) {
                if (response.tabSwitched === 'switched' && DEBUG) {
                    console.log('Previous tab');
                }
            });
        }
    }

    // scroll function
    function ScrollPage(frameDiff) {

        // vertical scroll
        if(frameDiff.y > appSettings.scrollThresholdY)
            scrollValue.y = scrollSpeed.y;

        else if(frameDiff.y < - appSettings.scrollThresholdY)
            scrollValue.y = - scrollSpeed.y;

        // horizontal scroll
        if(frameDiff.x > appSettings.scrollThresholdX)
            scrollValue.x = scrollSpeed.x;

        else if(frameDiff.x < - appSettings.scrollThresholdX)
            scrollValue.x = - scrollSpeed.x;

        // execute scroll
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

    // Zoom function
    function zoomPage(zoomFactor) {
        chrome.runtime.sendMessage({zoomFactor: zoomFactor}, function (response) {
            if (response.zoomDone === 'zoomed') {
                if(zoomFactor > 0 && DEBUG)
                    console.log('Zoom Out');
                else if(zoomFactor < 0 && DEBUG)
                    console.log('Zoom In');
            }
        });
    }

    // Refresh function that currently has the best accuracy.
    function RefreshPage() {
        if(DEBUG)
            console.log("Refreshing page");
        location.reload();
    }

    // new center setup function
    function NewCenterSetup() {
        if(DEBUG)
            console.log("Append interactionBox setup DOM");
        $('body').append('<dialog style="position:fixed" class="modal" id=' + INTERACTION_BOX_SETUP_DOM_NAME + '>' +
            '<div class="modal-content">' +
            '<h3>New Interaction Center Setup</h3>' +
            '<p>If you wish to change the center of your interaction with the relaxed position of ' +
            'your hand, please put your hand in that position and click <strong>OK</strong>. Otherwise click ' +
            '<strong>Cancel</strong>.</p>' +
            '<br><div>' +
            '<button id="cancelModal">Cancel</button>' +
            '<button id="okModal">OK</button>' +
            '</div></div></dialog>');

        var setupDialog = $('#' + INTERACTION_BOX_SETUP_DOM_NAME)[0];
        setupDialog.showModal();
        setupModalOpen = true;
        document.getElementById('cancelModal').addEventListener('click', function (e) {
            if(DEBUG)
                console.log('Center setup canceled');
            setupDialog.close();
        });
        document.getElementById('okModal').addEventListener('click', function (e) {
            if(DEBUG)
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
        var newCenterArray = [];

        // convert stored newCenter json format to array
        for(var axis in appSettings.newCenter)
            newCenterArray.push(appSettings.newCenter[axis]);

        // calculate new coordinates
        for (var i = 0; i < 3; i++) {
            newCoordinates[i] = currentPos[i] - newCenterArray[i];
        }
        return newCoordinates;
    }

});
// end leap loop

var timeout;
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
            // append animation to show it again
            statusPlaceholderDom.fadeTo(0, 1);
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
            // append animation to show it again
            statusPlaceholderDom.fadeTo(0, 1);
        },  appSettings.fpsScaleFactor * 20);
    }
    else if(action === 'connected') {
        DOMPosition('bottom');
        // clear animation queue and fadeOut instantly
        leapNotificationDom.stop(true, true).fadeOut(1);
        imgURL = connectedImage;
    }
    else if(action === 'disconnected') {
        DOMPosition('bottom');
        imgURL = disconnectedImage;
    }

    // assign image
    statusImageDom.attr('src', imgURL);
    FadeStatusImg(true);
}

// Reposition the status image
function DOMPosition(position) {
    if(appSettings.notificationPos || position === 'bottom')
        statusPlaceholderDom.attr('class', 'bottom-notification');
    else {
        if(position === 'right')
            statusPlaceholderDom.attr('class', 'right-notification');
        else if(position === 'left')
            statusPlaceholderDom.attr('class', 'left-notification');
        else
            statusPlaceholderDom.attr('class', 'middle-notification');
    }
}

// push notification on top of page
function PushNotification(message, color) {
    // status message notification
    function StatusMessage(message, color) {
        // check for type/color of notification message
        if (color === 'error')
            leapNotificationDom.css("background-color", "#ff0000");
        else if (color === 'info')
            leapNotificationDom.css("background-color", "#3aff31");
        leapNotificationDom.fadeIn("slow").text(message);
        leapNotificationDom.fadeTo(3000, 500).fadeOut("slow");
        if(DEBUG)
            console.log("Push notification");
    }
    // first invoke of notification
    StatusMessage(message, color);
    // execute the notification in an interval
    // clearInterval(messageInterval);
    messageInterval = setInterval(function() {
        StatusMessage(message, color)
    }, 10000);
}

// fade in or out the status image
function FadeStatusImg(state) {
    // it is not stopping like the actions are in a queue.
    if(state) {
        // statusPlaceholderDom.show();
        statusPlaceholderDom.fadeTo(0, 1);
    }
    else
        statusPlaceholderDom.fadeTo(300, 0);
}

// add the status icon placeholder to the DOM of the page
function AddDOMElement() {
    // DOM for status image
    $('body').append('<div id=' + STATUS_DIV_DOM_NAME + '>' +
        '<img id=' + STATUS_IMAGE_DOM_NAME + ' src="" alt="scrolling" width="72" height="72"/></div>');

    // DOM for Connection status on top of page
    // window.onload = function () {
        var StatusAppendPos;
        if(document.querySelectorAll('header').length > 0)
            StatusAppendPos = 'header';
        else
            StatusAppendPos = 'body';
        $(StatusAppendPos).append('<div id=' + NOTIFICATION_MESSAGE_DOM_NAME + '></div>');
    // };

    // log event
    if(DEBUG)
        console.log("Added status image and notification message DOM");

    // get instances of created DOM elements to be used globally
    statusPlaceholderDom = $('#' + STATUS_DIV_DOM_NAME);
    statusPlaceholderDom.css('display', 'none');
    leapNotificationDom = $('#' + NOTIFICATION_MESSAGE_DOM_NAME);
    statusImageDom =  $('#' + STATUS_IMAGE_DOM_NAME);

    DOMPosition();
}

// show and hide DOM elements
function ShowDOMs(element, state) {
    if(element === NOTIFICATION_MESSAGE_DOM_NAME) {
        if (state) {
            leapNotificationDom.hide();
        }
        else {
            leapNotificationDom.show();
        }
    }
    else if(element === STATUS_DIV_DOM_NAME) {
        if (state) {
            statusPlaceholderDom.hide();
        }
        else {
            statusPlaceholderDom.show();
        }
    }
}

// leap events
controller.on('focus', function() {
    tab_has_focus = true;
    if(DEBUG)
        console.log("focus: " + tab_has_focus + " time: " + last_focus_time);
});
controller.on('blur', function() {
    tab_has_focus = false;
    last_focus_time = new Date().getTime() / 1000;
    if(DEBUG)
        console.log("blur: " + tab_has_focus + " time: " + last_focus_time);
});

// leap port and service connected and ready, this doesn't mean the device is connected physically
controller.on('ready', function() {
    console.log("LeapJS v" + Leap.version.full);
    console.log("ready. Service version: " + controller.connection.protocol);
});

// event handler to connect and disconnect to leap service port
controller.on('connect', function() {
    // set leap port connected and save it
    leap_status = 'Port connected';
    chrome.storage.local.set({leap_status: leap_status});
    // log
    if(DEBUG)
        console.log("connected with protocol v" + controller.connection.opts.requestProtocolVersion);
});
controller.on('disconnect', function() {
    // set leap port disconnected and save it
    leap_status = 'Port disconnected';
    chrome.storage.local.set({leap_status: leap_status});
    // log
    if(DEBUG)
        console.log("Port disconnect");
});

controller.on('deviceAttached', function(deviceInfo) {
    deviceAttached(deviceInfo);
});
controller.on('deviceRemoved', function(deviceInfo) {
    deviceRemoved(deviceInfo);
});

controller.on('deviceStreaming', function(deviceInfo) {
    // this line only to support Linux, since the deviceAttached is not triggered for some reason
    deviceAttached(deviceInfo);

    // set runtime flag
    streaming = true;
    if(DEBUG)
        console.log("deviceStreaming", deviceInfo);
});
controller.on('deviceStopped', function(deviceInfo) {
    // this line only to support Linux, since the deviceRemoved is not triggered for some reason
    deviceRemoved(deviceInfo);

    // set runtime flag
    streaming = false;
    if(DEBUG)
        console.log("deviceStopped", deviceInfo);
});

// method to handle event when device physically removed
function deviceAttached(deviceInfo) {
    // set required flags
    attached = true;
    ConnectionLost = false;
    // leap_status = 'Port disconnected';
    // chrome.storage.local.set({leap_status: leap_status});
    console.log("connected image from device attached");
    clearInterval(messageInterval);
    UpdateStatusImage('connected');
    if(DEBUG)
        console.log("deviceAttached", deviceInfo);
}

// method to handle event when the device is physically removed
function deviceRemoved(deviceInfo) {
    console.log("user_disconnect: " + user_disconnect);
    if(!user_disconnect) {
        attached = false;
        // show error notification message
        PushNotification('Connection to device has been lost!', 'error');
        // set required flags
        ConnectionLost = true;
        // update the lost time and leap_status
        LostTime = new Date().getTime() / 1000;
        if(DEBUG)
            console.log("deviceRemoved", deviceInfo);
    }
    UpdateStatusImage('disconnected');
    console.log("disconnected image from device removed");
    if(DEBUG)
        console.log("Connection lost!");
}

controller.on('streamingStarted', function(deviceInfo) {
    if(DEBUG)
        console.log("streamingStarted", deviceInfo);
});

controller.on('streamingStopped', function(deviceInfo) {
    if(DEBUG)
        console.log("streamingStopped", deviceInfo);
});
