// button onclick event
$(document).ready( function() {
    UpdateStatus();
    $('#button').on('click', function() {
        UpdateStatus();
    });
});

function UpdateStatus() {
    chrome.storage.sync.get('leap_status', function (items) {
        console.log(items);
        if(items.leap_status === 'connected') {
            $('#button').removeClass('on');
            chrome.runtime.sendMessage({popUpAction: 'disconnect'}, function (response) {
                console.log(response);
            });
        }
        else if(items.leap_status === 'disconnected') {
            $('#button').addClass('on');
            chrome.runtime.sendMessage({popUpAction: 'connect'}, function (response) {
                console.log(response);
            });
        }
    });
}