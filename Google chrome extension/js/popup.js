// button onclick event after page is loaded
window.onload = function() {
    $(document).ready( function() {
        $('#button').on('click', function() {
            $(this).toggleClass('on');
               ToggleState();
        });
    });

    StartUpdateStatus();
    $('#button').on('click', function() {
        UpdateStatus();
    });
};

// update the status of the leap device and the light indication
function UpdateStatus() {
    chrome.storage.sync.get('leap_status', function (items) {
        console.log("storage: " + JSON.stringify(items));
        // if the current state is connected, send message to disconnect
        if(items.leap_status === 'connected') {
            // send message to disconnect the leap motion
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {popUpAction: 'disconnect'}, function (response) {
                    console.log("response: " + JSON.stringify(response));
                    // if disconnect was successful then light to red
                    if (response != null && response.leap_status === "disconnected")
                        $('#button').removeClass('on');
                });
            });
        }
        // if the current state is disconnected, send message to connect
        else if(items.leap_status === 'disconnected') {
            // send message to connect the leap motion
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {popUpAction: 'connect'}, function (response) {
                    console.log(response);
                    // if connect was successful then light to green
                    if (response != null && response.leap_status === "disconnected")
                        $('#button').addClass('on');
                });
            });
        }
    });
}

// get initial/current state of the leap device on extension start
function StartUpdateStatus() {
    chrome.storage.sync.get('leap_status', function (items) {
        if(items.leap_status === 'connected') {
            $('#button').addClass('on');
        }
        else if(items.leap_status === 'disconnected') {
            $('#button').removeClass('on');
        }
    });
}