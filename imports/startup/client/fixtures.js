import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
global._ = require('meteor/underscore')._;
window._ = _; 

// import our socket.io client - we need this to communicate with server side socket.io connections
import { io } from 'socket.io-client';

// we are proxying our socket.io connection through nginx on port 8080 to
// provide ssl support so we set the socket client to use the top level domain that we
// are serving the app from
const socket = io("https://rtsp.zenzig.com");

// some logs to let us know everything started
socket.on('connect', function(){
    console.log("Client Connected");
});
socket.on('disconnect', function(){
    console.log("Client Disconnected");
});

Meteor.startup(function() {
    console.log("Meteor client started");
    Session.set("resize", null);
	// resize listener called from videos.resize function in "videos.js"	
	window.addEventListener('resize', function() {
	    Session.set("resize", new Date());
	});
});

