var animationCSS = function() {
	var animationEnd_ = ['webkitAnimationEnd', 'mozAnimationEnd', 
					    'MSAnimationEnd', 'oanimationend', 'animationend'];

	// Analogous to .one() in jQuery
	var addMultipleListeners = function(element, events, handler) {
		if (element && events && typeof handler === 'function') {
			for (var i = 0; i < events.length; i++) {
				element.addEventListener(events[i], handler);
			}
		}
	};

	var removeMultipleListeners = function(element, events, handler) {
		if (element && events && typeof handler === 'function') {
			for (var i = 0; i < events.length; i++) {
				element.removeEventListener(events[i], handler);
			}
		}
	};

	var hasClass = function(element, className) {
		if (element && className) {
		    return element.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
		} else {
			return null;
		}
	};

	var removeClass = function(element, className) {
        if (!hasClass(element, className)) return;
        element.className = element.className.replace(new RegExp('(\\s|^)'+className+'(\\s|$)'), '');
    };

    var stop = function(element, originalName) {
    	if (!element) return;

		element.className = originalName;
		// arguments.callee is the anonymous function that called stop()
		removeMultipleListeners(element, animationEnd_, arguments.callee);
    };

	var start = function(element, originalClass, animationName, loop) {
		var prefix = 'animated ' + ((loop) ? 'infinite ' : '');
		var animatedClass = prefix + animationName;

		if (!(element && animationName) || hasClass(element, animatedClass)) return;

		element.className += ' ' + animatedClass;
		if (!loop) {
			addMultipleListeners(element, animationEnd_, function() {
				stop(element, originalClass);
			});
		}
	}

	return {
		start: start,
		stop: stop,
	}
}

var musicPlayer = function() {
	var audio_ = null;

	var repeat = function() {
		audio_.currentTime = 0;
		audio_.play();
	}

	return {
		play: function(id, loop) {
			if (!id) return;

			audio_ = document.getElementById(id);
			audio_.play();
			(loop) ? audio_.addEventListener('ended', repeat) : null;
		},
		stop: function() {
			if (!audio_) return;

			audio_.removeEventListener('ended', repeat);
			audio_.currentTime = 0;
			audio_.pause();
		}
	}
}

