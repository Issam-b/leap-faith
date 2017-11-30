chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		if (request.tab_status == 'current')
		{
			sendResponse({
				active: sender.tab.active,
				title: sender.tab.title,
				url: sender.tab.url
			});
		}
		else if(request.connection == 'lost')
		{
			chrome.browserAction.setBadgeText({text: "OFF"});

			sendResponse({ connection: 'lost' });
		}
	}
);
