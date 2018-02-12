/**
 * @file Leap motion chrome extension background page. It has a messaging listener
 * to handle switching tabs and zooming.
 * @author Assam Boudjelthia <assam.bj@gmail.com>
 * @version 0.1
 */

var tabSwitched, activeTabIndex, switchedTabIndex;
var tabsCount;
var newZoom;
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
		// zoom page
		else if(request.zoomFactor) {
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