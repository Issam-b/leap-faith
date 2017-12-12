chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse)
    {
        if (request.tab_status == 'currentTab')
        {
            sendResponse({
                active: sender.tab.active,
                title: sender.tab.title,
                url: sender.tab.url
            });
        }
        else if(request.connection == 'lostLeap')
        {
            //chrome.browserAction.setBadgeText({text: "OFF"});

            sendResponse({ connection: 'lost' });
        }
    }
);