var ctrl;
var pubnub;

var lobby = new Array();
var myGallery = new Array();
var sessions = new Array();
var isHost = true;
var orderList;
var facingMode = "user"; // Can be 'user' or 'environment' to access back or front camera

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Initiate user video and single layout
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
(function(){
	
	var video = document.createElement('video');
	var session = {'number': getParams(window.location.href)["username"], 'video':video, 'localStream' : true};		
	sessions.push(getLocalWebCamFeed(session));
	createLayout("app", false);
	document.getElementById("label").style.backgroundColor="lightgray";
	login();			

})();

 function getLocalWebCamFeed(session){
	/* Stream it to video element */	/* Setting up the constraint */
	var constraints = {
			audio: true,
			video: {
			facingMode: facingMode
		}
	};

	navigator.getWebcam = (navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	if (navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints)
		.then(function (stream) {
			var video = session.video;
			video.srcObject = stream;
		})
		.catch(function (e) { console.log(e.name + ": " + e.message); });
	}
	else {
		navigator.getWebcam({ audio: true, video: true }, 
			function (stream) {
				var video = session.video;
				video.srcObject = stream;
			}, 
			function () { console.log("Web cam is not accessible."); 
		});
	}
	return session;	
 }

function login() {
	var phone = window.phone = PHONE({
		number        : getParams(window.location.href)["username"], // listen on username line
		publish_key   : 'pub-c-7e8de6bd-3d52-4e17-97ec-20acd3fe2c60',
		subscribe_key : 'sub-c-d903b71e-f49e-11ea-8db0-569464a6854f',
		ssl: true
	}); 
	
	ctrl = window.ctrl = CONTROLLER(phone);
	
	ctrl.ready(function(){ document.getElementById("label").style.backgroundColor="yellow"; });
	
	ctrl.receive(function(session){
		session.connected(function(session) { 
			console.log("Adding session: " + session.number);
		    sessions.push(session);
			if(isHost) {
				console.log("Sending list of participants");
				sendOrderList();
			}
			createLayout("app", false);
			//addToLobby(session);
		});
		session.ended(function(session) { 
			ctrl.getVideoElement(session.number).remove();
			sessions = sessions.filter(function(value){ return value.number != session.number;});
			createLayout("app", false);
		});
	});
	
	pubnub = new PubNub({
		subscribeKey: "sub-c-d903b71e-f49e-11ea-8db0-569464a6854f",
		publishKey: "pub-c-7e8de6bd-3d52-4e17-97ec-20acd3fe2c60",
		uuid: "myUniqueUUID",
		ssl: true
	});
	
	pubnub.addListener({
		message: function(message) {
			// handle message
			if(message.message.text === 'smile!') {
				countdown(5);
			}
			else if(message.message.text === 'reorder') {
				if(!isHost) {
					console.log("Ordem recebida: " + message.message.orderList);				
					orderList = message.message.orderList;
					createLayout("app", false);
				}
			}
		}
	})

	pubnub.subscribe({ 
		channels: ['channel'] 
	});;
	
	return true;
}

function end(){
	if(ctrl) {
		ctrl.hangup();
	}
}

function makeCall(){
	var number = document.getElementById("number").value;
    if (!window.phone) {
		alert("You're not connected!");
	}
	else {
		phone.dial(number);
		isHost = false;
		console.log("Calling: " + number);
	}
	return false;
}

function addToLobby(session) {
	if(isHost) 
		new duDialog("@" + session.number, 'is waiting in the lobby', duDialog.OK_CANCEL, { 
			okText: 'Admit',
			cancelText: 'View',
			dark: false,
			callbacks: {
				okClick: function(){
					sessions.push(session);
					createLayout("app", false);
					this.hide();
				},
				cancelClick: function(){
					lobby.push(session);
					this.hide();
				}
			}
		});
	else {
		sessions.push(session);
		createLayout("app", false);
	}
}

function smile() {
	pubnub.publish({
			message: { text: 'smile!' },
			channel: 'channel'
		}, 
		function(status, response) {
			if (status.error) {
				console.log("publishing failed w/ status: ", status);
			} else {
				//countdown(5);
			}
		}
	);
}

