var tab_focus = false;

// Check if Current Tab has Focus, and only run this extension on the active tab
function check_focus()
{
	try {
		chrome.runtime.sendMessage({ tab_status: 'current' }, function(response) {
			if(response.active && window.location.href == response.url && document.hasFocus())
			{
				tab_has_focus = true;
			}
			else
			{
				tab_has_focus = false;
			}
		});
	}
	catch(error) {
		// If you clicked to reload this extension, you will get this error, which a refresh fixes
		if(error.message.indexOf('Error connecting to extension') !== -1)
		{
			document.location.reload(true);
		}
		// Something else went wrong... I blame Grumpy Cat
		else
		{
			console.error(error.message);
		}
	}
}