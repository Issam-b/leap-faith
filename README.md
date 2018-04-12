# leap of Faith Chrome extension
This is a chrome extension that allows basic control for web pages within the Google Chrome browser via the LEAP MOTION controller. It detects gestures from the user to invoke actions *scroll* (vertically and horizontally), *refresh* the page, *zoom in/out*, *navigate* through the page's history and *switch tabs*.

The aim from this extension is to have basic controls, and good looking visual feedback to the user.

**Note:** This extension requires a Leap Motion controller to run (see https://www.leapmotion.com/).

# First run and setup
To downoad the extension from the **Chrome store** visit this [link](https://chrome.google.com/webstore/detail/leap-of-faith/clmfjbffimjbmkbknmhflghngplomdka).

At first run, the device has to be running and the Leap Motion Contol Panel and service has to be running. The feature in control panel "Allow web apps" has to enabled.
```
Leap Motion Control Panel -> General -> Allow web apps
```
A first setup dialog will be prompted at first to set a center for your interaction box in the aria above the device. Please place your hand in a relaxed position with the elbow on the table for example and click **OK**.

![first setup](images/demo/interactionBox_setup.PNG?raw=true "Interaction box setup")

# Gestures feedback
With each gesture, a status icon will be shown to the user either on the bottom right edge of the page or at the middle (edges). The user can select either option from the options page.

The options page has a very customizable list of options that the user can configure.
![Options page](images/demo/options_page.PNG?raw=true "The options page")

# Gestures and actions
Now there's only 5 gestures ( I intend to add more later :)
# Video
The gestures are illustrated in the pictures and video below:

[![Gestures and UI preview](https://img.youtube.com/vi/bOg5ZyjB8rg/0.jpg)](https://www.youtube.com/watch?v=2ARdRAaod3A)

# Picture illustrations
![Scroll_history](images/demo/scroll_history.png?raw=true "Scroll page and navigate history")

To make a scroll event, the user must stretch his hand so the fingers are all detected as extended. Thus, to scroll up/down the page, a slight upward/downward movement of the
hand is all what’s required. Also, with the hand opened as in Figure 21, when a user swipes to
the left/right, the browser switches page to backward/forward history.

![zoom](images/demo/zoom.png?raw=true "Zoom the page")

To move through the browser’s tabs, two fingers must be extended. It’s preferable
to put the hand in this position for bit of time (i.e. ~1 second) then swipe left or right.

![refresh](images/demo/refresh.png?raw=true "Refresh page")

To refresh just rotate the extended index finger once or twice.

![Switch tabs](images/demo/switch_tabs.png?raw=true "Switch between tabs")

The user has to use a fist-like hand with only thumb extended (other fingers folded).
Then move the hand to front and to back (closer to screen and away from screen above the device).
Then, to stop just fold the thumb or extend your other fingers.

The extension was tested on Chrome browser on Windows 10 and Arch Linux OS.


# Limitations
The scroll may not work in pages that use non-native scroll bars. Also the extension will not work in a new tab page, unless you have set a new tab to be a particular web page. This is due to Chrome limitations on extensions.
