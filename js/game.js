

// If this file loads, hide the warning message and show the select grid menu.
$('#warningMsg').remove();

var Game = new (function() {
	
	var self = this,
		uniqTileNames = ['a','b','c','one','two','three','four','bunny','cat',
										 'circle','triangle','pentagon','hexagon',
										 'hash','percent','star1','star2','tree'],
		size,
		flipSpeed = 1000,
		gridImages,			// Array holding the image name for each tile.
		matchArray;			// Indicates the index of each tile's match.
	
	var activeOneID = -1,			// Controls active (face up) tiles.
		activeOneImage = "",		// Controls active (face up) tiles.
		activeTwoID = -1,			// Controls active (face up) tiles.
		activeTwoImage = "",		// Controls active (face up) tiles.
		numUp = 0,					// Number of active (face up) tiles.
		numOfMatches = 0,			// Total number of matched tiles.
		numOfClicks = 0,			// Number of successful tile clicks;
													// 	used to trigger a new message.
		gameOver = false,
		isWorking = false;			// Indicates if tileListener() method is executing. 
	
	var $boardcontainer = $('#container-board'),
			$msgboard = $('p#msgboard'),	// Hold message board jQuery object.
			$gridMenu = $('#menu-grid'),
			$board,
			$imgs;

	var imgFolder = 'img/';
	
	// Pick out and shuffle the correct number of tiles.	
	function shuffleTiles(n) {
		var keep = [],
			halfN = n/2;
		
		// Randomly reorder the uniqTileNames array.
		// Reorder a copy of the array to leave the original intact.
		var shuffledAll = uniqTileNames;
		shuffledAll.sort(function () {
			return 0.5 - Math.random();
		});
		
		// Select the first n/2 of the shuffled images.
		for(var i = 0; i < halfN; i++) {			
			keep[i] = shuffledAll[i];
		}
		
		// Need each image twice.
		keep = keep.concat(keep);
		
		// Now randomly reorder the 2*(n/2) images randomly.
		keep.sort(function() {
			return 0.5 - Math.random();
		});
		
		return keep;
	}

	// Figure out where each tile's match is.
	function returnMatchArray(gridImages) {
		ret = [];
		
		for(var i = 0; i < gridImages.length; i++) {
			for(var j = 0; j < gridImages.length; j++) {
				if(gridImages[j] === gridImages[i] && i !== j) {
					ret[i] = j;
				}
			}
		}
		
		return ret;
	}
	
			
	// Change the time before mismatches get returned to gray.
	function changeSpeed(speed) {
		if(speed === "slow") {
			flipSpeed = 2000;
		} else if(speed === "medium") {
			flipSpeed = 1000;
		} else if(speed === "fast") {
			flipSpeed = 200;
		}
	};	
	
	// Show one tile at a time.
	function showOneTile(id) {
		var imgString = imgFolder + gridImages[id] + '.png';
		$imgs.eq(id).attr('src', imgString);
		// $('img#tile' + id).attr('src', imgFolder + gridImages[id] + '.png');
	};
		
	// Reset variables for either a new game or a restart.
	function reset() {
		gameOver = false;
		numOfClicks = 0;
		isWorking = false;				
		startNewTurn();					// start a new turn
		numOfMatches = 0;				// reset the number of matches
	}
	
	// Restart the current game.
	function restart() {
		// Clear the message board.
		$msgboard.stop(true, true);
		$msgboard.hide().text("");
		
		// Reset variables.
		reset();
		
		if($imgs) {
			$imgs.removeClass('matched');	// remove the 'matched' class from any/all tiles
			$imgs.attr('inplay');			// reset tile class to 'inplay'
			
			// Change all tiles back to gray without reshuffling.
			var imgString = imgFolder + 'graysquare.png';
			$imgs.attr('src', imgString);		
		}

		// Fade in a message on the message board.
		$msgboard.hide().delay(700).fadeTo(700,1).text("Start Matching!");		
	};

	// Start a new game.
	function newgame() {
		// Clear the message board.
		$msgboard.stop(true, true);
		$msgboard.hide().text("");
			
		// If a game already exists, run the code.  		
		// Otherwise, do nothing. Wait for the user to finally pick a grid size.
		if($board) {		
			// Reset variables.
			reset();

			// Remove the current board.
			$board.remove();
			
			// Kill the board selector.
			// This will ensure this function does nothing if it is run multiple 
			// times in a row.
			$board = undefined;
			
			// Show the grid selection menu.
			$boardcontainer.append($gridMenu);

			// Resize the grid menu, if necessary.
			SizeChange();
			
			// Generate the new game.
			runGame();
		}
		
	};
	
	// Solve the current game.
	function solve() {
		gameOver = true;
		
		// Show all tiles.
		for(var i = 0; i < size; i++) {
			showOneTile(i);
		}
	
		numOfMatches = 2*size;
		$('img:not(.matched)').addClass('matched');		//attr('matched');		// set every tile class to 'matched'
		
		// If the message is still fading out after a match, this message can 
		// accidentally fade, too, so first stop any current animations, then 
		// undo the fade, then display the new message.
		$msgboard.stop(true, true);
		$msgboard.fadeTo(0,1).text('Solved!');
	};
	
	// Give a hint.
	function hint() {		
		// If no tiles are currently selected, do nothing.			
		
		// If 1 tile is currently selected, find the other matching tile.
		// if(activeOneID !== -1 && activeTwoID === -1) {
		if(numUp === 1) {
			var matchingID = matchArray[activeOneID];
			
			var $tile = $('img').eq(matchingID);
			var imgString = imgFolder + 'hintsquare.png';

			$tile.attr('src', imgString);
			
			var timeout = setTimeout(function() {
				var imgString = imgFolder + 'graysquare.png';
				$tile.attr('src', imgString);
			}, 500);
		}
			
		// If 2 tiles are currently selected and hint is clicked before 
		// the second tile finishes executing, do nothing.
	};
	
	// After a mismatch, reset these.
	function startNewTurn() {
		activeOneID = -1;
		activeOneImage = "";

		activeTwoID = -1;			
		activeTwoImage = "";
		
		numUp = 0;
	};

	
	// This method "flips" tiles and determines whether or not a match has
	//  occurred. 
	// The method ignores new tile clicks until the first method call is finished.
	function tileListener(e) {
	
		// Ignore new clicks until the first click is finished.
		if(isWorking || gameOver) {
			return;
		}
		
		isWorking = true;
					
		var selectedTile = e.target;
		var tileClass = selectedTile.getAttribute('class');
		var tileIDString = selectedTile.getAttribute('id');
		var id = Number( tileIDString.substring(4,tileIDString.length) );
		var image = gridImages[id];
	
		// If a matched tile is clicked, ignore the event.
		if(tileClass.indexOf("matched") != -1)  {	// tiles also have class 'tile'
			isWorking = false;
			return;
		}
		
		if(numUp === 0) {
			// Show the tile.
			activeOneID = id;
			activeOneImage = image;
			showOneTile(id);
			numUp = 1;

			isWorking=false;
			numOfClicks += 1;
			
		} else if(numUp === 1) {
			// Show the tile.
			activeTwoID = id;
			activeTwoImage = image;
			showOneTile(id);
	
			// If an active tile is reclicked, ignore the reclick.
			if(activeTwoID === activeOneID) {
				isWorking = false;
				return;
			}
	
			// Two tiles successfully matched. 
			// Keep both tiles face up and update their classes.
			// Increase numOfMatches.
			if(activeOneImage === activeTwoImage) {
				$('img#tile' + activeOneID).addClass('matched');	//attr('class','matched');		
				$('img#tile' + activeTwoID).addClass('matched');	//attr('class','matched');					
				numOfMatches += 2;
				if(numOfMatches === size) {
					gameOver = true;
					
					// Update the message board when the user wins.
					$msgboard.stop(true, true);
					$msgboard.fadeTo(0,1).text("Well Done!");
	
					return;
				}
				
				// If a match message is still fading out, interrupt it, don't wait
				//  for it to finish.
				// fade to 1 because other parts of the code may have faded to 0
				//  before this runs.					
				$msgboard.stop(true, true);
				$msgboard.fadeTo(0,1).text('Match!').delay(2000).fadeTo(1000,0);				
				
				// Begin a new turn.
				startNewTurn();
				isWorking = false;
				
			} else {			
				var tileListenerThis = this;
				var tileListenerThis_id1 = activeOneID;
				var tileListenerThis_id2 = activeTwoID;
				
				var timeout = setTimeout(function() {
					var imgString = imgFolder + 'graysquare.png';
					
					$('img#tile' + tileListenerThis_id1).attr('src', imgString);
					$('img#tile' + tileListenerThis_id2).attr('src', imgString);
					
					// Begin a new turn.
					startNewTurn();
					isWorking = false;
					//tileListenerThis.startNewTurn();
					//tileListenerThis.isWorking = false;
				}, flipSpeed);
				
			}
			
			numOfClicks += 1;
		}
	
		// Clear the message board on the 9th successful click.
		if(numOfClicks === 9) {
			$msgboard.stop(true, true);
			$msgboard.fadeTo(700,0);		// second argument is opacity
		}

		// Show a new message on the 19th successful click.
		if(numOfClicks === 19) {
			$msgboard.stop(true, true);
			$msgboard.hide().delay(700).fadeTo(700,1).text("Keep Going!");			
		}
		
		// Remove the "Keep Going!" message on the 22nd successful click.
		if(numOfClicks === 27) {
			$msgboard.fadeTo(700,0);
		}
		
	} // end tileListener()
	

	// Create the grid of tiles.
	function createGrid() {
		var tileID, str;
		var imgString = imgFolder + "graysquare.png"
		
		if(size === 16) {
			$board = $('<div id="board-4x4" class="column1of2"></div>');
		} else if(size === 36) {
			$board = $('<div id="board-6x6" class="column1of2"></div>');
		}
		$boardcontainer.append($board);
		
		for(var i = 0; i < size; i++) {
			tileID = '"tile' + i + '"';
			if(size === 16) {
				str = '<div class="img_4x4">';
			} else {
				str = '<div class="img_6x6">';
			}
			str += '<img id=' + tileID + ' class="tile inplay" src=' + imgString + ' ';
			str += 'alt=' + tileID + '>';
			str += '</div>';
			
			$board.append(str);	
		}

		$imgs = $('img');
		$imgs.on('click', function(e) {
			tileListener(e);
		});
		
		// Fade in a message on the message board.
		$msgboard.stop(true, true);
		$msgboard.hide().delay(700).fadeTo(700,1).text("Start Matching!");
			
	};
	
	function loadGame() {	
		// Array of image name strings for all of the tiles.
		gridImages = shuffleTiles(size);
		
		// matchArray[i] gives the index of the other tile that has the 
		// same image as tile i.
		matchArray = returnMatchArray(gridImages);

		// Number of milliseconds to wait before mismatched tiles are reset to gray.
//		flipSpeed = 1000;		// medium
//		$('input.speed').removeClass('selected');	// remove selected class from any/all
//		$('input#medium').addClass('selected');		// add selected class to medium button
	
		// Create board.
		createGrid();
	}

	function runGame() {	
		size = 0;
					
		$('.size').on('click', function(e) {
			e.preventDefault();
			var selectedBttn = e.target;
			var buttonID = selectedBttn.getAttribute('id');
			
			if(buttonID === "4x4") {
				size = 16;			
			} else if(buttonID === "6x6") {
				size = 36;
			}
			
			$gridMenu.remove();				
			loadGame();
		});
	}
	

	function setUp() {
		// This function is designed to only run once when this file first loads.
	
		// Set up game control buttons.
		$('input.control').on('click', function(e) {
			e.preventDefault();
			
			// If the menu-grid exists (i.e., no game has been started yet),
			// don't let the buttons respond.
			if($('#menu-grid').length) {
				return;
			}
			
			var selectedBttn = e.target;
			var buttonID = selectedBttn.getAttribute('id');
			
			switch(buttonID) {
				case 'newGame':
					newgame();
					break;
				case 'restartGame':
					restart();
					break;
				case 'hint':
					hint();
					break;
				case 'solve':
					solve();
					break;
				default: 	// Do nothing
					break;
			}
		});	
		
		
		// Set up flip speed control buttons.
		$('input[class~="speed"]').on('click', function(e) {
			e.preventDefault();
			
			// If the menu-grid exists (i.e., no game has been started yet),
			// don't let the buttons respond.
			if($('#menu-grid').length) {
				return;
			}
			
			var clickedBttn = e.target;
			var buttonID = clickedBttn.getAttribute('id');
			var buttonClass = clickedBttn.getAttribute('class'); 
			
			if(buttonClass.indexOf("selected") != -1) {
				// If the button clicked is already selected, do nothing.
			} else {
				// Remove 'selected' class from any/all tiles.
				$('input.speed').removeClass("selected");
				
				// Add 'selected' class to the correct button.
				$('input#' + buttonID).addClass("selected");
				
				switch(buttonID) {
					case 'slow':
						changeSpeed("slow");	
						break;
					case 'medium':
						changeSpeed("medium");
						break;
					case 'fast':
						changeSpeed("fast");
						break;
					default:
						// Do nothing
						break;
				}
			}
		});		
				
	}

	this.setUp = setUp;
	this.runGame = runGame;
	
})();


