var ctrl;
var pubnub;

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Initiate user video and single layout
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
(function(){
	/* Setting up the constraint */
	var facingMode = "user"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
	var constraints = {
			audio: false,
			video: {
			facingMode: facingMode
		}
	};
	/* Stream it to video element */
	navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
		var video = document.createElement('video');
		video.srcObject = stream;
		var session = {'number':'me', 'video':video};		
		sessions.push(session);
		createLayout("app", false);
	});

})();

function login(form) {
	var phone = window.phone = PHONE({
		number        : form.username.value || "Anonymous", // listen on username line else Anonymous
		publish_key   : 'pub-c-7e8de6bd-3d52-4e17-97ec-20acd3fe2c60',
		subscribe_key : 'sub-c-d903b71e-f49e-11ea-8db0-569464a6854f',
	}); 
	
	ctrl = window.ctrl = CONTROLLER(phone);
	
	ctrl.ready(function(){ form.username.style.background="#55ff5b"; });
	
	ctrl.receive(function(session){
		session.connected(function(session) { 
			console.log("Adicionando session");
			console.log("Session: " + JSON.stringify(session));
		    sessions.push(session);
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
		status: function(statusEvent) {
			if (statusEvent.category === "PNConnectedCategory") {
				var newState = {
					new: 'state' 
				};
				pubnub.setState(
					{ 
						state: newState 
					}, 
					function (status) {
						// handle state setting response
					}
				);
			}
		},
		message: function(message) {
			// handle message
			countdown(5);
		},
		presence: function(presenceEvent) {
			// handle presence
		}
	})

	pubnub.subscribe({ 
		channels: ['photo'] 
	});;

	return false;  // So the form does not submit.
}

function end(){
	if(ctrl) {
		ctrl.hangup();
	}
}

function makeCall(form){
    if (!window.phone) alert("Login First!");
	else phone.dial(form.number.value);
	return false;
}

var lobby = new Array();
var sessions = new Array();

function addToLobby(session) {
	var r = confirm(session.number + " is waiting in the Lobby.");
	if (r == true) {
		sessions.push(session);
		createLayout("app", false);
	}
}

function smile() {
	pubnub.publish({
			message: { text: 'smile!' },
			channel: 'photo'
		}, 
		function(status, response) {
			if (status.error) {
				console.log("publishing failed w/ status: ", status);
			} else {
				countdown(5);
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
	var screens = createLayout("screenshot", true);
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
}

function createLayout(elementId, isPhoto) {

	var screens = new Array();
	var element = document.getElementById(elementId);
	element.innerHTML = "";
	
	var container = document.createElement("div");
	container.className = "container container" + sessions.length;
	
	/*sessions.sort(compareSession);*/
	
	sessions.forEach(function (session, index) {
		var screen = document.createElement("div");
		screen.className = "screen";
		
		var label = document.createElement("div");
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
	
	if(isPhoto) {
		element.className = "polaroid";
		var caption = document.createElement("div");
		caption.className = "caption";
		caption.innerHTML = "Here is your photo!";
		element.appendChild(caption);
	}
	return screens;
}

function compareSession(session1, session2){
	if(session1.number < session2.number) return -1;
	if(session1.number > session2.number) return 1;
	return 0;
}