/* main.js
*
* TODO:
* - Cache whole page text when possible/read
* - Cache reading progress?
* - Remove html parsing from sbd node module
* - Break this up into more descrete modules
* - Combine Words.js and WordNav.js
*
* DONE:
* - Cache options and prevent them from being reset on
* 	close of extension
* - Trigger pause on clicking of central element, not
* 	just text
* - Add function "cleanNode" to get rid of unwanted elements
*
*
* WARNING:
* WARNING:
* Storage is all user settings. Too cumbersome otherwise for now.
*/

(function(){

	// ============== SETUP ============== \\
	var $ 			= require('jquery');

	var Parser 		= require('./lib/parse/Parser.js'),
		ParserSetup = require('./lib/ParserSetup.js');

	var Settings 	= require('./lib/settings/Settings.js'),
		Storage 	= require('./lib/ReaderlyStorage.js'),
		WordNav 	= require('./lib/parse/WordNav.js'),
		WordSplitter= require('./lib/parse/WordSplitter.js'),
		Delayer 	= require('@knod/string-time'),
		Timer 		= require('./lib/playback/ReaderlyTimer.js'),
		Display 	= require('./lib/ReaderlyDisplay.js'),
		PlaybackUI 	= require('./lib/playback/PlaybackUI.js'),
		SettingsUI 	= require('./lib/settings/ReaderlySettings.js'),
		SpeedSetsUI = require('./lib/settings/SpeedSettings.js'),
		WordSetsUI 	= require('./lib/settings/WordSettings.js');

	var parser, fragmentor, wordNav, storage, delayer, timer, coreDisplay, playback, settingsUI, speed;


	var addEvents = function () {
		$(timer).on( 'starting', function showLoading() { playback.wait(); })
	};  // End addEvents()


	var afterLoadSettings = function ( oldSettings ) {
		var setts 	= new Settings( storage, oldSettings );
		delayer 	= new Delayer( setts._settings );
		timer 		= new Timer( delayer );
		coreDisplay = new Display( timer, undefined, setts );

		textElem 	= coreDisplay.nodes.textElements;
		fragmentor 	= new WordSplitter( textElem, setts );

		playback 	= new PlaybackUI( timer, coreDisplay );
		settingsUI 	= new SettingsUI( coreDisplay );
		speedSetsUI = new SpeedSetsUI( setts, settingsUI );
		wordSetsUI 	= new WordSetsUI( setts, settingsUI );

		addEvents();
	};  // End afterLoadSettings()


	var getParser = function () {
		var pSup = new ParserSetup();
		// FOR TESTING
		pSup.debug = false;

		// Functions to pass to parser
		var cleanNode 		= pSup.cleanNode,
			detectLanguage 	= pSup.detectLanguage,
			findArticle 	= pSup.findArticle,
			cleanText 		= pSup.cleanText,
			splitSentences 	= pSup.splitSentences;

		return new Parser( cleanNode, detectLanguage, findArticle, cleanText, splitSentences );
	};  // End getParser()


	var init = function () {

		parser  = getParser();
		parser.debug = false;

		wordNav = new WordNav();
		storage = new Storage();

		// !!!FOR DEBUGGING ONLY!!!
		if ( false ) {
			storage.clear()
			console.log('cleared storage');
		}

		storage.loadAll( afterLoadSettings );
	};  // End init()


	// ============== START IT UP ============== \\
	init();



	// ============== RUNTIME ============== \\
	var read = function ( node ) {

		var sentenceWords = parser.parse( node );  // returns [[Str]]

		if (parser.debug) {  // Help non-coder devs identify some bugs
			console.log('~~~~~parse debug~~~~~ If any of those tests failed, the problem isn\'t with Readerly, it\'s with one of the other libraries. That problem will have to be fixed later.');
		}

		wordNav.process( sentenceWords, fragmentor );
		timer.start( wordNav );
		return true;
	};


	var openReaderly = function () {
		coreDisplay.open();
		playback.wait();  // Do we need this?
	};


	var stripNodes = function (node) {
		var elements = node.querySelectorAll('sup, script, style, head, .off-screen');
		for (var i = 0; i < elements.length; i++) {
			elements[i].parentElement.removeChild(elements[i]);
		}
	}


	var readSelectedText = function(){
		var selection   = document.getSelection();
		var docFragment = selection.getRangeAt(0).cloneContents();

		stripNodes(docFragment);

		var cleaned = String(docFragment.textContent);

		openReaderly();
		return cleaned ? read(cleaned) : false;
	};


	var readArticle = function () {
		openReaderly();
		var $clone = $('html').clone();
		read( $clone[0] );
	};

	// walk up the DOM until we have a node containing some text
	var findTextNode = function (node) {
		while (node.textContent === '' && node.parentElement !== null) {
			node = node.parentElement;
		}

		return node;
	}

	var lastTarget;
	var lastSelected;
	var selected = [];

	var multiSelect = function (event) {
		lastSelected = undefined;
		var target = findTextNode(event.target);

		// if already selected, deselect
		var index = selected.indexOf(target);
		if (index !== -1) {
			target.classList.remove('__rdly-selected');
			selected.splice(index, 1);
			return;
		}

		// don't do anything if the target is a sibling of an already selected node
		var contained = selected.some(function(node) {
			return node.contains(target);
		});
		if (contained) return;


		// if the target is a parent of any already selected nodes, remove them
		selected = selected.filter(function(node) {
			var sibling = target.contains(node);
			if (sibling) node.classList.remove('__rdly-selected');

			return !sibling;
		});

		target.classList.add('__rdly-selected');
		selected.push(target);
	}

	var finishMultiSelect = function () {
		var text = Array.from(document.getElementsByTagName("*"))
			.filter(function(node) {
				return selected.indexOf(node) !== -1;
			})
			.map(function(node) {
				var clone = node.cloneNode(true);
				stripNodes(clone);

				return clone.textContent;
			})
			.join(' ');

		openReaderly();
		read(text);
	}

	var selectionMoved = function (event) {
		if (event.ctrlKey || lastTarget === event.target) return;

		lastSelected !== undefined
			&& lastSelected.classList !== undefined
			&& lastSelected.classList.remove('__rdly-selected');
		lastTarget = event.target;

		var selected = findTextNode(event.target);
		lastSelected = selected;

		selected.classList.add('__rdly-selected');
	}

	var selectionKeyUp = function (event) {
		switch (event.keyCode) {
			case 17: // Ctrl
				if (selected.length > 0) {
					finishMultiSelect();
					cleanupSelection();
				}
				break;

			case 27: // Esc
				cleanupSelection();
				break;

			default:
				return;
		}

		return false;
	}

	var selectionKeyDown = function (event) {
		switch (event.keyCode) {
			case 17: // Ctrl
				if (lastTarget !== undefined) {
					lastTarget.classList.remove('__rdly-selected');
					lastTarget = undefined;
				}
				break;

			default:
				return;
		}

		return false;
	}

	var selectionClicked = function (event) {
		event.preventDefault();
		event.stopPropagation();

		if (event.ctrlKey) {
			multiSelect(event);
		} else if (lastSelected) {
			openReaderly();
			var clone = lastSelected.cloneNode(true);
			stripNodes(clone);
			read(clone.textContent);

			cleanupSelection();
		}


		return false;
	}

	var getSelection = function () {
		// reset keyboard focus
		document.activeElement.blur();

		document.addEventListener('mousemove', selectionMoved);
		document.addEventListener('click', selectionClicked);
		document.addEventListener('keyup', selectionKeyUp);
		document.addEventListener('keydown', selectionKeyDown);
	}

	var halveSpeed = function () {
		var checkbox = coreDisplay.nodes.doc.getElementById('__rdly_halvespeed_input')
		checkbox.checked = !checkbox.checked
		checkbox.dispatchEvent(new Event('change'))
	}

	function cleanupSelection() {
		document.removeEventListener('mousemove', selectionMoved);
		document.removeEventListener('click', selectionClicked);
		document.removeEventListener('keyup', selectionKeyUp);
		document.removeEventListener('keydown', selectionKeyDown);

		if (lastSelected) {
			lastSelected.classList.remove('__rdly-selected');
		}

		for (var i = 0; i < selected.length; i++) {
			var element = selected[i];
			element.classList.remove('__rdly-selected');
		}

		selected = [];
		lastSelected = undefined;
		lastTarget = undefined;
	}

	// ==============================
	// EXTENSION EVENT LISTENER
	// ==============================
	var browser = chrome || browser;

	browser.extension.onMessage.addListener(function (request, sender, sendResponse) {
		switch (request.functiontoInvoke) {
			case "readSelectedText":
				readSelectedText();
				break;
			case "readFullPage":
				readArticle();
				break;
			case "getSelection":
				getSelection();
				break;
			case "halveSpeed":
				halveSpeed();
				break;
		}

	});  // End event listener

})();