Game.setUp();
Game.runGame();




// Handle font size changes; make sure these media queries match
// those in style.css.
window.addEventListener('resize',SizeChange);		
SizeChange();

// maybe use jQuery function on() instead for browser compatibility?
// window.on('resize', SizeChange);


// media query change
function SizeChange() {
	// will need to give container-board an initial height in the css ...
	// Do these things any time the window changes size:

	// When window is resized, figure out what the new viewport dimensons are,
	// then figure out the max possible container dimensions that can fit in 
	// that window.
	
	var mq_w = window.matchMedia("screen and (max-width: 690px)");
	var mq_h = window.matchMedia("screen and (max-height: 486px)");
	
	var $container_outer = $('#container-outer');
	
	if(mq_w.matches || mq_h.matches) {
		// Resize the whole game to keep the same aspect ratio.
		var window_w = window.innerWidth;  //window.screen.width; //window.innerWidth;
		var window_h = window.innerHeight;  //window.screen.height; //window.innerHeight;
		var new_w, new_h;
		
		// set new container width and height
		new_h = window_w * 486/690;
		if(new_h <= window_h) {		// if scaling by width works, do it
			new_w = window_w;
		} else {									// otherwise, scale by height
			new_w = window_h * 690/486;
			new_h = window_h;
		}
		
		$container_outer.css({
			width: new_w,
			height: new_h
		});		
	} else {
		// neither width nor height is smaller than its max:
		$container_outer.css("width", "");
		$container_outer.css("height", "");	
	}

	
	var $cmb = $('div#container-msgboard');
	var $mbc = $('div#msgboard-center');
	var $mb = $('p#msgboard');
		
	if($container_outer.width() < 590) {
	
		// Resize text in column 2 at an overall width of 590px:
		var col2Width_threshold = 169;
		var col2Width = $('div.column2of2').width();
		
		$('p#controlLabel').css("fontSize", (20/col2Width_threshold)*col2Width + "px" );
		
		$('input.control').each(function() {
			$(this).css( "fontSize", (16/col2Width_threshold)*col2Width + "px" );
		});
		
		$('p#speedLabel').css("fontSize", (20/col2Width_threshold)*col2Width + "px" );

		$('input.speed').each(function() {
			$(this).css( "fontSize", (14/col2Width_threshold)*col2Width + "px" );
		});
		
		// Reduce message board height at an overall width of 590px:
		$cmb.css("height", (106/415.563)*$container_outer.height() + "px");
		$mbc.css("height", $cmb.height() + "px");
		$mb.css("height", $cmb.height() + "px");
		
		// now figure out what the new font size should be:
		var newFontSize_1 = (26.982/145)*$mb.width();		// based on message board width
		var newFontSize_2 = (26.982/106)*$mb.height();	// based on message board height
		var newFontSize = Math.min(newFontSize_1, newFontSize_2);
		
		$('p#msgboard').css("fontSize", newFontSize + "px" );

	} else {		
		// jQuery version:
		$('p#controlLabel').css("fontSize", "");
		
		$('input.control').each(function() {
			$(this).css("fontSize", "" );
		});
		
		$('p#speedLabel').css("fontSize", "" );
		
		$('input.speed').each(function() {
			$(this).css("fontSize", "" );
		});

		$('p#msgboard').css("fontSize", "" );
		
		
		$cmb.css("height", "");
		$mbc.css("height", "");
		$mb.css("height", "");	
		$('p#msgboard').css("fontSize", "");
		
			// Here and above ...
			$('div.placeholder-h-5px').css("height", "");
			$('input.control').each(function() {
				$(this).css("margin-top", "" );
			});			
	}

	
	// var mq_menugrid = window.matchMedia("screen and (max-width: 486px)");
	// if(mq_menugrid.matches) {		// start resizing menugrid
	if($('#container-outer').width() < 486)	{		// start resizing menugrid
		// font size
		var mgWidth_threshold = 322;
		var mgWidth = $('#menu-grid').width();
		$('p#gridsizeLabel').css( "fontSize", (40/mgWidth_threshold)*mgWidth + "px" );
		
		// button size
		$('input.size').each(function() {
			$(this).css({
				width: (100/mgWidth_threshold)*mgWidth + "px",
				height: (100/mgWidth_threshold)*mgWidth + "px",
				fontSize: (25/mgWidth_threshold)*mgWidth + "px"
			});
		});
	} else {
		$('p#gridsizeLabel').css( "fontSize", "" );
		$('input.size').each(function() {
			$(this).css({
				width: "",
				height: "",
				fontSize: ""
			});
		});		
	}
	
}
	
	
	