function sendOrderList() {
	
	orderList = new Array();
	sessions.forEach(function (session) {
		orderList.push(session.number);
		console.log(session.number);
	});
		
	pubnub.publish({
			message: { text: 'reorder', orderList: orderList },
			channel: 'channel'
		}, 
		function(status, response) {
			if (status.error) {
				console.log("publishing failed w/ status: ", status);
			}
		}
	);
}

function countdown(timeleft) {
	document.getElementById("counter").innerHTML = timeleft;
    var downloadTimer = setInterval(function(){
		timeleft--;
		document.getElementById("counter").innerHTML = timeleft;
		if(timeleft < 0) {
			clearInterval(downloadTimer);
			document.getElementById("counter").innerHTML = "";
			takePhoto();
		}
    }, 1000);
}

function takePhoto() {
	var screens = createLayout("galery", true);
	screens.forEach(function (screen, index) {
	
		video = sessions[index].video;
		video.pause();
		var canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d').drawImage(video, 0, 0);
		video.play();
		
		// Other browsers will fall back to image/png
		var img = document.createElement('img');
		img.src = canvas.toDataURL('image/webp');
		
		img.style.width = "100%";
		img.style.height = "100%";
		img.style.objectFit = 'cover';
		img.style.overflow = 'hidden';

		screens[index].appendChild(img);		
	});
	
	html2canvas($("#galery"), {
		onrendered: function(canvas) {
			var image = Canvas2Image.convertToPNG(canvas);
            $("#preview").attr('src', $(image).attr('src'));
            $("#previewLink").attr('href', $(image).attr('src'));
			myGallery.push(image);
			//$("#galery").html("");
		}
	});
	
/*
	
	// Get the modal
	var modal = document.getElementById("myModal");

	// Get the <span> element that closes the modal
	var span = document.getElementsByClassName("close")[0];

	// When the user clicks on <span> (x), close the modal
	span.onclick = function() {
		modal.style.display = "none";
	}
	
	modal.style.display = "block";

	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
		if (event.target == modal) {
			modal.style.display = "none";
		}
	}
	
	*/
}

function createLayout(elementId, isPhoto) {

	var screens = new Array();
	var element = document.getElementById(elementId);
	element.innerHTML = "";
	
	var container = document.createElement("div");
	container.className = "container container" + sessions.length;
	
	if(orderList) {
		console.log("Sorting screens");
		var list = new Array();
		orderList.forEach(function (ord, index) {
			sessions.forEach(function (session, index) {
				if(session.number == ord) {
					list.push(session);
				}
			});
		});
		sessions = list;
	}	
	
	sessions.forEach(function (session, index) {
		var screen = document.createElement("div");
		screen.className = "screen";
		
		if(session.localStream) {
			screen.addEventListener('click', function (event) {
				switchMobileCamera(session);
			});	
		}
		
		var label = document.createElement("div");
		label.id = "label";
		label.className = "label";
		label.innerHTML = "<span>@" + session.number + "</span>"
		screen.appendChild(label);

		if(!isPhoto) {
			var video = session.video;
			video.setAttribute('playsinline', '');
			video.setAttribute('autoplay', '');
			video.setAttribute('muted', '');
			video.style.objectFit = 'cover';
			video.style.overflow = 'hidden';
			video.style.width = "100%";
			video.style.height = "100%";
			video.style.zIndex = -1;

			screen.appendChild(video);
		}
		screens.push(screen);
		container.appendChild(screen);
	});
	element.appendChild(container);
	
	/*if(isPhoto) {
		element.className = "polaroid";
		var caption = document.createElement("div");
		caption.className = "caption";
		caption.innerHTML = "Here is your photo!";
		
		var logo = document.createElement("img");
		logo.src = "img/logo-white.png";
		caption.appendChild(logo);
		
		element.appendChild(caption);
	}*/
	return screens;
}

// Switch between front and back camera when opened in a mobile browser
function switchMobileCamera(session){
	if (facingMode == "user") {
		facingMode = "environment";
	} else {
		facingMode = "user";
	}
	getLocalWebCamFeed(session);
}


function getParams(url) {
	var params = {};
	var parser = document.createElement('a');
	parser.href = url;
	var query = parser.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		params[pair[0]] = decodeURIComponent(pair[1]);
	}
	return params;
};