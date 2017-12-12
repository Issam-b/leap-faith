// TODO: needs to bind a message listener to the options.js

// Run this after page fully loads
window.onload = function () {
    stats_div = document.getElementById('stats');

    // Connect and disconnect buttons event listeners
    document.getElementById('bconnect').addEventListener("click", function () {
        //controller.connect();
    });
    document.getElementById('bdisconnect').addEventListener("click", function () {
        //controller.disconnect();
    });
};