var app = function() {
	// Constants representing states of the timer
	var PLAYING = 0, PAUSED = 1, STOPPED = 2;

	// Private parts
	var state_          = -1;

	var duration_       = null, intervalID_     = null;

	var hoursDisplay_   = null, minutesDisplay_ = null, 
		secondsDisplay_ = null, timerDisplay_   = null;

	var startButton_    = null, pauseButton_    = null, stopButton_ = null;
	var timerClassName_ = '';

	// Helper object for animation and sound
	var animation_      = animationCSS();
	var soundPlayer_    = musicPlayer();

	// Private functions
	var bindTextFields = function() {
		var fillEmptyField = function(field) {
			switch(field) {
				case 'h': hoursDisplay_.value   = (hoursDisplay_.value   === '') ? 0 : hoursDisplay_.value;   break;
				case 'm': minutesDisplay_.value = (minutesDisplay_.value === '') ? 0 : minutesDisplay_.value; break;
				case 's': secondsDisplay_.value = (secondsDisplay_.value === '') ? 0 : secondsDisplay_.value; break;
			}
		};

		hoursDisplay_.onblur    = function() {fillEmptyField('h');};
		minutesDisplay_.onblur  = function() {fillEmptyField('m');};
		secondsDisplay_.onblur  = function() {fillEmptyField('s');};
		hoursDisplay_.onclick   = hoursDisplay_.select;
		minutesDisplay_.onclick = minutesDisplay_.select;
		secondsDisplay_.onclick = secondsDisplay_.select;
	};

	var bindButtons = function() {
		startButton_.onclick = start;
		pauseButton_.onclick = pause;
		stopButton_.onclick  = stop;
	};

	var bindShortcuts = function() {
		document.onkeypress = function(e) {
		    e = e || window.event;
		    if (e.keyCode == 13 || (e.keyCode == 32 && state_ === PAUSED)) {
		    	startButton_.click();
		    } else if (e.keyCode == 32 && state_ === PLAYING) {
		    	pauseButton_.click();
		    }
		};
	};

	var validate = function() {
		var hours   = (hoursDisplay_)   ? hoursDisplay_.value   : null,
		    minutes = (minutesDisplay_) ? minutesDisplay_.value : null,
			seconds = (secondsDisplay_) ? secondsDisplay_.value : null;

		var isNumeric = function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		};

		return isNumeric(hours) && isNumeric(minutes) && isNumeric(seconds);
	};

	var getTime = function() {
		return {
			hours  : parseInt(hoursDisplay_.value),
			minutes: parseInt(minutesDisplay_.value),
			seconds: parseInt(secondsDisplay_.value),
		};
	};

	var updateDisplay = function(hours, minutes, seconds) {
		if (!(hoursDisplay_ && minutesDisplay_ && secondsDisplay_)) return;

		hoursDisplay_.value   = hours;
		minutesDisplay_.value = minutes;
		secondsDisplay_.value = seconds;
	};

	// Automatically decrease the duration by 1 second, but if the tab is inactive,
	// which means that the real time elapsed is larger than 1 second, we will decrease
	// that amount instead to make up for the delayed time.
	var tick = function(secondsElapsed) {
		if (!duration_) return;

		secondsElapsed = (secondsElapsed > 1) ? secondsElapsed : 1;
		if (duration_.asSeconds() > 0) {
			duration_.subtract(secondsElapsed, 's');
			updateDisplay(duration_.hours(), duration_.minutes(), duration_.seconds());
		} else {
			stop();
			soundPlayer_.play('alert', true);
			animation_.start(timerDisplay_, timerClassName_, 'pulse', true);
		}
	};

	var start = function() {
		if (state_ === PLAYING) return;

		if (validate()) {
			state_      = PLAYING;
			duration_   = moment.duration(getTime());

			var before = moment(), after  = null; // check-points for computing elapsed time
			intervalID_ = window.setInterval(function() {
				after = moment();
				tick(Math.round(after.diff(before) / 1000)); // real-time seconds elapsed
				before = after;
			}, 1000);
		} else {
			animation_.start(timerDisplay_, timerClassName_, 'shake', false);
		}
	};

	var pause = function() {
		if (state_ === STOPPED) return;

		state_ = PAUSED;
		window.clearInterval(intervalID_);
	};

	var stop = function() {
		state_ = STOPPED;
		duration_ = null;
		updateDisplay(0, 0, 0);
		soundPlayer_.stop();
		animation_.stop(timerDisplay_, timerClassName_);
		window.clearInterval(intervalID_);
	};

	return {
		init: function(timerDiv, hoursText, minutesText, secondsText, 
					   startBtn, pauseBtn, stopBtn) {
			if (timerDiv    && hoursText && minutesText &&
				secondsText && startBtn  && pauseBtn    && stopBtn) {
				timerClassName_ = timerDiv.className;

				timerDisplay_   = timerDiv;
				hoursDisplay_   = hoursText; 
				minutesDisplay_ = minutesText;
				secondsDisplay_ = secondsText;

				startButton_ = startBtn;
				pauseButton_ = pauseBtn;
				stopButton_ = stopBtn;

				bindTextFields();
				bindButtons();
				bindShortcuts();
			} else {
				throw new Error('Initialization parameters must not be null!');
			}
		}
	}
};

var timer = app();
timer.init(document.getElementById('timePlayer'), // main timer div
		   document.getElementById('hours'),	  // hours text field
		   document.getElementById('minutes'),    // minutes text field
		   document.getElementById('seconds'),    // seconds text field
		   document.getElementById('start'),      // start button
		   document.getElementById('pause'),      // pause button
		   document.getElementById('stop'));      // stop button