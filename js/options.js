//TODO: add the scroll step size to the options page
// Saves options to chrome.storage

var Enable_extension, Enable_on_startup, NotificationCenter, NotificationBottom, Scroll,
    History_switch, Tab_switch, Refresh, Zoom, ScrollSpeed, continuousScroll, scrollThresholdX,
    scrollThresholdY, scrollStepX, scrollStepY, connectionTimeOut, fpsScaleFactor,
    discreteActionDelay, /*refreshThreshold, historyThreshold,*/ zoomScale, setupDone;

function save_options() {
    chrome.storage.local.set({
        extensionOn : Enable_extension.checked,
        // startOn: Enable_on_startup.checked,
        notificationPos: NotificationBottom.checked,
        scrollOn: Scroll.checked,
        historyOn: History_switch.checked,
        tabOn: Tab_switch.checked,
        refreshOn: Refresh.checked,
        zoomOn: Zoom.checked,
        // scrollSpeed: ScrollSpeed.value,
        continuousScroll: continuousScroll.checked,
        scrollThresholdX: scrollThresholdX.value,
        scrollThresholdY: scrollThresholdY.value,
        scrollStepX: scrollStepX.value,
        scrollStepY: scrollStepY.value,
        connectionTimeOut: connectionTimeOut.value,
        fpsScaleFactor: fpsScaleFactor.value,
        discreteActionDelay: discreteActionDelay.value,
        // refreshThreshold: refreshThreshold.value,
        // historyThreshold: historyThreshold.value,
        zoomScale: zoomScale.value,
        setupDone: !setupDone.checked
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        console.log("Options saved!")
        status.textContent = 'Options saved.';
        setTimeout(function() {status.textContent = '';}, 5000);

        // console.log("notifying active tab");
        // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        //     console.log()
        //     chrome.tabs.sendMessage(tabs[0].id, {updateSettings: true}, function (response) {
        //         if(response === 'OK')
        //             console.log("Active tab notified and updated");
        //     });
        // });
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    chrome.storage.local.get([
        "extensionOn","startOn", "notificationPos", "scrollOn", "historyOn",
        "tabOn", "refreshOn", "zoomOn", "scrollSpeed", "scrollStep",
        "continuousScroll", "scrollThresholdX", "scrollThresholdY", "scrollStepX",
        "scrollStepY", "connectionTimeOut", "fpsScaleFactor", "discreteActionDelay",
        /*"refreshThreshold", "historyThreshold",*/ "zoomScale", "setupDone"],
        function(items) {
            Enable_extension.checked = items.extensionOn;
            // Enable_on_startup.checked = items.startOn;
            NotificationCenter.checked = !items.notificationPos;
            NotificationBottom.checked = items.notificationPos;
            Scroll.checked = items.scrollOn;
            History_switch.checked = items.historyOn;
            Tab_switch.checked = items.tabOn;
            Refresh.checked = items.refreshOn;
            Zoom.checked = items.zoomOn;
            // ScrollSpeed.value = items.scrollSpeed;
            continuousScroll.checked = items.continuousScroll;
            scrollThresholdX.value = items.scrollThresholdX;
            scrollThresholdY.value = items.scrollThresholdY;
            scrollStepX.value = items.scrollStepX;
            scrollStepY.value = items.scrollStepY;
            connectionTimeOut.value = items.connectionTimeOut;
            fpsScaleFactor.value = items.fpsScaleFactor;
            discreteActionDelay.value = items.discreteActionDelay;
            // refreshThreshold.value = items.refreshThreshold;
            // historyThreshold.value = items.historyThreshold;
            zoomScale.value = items.zoomScale;
            setupDone.checked = !items.setupDone;
        });
}

function defaults() {
    Enable_extension.checked = true;
    // Enable_on_startup.checked = true;
    NotificationCenter.checked = false;
    NotificationBottom.checked = true;
    Scroll.checked = true;
    History_switch.checked = true;
    Tab_switch.checked = true;
    Refresh.checked = true;
    Zoom.checked = true;
    // ScrollSpeed.value = 5;
    continuousScroll.checked = false;
    scrollThresholdX.value = 10;
    scrollThresholdY.value = 10;
    scrollStepX.value = 10;
    scrollStepY.value = 10;
    connectionTimeOut.value = 5;
    fpsScaleFactor.value = 20;
    discreteActionDelay.value = 500;
    // refreshThreshold.value = 2;
    // historyThreshold.value = 1;
    zoomScale.value = 0.1;
    setupDone.checked = true;
    var status = document.getElementById('status');
    console.log("Restoring default settings");
    // Update status to let user know options were saved.
    status.innerHTML = 'Default options shown, please save!' + '<br />';
    status.innerHTML  += '<strong>Note:</strong> if you keep \"<strong>Reset Calibration setup</strong>\" checked you will have to recalibrate again!';
    setTimeout(function() { status.textContent = '';}, 5000);
}

document.addEventListener('DOMContentLoaded', restore_options);
window.onload = function() {
    // get DOM objects
    Enable_extension = document.getElementById('Enable_extension');
    // Enable_on_startup = document.getElementById('Enable_on_startup');
    NotificationCenter = document.getElementById('NotificationCenter');
    NotificationBottom = document.getElementById('NotificationBottom');
    Scroll = document.getElementById('Scroll');
    History_switch = document.getElementById('History_switch');
    Tab_switch = document.getElementById('Tab_switch');
    Refresh = document.getElementById('Refresh');
    Zoom = document.getElementById('Zoom');
    // ScrollSpeed = document.getElementById('ScrollSpeed');
    continuousScroll = document.getElementById('continuousScroll');
    scrollThresholdX = document.getElementById('scrollThresholdX');
    scrollThresholdY = document.getElementById('scrollThresholdY');
    scrollStepX = document.getElementById('scrollStepX');
    scrollStepY = document.getElementById('scrollStepY');
    connectionTimeOut = document.getElementById('connectionTimeOut');
    fpsScaleFactor = document.getElementById('fpsScaleFactor');
    discreteActionDelay = document.getElementById('discreteActionDelay');
    // refreshThreshold = document.getElementById('refreshThreshold');
    // historyThreshold = document.getElementById('historyThreshold');
    zoomScale = document.getElementById('zoomScale');
    setupDone = document.getElementById('setupDone');

    document.getElementById('restore').addEventListener('click', defaults);
    document.getElementById('save').addEventListener('click', save_options);
};