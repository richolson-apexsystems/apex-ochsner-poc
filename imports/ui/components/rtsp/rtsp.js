import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { loadPlayer } from 'rtsp-relay/browser';
import './rtsp.html';
import '/node_modules/bootstrap-select/dist/css/bootstrap-select.css';

Template.rtsp.onCreated(function rtspOnCreated() { 
});

Template.rtsp.onRendered(function videosOnRendered() {
  $(document).ready(function() {
      //we pass the camera ip in client by adding it to loadplayer url definition as in: url: 'wss://' + window.location.host + ':8443' + '/api/stream/home.zenzig.com',
      loadPlayer({
      url: 'wss://' + window.location.host + ':8443' + '/api/stream/proxied36',
      canvas: document.getElementById('canvas'),
      // optional
      onDisconnect: () => console.log('Connection lost!')      
    });
   
    
  }); 
});

Template.rtsp.helpers({

});

Template.rtsp.events({

 'click #js-stop-ffmpeg': function(e,t) {
        let me = this;
        let edgeDevice = me.edge_device;
    	  // kill any ffmpeg instance for this device name
    	  Meteor.call("killffmpeg", edgeDevice);  
   
 },

   
});
