
var browser = chrome || browser;

function onContextCLick(info, tab) {
    browser.tabs.query({
        "active": true,
        "currentWindow": true
    }, function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            "functiontoInvoke": "readSelectedText",
			"selectedText": info.selectionText
        });
    });
}
function onReadSelectionShortcut() {
    browser.tabs.query({
        "active": true,
        "currentWindow": true
    }, function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            "functiontoInvoke": "readSelectedText"
        });
    });
}

function onIconClick(info, tab) {
    browser.tabs.query({
        "active": true,
        "currentWindow": true
    }, function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            "functiontoInvoke": "readFullPage"
        });
    });
}

// Write this in an expandable way in case we want to move beyond selection
var contexts = ["selection"];
for (var i = 0; i < contexts.length; i++) {
    var context = contexts[i];
    var title = "Read Selected Text";
    var id = browser.contextMenus.create({
        "title": title,
        "contexts": [context],
        "onclick": onContextCLick
    });
}

// Handle clicking on the browser icon
browser.browserAction.onClicked.addListener(function(tab) { onIconClick(); });
browser.commands.onCommand.addListener(function(command) {
    if(command === 'read_selection') { onReadSelectionShortcut(); }
});