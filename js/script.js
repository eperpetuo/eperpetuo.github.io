var ctrl;
var pubnub;

var lobby = new Array();
var sessions = new Array();
var isHost = true;
var joinned = false;
var orderList;

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
		var session = {'number': getParams(window.location.href)["username"], 'video':video};		
		sessions.push(session);
		createLayout("app", false);
		document.getElementById("label").style.backgroundColor="lightgray";
		login();
	});

})();

function login() {
	var phone = window.phone = PHONE({
		number        : getParams(window.location.href)["username"] || "Anonymous", // listen on username line else Anonymous
		publish_key   : 'pub-c-7e8de6bd-3d52-4e17-97ec-20acd3fe2c60',
		subscribe_key : 'sub-c-d903b71e-f49e-11ea-8db0-569464a6854f',
	}); 
	
	ctrl = window.ctrl = CONTROLLER(phone);
	
	ctrl.ready(function(){ document.getElementById("label").style.backgroundColor="yellow"; });
	
	ctrl.receive(function(session){
		session.connected(function(session) { 
			console.log("Adicionando session");
			console.log("Session: " + JSON.stringify(session));
		    sessions.push(session);
			if(isHost) {
				console.log("Enviando ordem");
				sendOrder();
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
				countdown(5);
			}
		}
	);
}
function sendOrder() {
	
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
			} else {
				//countdown(5);
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
	
	// Get the modal
	var modal = document.getElementById("myModal");

	// Get the button that opens the modal
	var btn = document.getElementById("myBtn");

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

}

function createLayout(elementId, isPhoto) {

	var screens = new Array();
	var element = document.getElementById(elementId);
	element.innerHTML = "";
	
	var container = document.createElement("div");
	container.className = "container container" + sessions.length;
	
	if(orderList) {
		console.log("Reordenando telas");
		var list = new Array();
		orderList.forEach(function (ord, index) {
			sessions.forEach(function (session, index) {
				if(session.number == ord) {
					list.push(session);
					console.log("Tela: " + ord);
				}
			});
		});
		sessions = list;
	}	
	
	sessions.forEach(function (session, index) {
		var screen = document.createElement("div");
		screen.className = "screen";
		
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
	
	if(isPhoto) {
		element.className = "polaroid";
		var caption = document.createElement("div");
		caption.className = "caption";
		caption.innerHTML = "Here is your photo!";
		
		var logo = document.createElement("img");
		logo.src = "img/logo.png";
		caption.appendChild(logo);
		
		element.appendChild(caption);
	}
	/*
	if(isHost && pubnub && sessions.length > 1) {
		console.log("Enviando ordem");
		sendOrder();
	}*/
	
	return screens;
}

var getParams = function (url) {
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