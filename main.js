/* main.js
* 
* TODO:
* - Cache whole page text when possible/read
*/

(function(){

	// var r; // Read Object
	var readOptions = {
		"wpm": 300,
		"slowStartCount": 5,
		"sentenceDelay": 2.5,
		"otherPuncDelay": 1.5,
		"shortWordDelay": 1.3,
		"longWordDelay": 1.4
	};

	// var Queue 	= window.Queue 	 = require('lib/Queue.js'),
	// 	Timer 	= window.Timer 	 = require('lib/ReaderlyTimer.js'),
	// 	Display = window.Display = require('lib/ReaderlyDisplay.js');

	// var queue = new require('lib/Queue.js')();

	var queue 		= new Queue(),
		timer 		= new ReaderlyTimer( readOptions ),
		mainDisplay = new ReaderlyDisplay( timer ),
		playback 	= new ReaderlyPlayback( timer, mainDisplay ),
		settings 	= new ReaderlySettings( timer, mainDisplay ),
		speed 		= new SpeedSettings( timer, settings );


	$(timer).on( 'starting', function showLoading() {
		mainDisplay.wait();
	})


	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {

		mainDisplay.show();
		mainDisplay.wait();

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) {
			playReadContent( request.selectedText );
		} else if ( func === "readFullPage" ) {
			var getArticle = $.get( 'https://readparser.herokuapp.com/?url=' + document.URL );
			getArticle.success(function( result ) {
				playReadContent( result );
			}).error(function( jqXHR, textStatus, errorThrown ) {
				var text = '';
				var elements = $('p, li, h1, h2, h3, h4, h5, h6, span, pre');
				elements.each(function(index, element) {
					element = $(element);
					var elementText = element
						.clone()
						.children('sup')
						.remove()
						.end()
						.text()
						.trim();
					if (elementText.length >= 60)
						if (!(element.tagName === 'LI' && elementText.includes('    ')))
							text += " " + elementText;
				});  // end for each desired element
				playReadContent(text);
			});  // end getArticle
		}
	});

	// What do these do?
	$(document).on( 'blur', '.__read .__read_speed', function () {
		var val = Math.min( 15000, Math.max( 0, parseInt(this.value,10)));
		setReadOptions( {"wpm": val} );
	});

	$(document).on( 'blur', '.__read .__read_slow_start', function () {
		var val = Math.min( 5, Math.max( 1, parseInt(this.value,10)));
		setReadOptions( {"slowStartCount": val} );
	});

	$(document).on( 'blur', '.__read .__read_sentence_delay', function () {
		var val = Math.min( 5, Math.max( 0, Number(this.value)));
		setReadOptions( {"sentenceDelay": val} );
	});

	$(document).on( 'blur', '.__read .__read_punc_delay', function () {
		var val = Math.min( 5, Math.max( 0, Number(this.value)));
		setReadOptions( {"otherPuncDelay": val} );
	});

	$(document).on( 'blur', '.__read .__read_short_word_delay', function () {
		var val = Math.min( 5, Math.max( 0, Number(this.value)));
		setReadOptions( {"shortWordDelay": val} );
	});

	$(document).on( 'blur', '.__read .__read_long_word_delay', function () {
		var val = Math.min( 5, Math.max( 0, Number(this.value)));
		setReadOptions( {"longWordDelay": val} );
	});

	// What do the chrome.whatever calls do?
	function setReadOptions ( myOptions ) {
		// readOptions = $.extend( {}, readOptions, myOptions );
		// chrome.storage.sync.clear(function () {
		// 	chrome.storage.sync.set(readOptions, function() {
		// 		//console.log('[READ] set:', readOptions);
		// 	});
		// });
	}

	// function getReadOptions () {
	// 	chrome.storage.sync.get(null, function ( myOptions ) {
	// 		readOptions = $.extend( {}, readOptions, myOptions );
	// 		//console.log('[READ] get:', readOptions);
	// 		r = new Read ( readOptions );
	// 	});
	// }

	function playReadContent ( text ) {
		// chrome.storage.sync.get(null, function ( myOptions ) {
		// 	readOptions = $.extend( {}, readOptions, myOptions );
		// 	//console.log('[READ] get:', readOptions);
		// 	r = new Read ( readOptions );

		// 	r.setText(text);
		// 	r.play();
		// });

		queue.process( text );
		timer.start( queue );

		return true;
	}

})();
