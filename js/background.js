/**
 * @file Leap motion chrome extension background page. It has a messaging listener
 * to handle switching tabs and zooming.
 * @author Assam Boudjelthia <assam.bj@gmail.com>
 * @version 0.1
 */

var tabSwitched, activeTabIndex;
var tabsCount;
var newZoom;
var switchToTab;
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		if(request.tab_direction) {
			// get active tab id
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				activeTabIndex = tabs[0].index;
			});
			// get tabs in the current window only
            chrome.tabs.query({currentWindow: true}, function(tabs) {
				tabsCount = tabs.length;
				console.log(tabs);
				if (request.tab_direction === 'right') {
                    switchToTab = (activeTabIndex + 1) % tabsCount;
					// get tab with next index
					chrome.tabs.query({index: switchToTab}, function(tabs) {
						// highlight tab and focus on it
                        chrome.tabs.update(tabs[0].id, { highlighted: true, active: true });
						tabSwitched = 'switched';
					});
				}
				else if (request.tab_direction === 'left') {
                    switchToTab = (activeTabIndex - 1) % tabsCount;
                    if(switchToTab === -1)
                    	switchToTab = tabsCount - 1;
                    // get tab with previous index
					chrome.tabs.query({index: switchToTab}, function(tabs) {
                        // highlight tab and focus on it
                        chrome.tabs.update(tabs[0].id, { highlighted: true, active: true });
						tabSwitched = 'switched';
					});
				}
			});
			sendResponse({ tabSwitched: tabSwitched });
		}
		// zoom page
		if(request.zoomFactor) {
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.getZoom(tabs[0].id, function (zoomLevel) {
                    console.log(zoomLevel + " " + request.zoomFactor);
                    newZoom = zoomLevel - request.zoomFactor;
                    chrome.tabs.setZoom(tabs[0].id, newZoom, function () {});
                });
			});
			sendResponse({zoomDone: 'zoomed'});
        }
	}
);

// capture zoom changes and send to content page to reset status image zoom
// chrome.tabs.onZoomChange.addListener(function (){
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//         chrome.tabs.sendMessage(tabs[0].id, {DOMResize: true}, function (response) {
//             console.log("response: " + response.recoveredZoom);
//         });
//     });
// });