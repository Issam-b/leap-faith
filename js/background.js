var tabSwitched, activeTabIndex, switchedTabIndex;
var tabsCount;
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		// check whether the tab sending message is current focused tab or not
		if (request.tab_status === 'current')
		{
			sendResponse({
				active: sender.tab.active,
				title: sender.tab.title,
				url: sender.tab.url
			});
		}
		if(request.tab_direction) {
			// get active tab id
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				activeTabIndex = tabs[0].index;
			});
			// get tabs in the current window only
            chrome.tabs.query({currentWindow: true}, function(tabs) {
				tabsCount = tabs.length;
				if (request.tab_direction === 'right') {
					switchedTabIndex = activeTabIndex + 1;
					// get tab with next index
					chrome.tabs.query({index: (activeTabIndex + 1) % tabsCount}, function(tabs) {
						// highlight tab and focus on it
						chrome.tabs.update(tabs[0].id, { highlighted: true, active: true });
						tabSwitched = 'switched';
					});
				}
				else if (request.tab_direction === 'left') {
					switchedTabIndex = activeTabIndex + 1;
                    // get tab with previous index
					chrome.tabs.query({index: (activeTabIndex - 1) % tabsCount}, function(tabs) {
                        // highlight tab and focus on it
						chrome.tabs.update(tabs[0].id, { highlighted: true, active: true });
						tabSwitched = 'switched';
					});
				}
			});
			sendResponse({ tabSwitched: tabSwitched });
		}
	}
);