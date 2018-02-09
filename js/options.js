//TODO: add the scroll step size to the options page
// Saves options to chrome.storage
function save_options() {
    var notificationPos;
    if(document.getElementById('NotificationsCenter').checked)
        notificationPos = false;
    else if (document.getElementById('NotificationsBottom').checked)
        notificationPos = true;

    chrome.storage.local.set({
        extensionOn : document.getElementById('Enable_extension').checked,
        startOn: document.getElementById('Enable_on_startup').checked,
        NotificationPos: notificationPos,
        scrollOn: document.getElementById('Scroll').checked,
        historyOn: document.getElementById('History_switch').checked,
        tabOn: document.getElementById('Tab_switch').checked,
        refreshOn: document.getElementById('Refresh').checked,
        zoomOn: document.getElementById('Zoom').checked,
        scrollSpeed: document.getElementById('ScrollSpeed').value,
        scrollStepX: 5,
        scrollStepX: 5
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    chrome.storage.local.get([
        "extensionOn","startOn", "NotificationPos", "scrollOn", "historyOn",
        "tabOn", "refreshOn", "zoomOn", "scrollSpeed", "scrollStep"], function(items) {
        document.getElementById('Enable_extension').checked = items.extensionOn;
        document.getElementById('Enable_on_startup').checked = items.startOn;
        document.getElementById('NotificationsCenter').checked = !items.NotificationPos;
        document.getElementById('NotificationsBottom').checked = items.NotificationPos;
        document.getElementById('Scroll').checked = items.scrollOn;
        document.getElementById('History_switch').checked = items.historyOn;
        document.getElementById('Tab_switch').checked = items.tabOn;
        document.getElementById('Refresh').checked = items.refreshOn;
        document.getElementById('Zoom').checked = items.zoomOn;
        document.getElementById('ScrollSpeed').value = items.scrollSpeed;
        document.getElementById('scrollValue').innerHTML = items.scrollSpeed;
    });
}

function defaults() {

    document.getElementById('Enable_extension').checked = true;
    document.getElementById('Enable_on_startup').checked = true;
    document.getElementById('NotificationsCenter').checked = false;
    document.getElementById('NotificationsBottom').checked = true;
    document.getElementById('Scroll').checked = true;
    document.getElementById('History_switch').checked = true;
    document.getElementById('Tab_switch').checked = true;
    document.getElementById('Refresh').checked = true;
    document.getElementById('Zoom').checked = true;
    document.getElementById('ScrollSpeed').value = 5;
    document.getElementById('scrollValue').innerHTML = "5";

    console.log("Restoring default settings");
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Default options shown, please save!';
    setTimeout(function() {
        status.textContent = '';
    }, 750);
}

document.addEventListener('DOMContentLoaded', restore_options);
window.onload = function() {
    // update scroll speed slider
    var ScrollSpeedSlider = document.getElementById("ScrollSpeed");
    var scrollValue = document.getElementById("scrollValue");
    scrollValue.innerHTML = ScrollSpeedSlider.value;
    ScrollSpeedSlider.oninput = function() {
        scrollValue.innerHTML = this.value;
    };

    document.getElementById('restore').addEventListener('click', defaults);
    document.getElementById('save').addEventListener('click', save_options);
};