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
	}
);
