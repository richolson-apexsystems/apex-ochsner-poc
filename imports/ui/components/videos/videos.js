import { Meteor } from 'meteor/meteor';
import './videos.html';
import './videos.css';
import { Patients } from '/imports/api/patients/patients.js';
import { Devices } from '/imports/api/devices/devices.js';
import { Recordings } from '/imports/api/recordings/recordings.js';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import bootbox from 'bootbox';
import { io } from 'socket.io-client';
import { loadPlayer } from 'rtsp-relay/browser'; //CANVAS VIDEO - attaches to wss connection from fixtures line 116
import '/node_modules/bootstrap-select/dist/css/bootstrap-select.css';

//CANVAS VIDEO NOTE: I don't think we need videojs any longer.
import videojs from 'video.js';
import 'videojs-errors';
import '/node_modules/videojs-errors/dist/videojs-errors.css';

const pageSession = new ReactiveDict();
Session.set("recordingResult", null);

const socket = io("https://rtsp.zenzig.com", {secure:true});

//how to use: JSON.stringify(circularReference, getCircularReplacer());
// view objects that contain circular referrences
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

// check for existence of HLS url 
function ifUrlExist(url, callback) {
  console.log("url: "+url);
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.setRequestHeader('Accept', '*/*');
    request.onprogress = function(event) {
        let status = event.target.status;
        let statusFirstNumber = (status).toString()[0];
        switch (statusFirstNumber) {
            case '2':
                request.abort();
                return callback(true);
            default:
                request.abort();
                return callback(false);
        };
    };
    request.send('');
}

// return index of edgedevice 
function getDeviceIndex(array,searchfor) {
    let index = undefined;
    if(typeof(array) === "object") {
        array.forEach(function (value, i) {
             if(searchfor === value.edgedevice) {
    	        return index = i;
    	     }
        });
    } 
    return index;
}



// fit a rect into some container, keeping the aspect ratio of the rect
function fitCanvasIntoContainer(canvasWidth, canvasHeight, containerWidth, containerHeight) {
    let widthRatio = containerWidth / canvasWidth;    // ration container width to rect width
    let heightRatio = containerHeight / canvasHeight; // ration container height to rect height
    let ratio = Math.min( widthRatio, heightRatio ); // take the smaller ratio
    // new canvas width and height, scaled by the same ratio
    return {
        width: canvasWidth * ratio,
        height: canvasHeight * ratio,
    };
}

// canvas.height, canvas.width, container.width, container.height
//const canvasSize = fitCanvasIntoContainer( 640, 360, 700, 400 );
//const canvasWidth = canvasSize.width;
//const canvasHeight = canvasSize.height;

function resizeListener() {
 let size = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  Session.set('resize', size);
}


function resizeCanvasListener() {
 let size = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  Session.set('resizeCanvas', size);
}
window.addEventListener("resize", resizeListener);

// Function to set the height of an element proportional to its width
// el is the element we are interested in.
// ratio is the ratio of width to height that we want
function setHeight(el, ratio) {
// first we need to find out what the width of el currently is
  const w = el.offsetWidth; //this will always return an integer
  el.style.height = (w * ratio) + 'px';
}

Template.videos.onCreated(function videosOnCreated() { 
  // get our data
  this.handles = [
    Meteor.subscribe('patients.all'),
    Meteor.subscribe('devices.all'),
    Meteor.subscribe('recordings.all')
  ];

  Tracker.autorun(() => {
    // setup variable to test when our subscriptions are ready
    this.areReady = this.handles.every(handle => handle.ready());
    //console.log(`Handles are ${this.areReady ? 'ready' : 'not ready'}`);
    if(this.areReady) {
      // Insert empty array if the devices collection does not exist
      if (Devices.find().count() === 0) {
      		Meteor.call('devices.update', "devices", {
      			"devices": []
      		}); 	 
      }
      
      // Insert empty array if the recordings collection does not exist
      if (Recordings.find().count() === 0) {
      		Meteor.call('recordings.update', "recordings", {
      			"recordings": []
      		}); 	 
      }       
      
      
      // get our devices data
      let devices = Devices.find({_id: "devices"}).fetch();
      // step over patient data to look for device name match
      Patients.find().forEach(function(myDoc) { 
        if(myDoc.edge_device) {
          // if found set a session under this device name with a value of true 
          Session.set(''+myDoc.edge_device+'', true);   
          // check our devices array for an index matching this device name
          let deviceIndex = getDeviceIndex(devices[0].devices, myDoc.edge_device);
          if(deviceIndex === undefined) {
            // add device name to devices array  
            Meteor.call("devicePushDevices",{"edgedevice": myDoc.edge_device});
          }
        }
      });
    }
  });

  // set default Session values - these are returned to the template by 
  // helper functions defined in the helpers section below - Session is reactive 
  // in Meteor so events tied to Session fire when Session values change
  Session.set("mouseOver", false);
  Session.set("recordingCount", false);

});

Template.videos.onRendered(function videosOnRendered() {
  $(document).ready(function(){
    //listener to recieve and play audio returned from server
    socket.on('audioReturnLocal', function (audioChunks) {
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    });    
    
  // get our data
  const handles = [
    Meteor.subscribe('patients.all'),
    Meteor.subscribe('devices.all')
  ];

   Tracker.autorun(() => {
      const areReady = handles.every(handle => handle.ready());
      // make sure data is ready
      if(areReady) {
        // loop over our patient data
        Patients.find().forEach(function(myDoc) {
          // create an id from edge device name
          let videoid = '#'+myDoc.edge_device+'';
          // store edge device name in a Session object with a value of false. 
          // This is used to show the data value in card when mouseover player. 
          Session.set(myDoc.edge_device, false);
          
          // CANVAS VIDEO: setTimeout to make sure canvas element has rendered before we try to initialize it
          Meteor.setTimeout(function() {
            // we pass the camera ip by adding it to loadplayer url definition as in: url: 'wss://' + window.location.host + ':8443' + `/api/stream/${proxie_name}`
            // note: we are using proxies defined in rtsp-simple-server.yml file for our stream name so rtsp feeds we show in client will always come from our host 
            // domain or IP at name space /api/stream/proxie 
            const canvas = document.getElementById(`${myDoc.edge_device}`);
            loadPlayer({
                url: 'wss://' + window.location.host + ':8443' + `/api/stream/${myDoc.edge_device}`,
                canvas: document.getElementById(`${myDoc.edge_device}`),
                volume: 100,
                poster: 'public/img/poster.png',
                audio: true,
                // optional
                onDisconnect: () => console.log('Connection lost!')      
            }); 
          },100);
          
        }); // close Patients.find()
      } // close if areReady
    });

  }); 
});

Template.videos.helpers({
  getWidth() {
    let sizeObj = Session.get("resize");
    return sizeObj.width;
  },
  
  // this wraps the template to assure our data is ready before we try to load template
  subsReady() {
    Template.instance().areReady = Template.instance().handles.every(handle => handle.ready());
      if(Template.instance().areReady) {
        return true;
      }
  },

  // helpers used to add/remove elements from the DOM
  edgeDevice() {
    return Session.get('edgeDevice');
  },
  
  // helper to show current data value when data simulation is running
  edgeData(devicename) {
    if(Session.get(devicename) === 0 || 1 || 2) {
      return Session.get(devicename);
    } else {
      return "";
    }
  },

  // helpers used to add/remove elements from the DOM
  insertDevice(devicename) {
    if(Session.get("resetDevice") !== null || undefined) {
      return false;
    } else {
      return true;
    }
  },

  getPatientData() {
    // check for mouse-over state and if true check which device the mouse is over 
    if(Session.get("mouseOver") && (Session.get('edgeDevice'))) {
      return Patients.find({"edge_device":Session.get('edgeDevice')}).fetch();
    }     
  },
  

  getEdgeData() {
      let edgeDevice = Patients.find({}, {"edge_device":String}).fetch();
      if(edgeDevice.length) {
        Session.set("EdgeDevice", edgeDevice[0].edge_device);
        Session.set(edgeDevice[0].edge_device, false);
        return Patients.find({});
      }
  },
  
  formatPhoneNumber(phoneNumberString) {
    let phone = ('' + phoneNumberString).replace(/\D/g, '');
    let formated_phone = "("+phone.substring(0,3)+") "+phone.substring(3,6)+"-"+phone.substring(6,11);
    return formated_phone;
  },

  showRecordingCount() {
    console.log(this.room_number);
    if(Session.get(this.room_number)) {
      return Session.get(this.room_number);
    }
    
  }
  
});

Template.videos.events({
   'mousedown .js-audio-button': function(e,t) {
      e.preventDefault();
      //console.log("'mousedown touchstart");
      // get microphone permission and setup promise that resolves to mediaStream object
    	window.navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // pass our audio stream to media recorder to get a clip to play
                this.mediaRecorder = new MediaRecorder(stream);
                // setup array to hold audio data
                var audioChunks = [];
                // start recording audio
                this.mediaRecorder.start();
                // dataavailable event containing Blob of saved data is fired. This recording is done.
                this.mediaRecorder.addEventListener("dataavailable", event => {
                    // push audio data into array
                    audioChunks.push(event.data);
                });
                this.mediaRecorder.addEventListener("stop", () => {
                    // send audio data over socket.io to server - server currently redirects audio back to client for playback
                    //socket.emit('audioMessage',audioChunks);
                    socket.emit('audioSend',audioChunks);
                    // turn off red recording icon in browser tab
                    stream.getTracks() // get all tracks from the MediaStream
                      .forEach( track => track.stop() ); // stop each of them
                    // clear audio data from array so we are ready to record next audio clip
                    audioChunks = [];
                });
            });	    

   },
   
   'mouseup  .js-audio-button': function(e,t) {
      e.preventDefault();
      if (this.mediaRecorder.state !== 'inactive') {
          // state is recording or paused so we call stop
          this.mediaRecorder.stop();
      }
   },   
  
 'click #js-edgetest-start': function(e,t) {
    e.preventDefault();
    let me = this;
    let edgeDevice = me.edge_device;
    socket.emit(edgeDevice, true);
    socket.on(edgeDevice, (data) => {
        let el = document.getElementById(""+edgeDevice+"-border");
        //If it isn't "undefined" and it isn't "null", then it exists.
        if(typeof(el) != 'undefined' && el != null){
          if (data == 0) {
              el.style.border = "solid 6px green";
              Session.set("edgedata", data);
              Session.set(edgeDevice, data);
          } else if (data == 1) {
            Session.set("edgedata", data);
            Session.set(edgeDevice, data);
              el.style.border = "solid 6px yellow";
          } else if (data == 2) {
            Session.set("edgedata", data);
            Session.set(edgeDevice, data);
              el.style.border = "solid 6px red";
          } 
        }
   });
  }, 

 'click #js-edgetest-stop': function(e,t) {
    e.preventDefault();
    let me = this;
    let edgeDevice = me.edge_device;
    socket.emit(edgeDevice, false); 
    //If it isn't "undefined" and it isn't "null", then it exists.
      let el = document.getElementById(""+edgeDevice+"-border");
        //If it isn't "undefined" and it isn't "null", then it exists.
        if(typeof(el) != 'undefined' && el != null){
          el.style.border = "solid 2px grey";
          Session.set("edgedata", false);
          Session.set(edgeDevice, false);
        }
  }, 

 'click #js-socket-test': function(e,t) {
    e.preventDefault();  
    //remotesocket.emit('audioMessage', true);
    socket.emit("socketTest");
    console.log("socket test");
  },  

  'mouseenter .js-mouse-vidb': function(e, t ) {
    e.preventDefault();
		let me = this;
    Session.set("mouseOver", true);
    if(e.target.classList.contains(me.edge_device)) {
      Session.set("edgeDevice", me.edge_device);
    }        
  },
  
  'mouseleave .js-mouse-vidb': function(e, t) {
    Session.set("mouseOver", false);
    Session.set('edgeDevice', false);
 
  },
  
 'click #js-volume': function(e,t) {
      e.preventDefault();
      let me = this;
		  let edgeId = `#${me.edge_device}`;
		  const canvas = document.getElementById(`${me.edge_device}`);
		  //let vp = videojs(""+edgeId+"").player();
		  let vp = canvas;
      console.log("toggle player volume");
      let muted = vp.muted();
      console.log("muted: "+muted);
      if(muted) {
        vp.muted(false);
      } else {
        vp.muted(true);
      }

  },

 'mousedown .js-microphone': function(e, t) {
      e.preventDefault();
      let me = this;
      // toggle our icon state
      t.$('.js-microphone').toggleClass('fa-microphone fa-microphone-slash');
      // determine muted state and set muted
      let edgeId = `#${me.edge_device}`;
      // get an instance of our videojs player
		  let vp = videojs(""+edgeId+"").player();
		  // get current muted state
      let muted = vp.muted();
      // if not muted set to mute
      if(!muted) {
        vp.muted(true);
      } 

      // get microphone permission and setup promise that resolves to mediaStream object
    	window.navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // pass our audio stream to media recorder to get a clip to play
            this.mediaRecorder = new MediaRecorder(stream);
            // setup array to hold audio data
            let audioChunks = [];
            // start recording audio, pass timeslice value so that dataavailable event fires every second
            this.mediaRecorder.start(1000);
            // dataavailable event containing Blob of saved data is fired. This recording is done.
            this.mediaRecorder.addEventListener("dataavailable", event => {
              console.log("dataavailable");
                // push audio data into array
                audioChunks.push(event.data);
            });
            this.mediaRecorder.addEventListener("stop", () => {
                // send audio data over socket.io to server - server currently redirects audio back to client for playback
                 socket.emit('audioSend',audioChunks);
                //socket.emit('audioSendLocal',audioChunks);
                // turn off red recording icon in browser tab
                stream.getTracks() // get all tracks from the MediaStream
                  .forEach( track => track.stop() ); // stop each of them
                // clear audio data from array so we are ready to record next audio clip
                audioChunks = [];
            });
        });	        
    
  },

 'mouseup .js-microphone': function(e, t) {
    e.preventDefault();
    let me = this;
    if (this.mediaRecorder.state !== 'inactive') {
        // state is recording or paused so we call stop
        this.mediaRecorder.stop();
    }

    t.$('.js-microphone').toggleClass('fa-microphone fa-microphone-slash');
    // determine muted state and set muted
      let edgeId = `#${me.edge_device}`;
      // get an instance of our videojs player
		  let vp = videojs(""+edgeId+"").player();
		  // get current muted state
      let muted = vp.muted();
      // if not muted set to mute
      if(muted) {
        vp.muted(false);
      }     
  },
  
  'click .js-alert-modal-close': function(e, t) {
     e.preventDefault(); 
     $('#AlertModal').modal('hide');
  },

  'click .js-thumbs-down': function(e,t) {
    e.preventDefault(); 
    let me = this;
		let edgedevice = me.edge_device;
		// remove shaded modal backdrop
    $('.modal-backdrop').hide();
      let fileName = new Meteor.Collection.ObjectID();
      bootbox.prompt({
          backdrop:null,
          title: "E-sitter Alert Recording",
          message: '<p>Please select the alert level below:</p>',
          inputType: 'radio',
          inputOptions: [
          {
              text: 'No Alert Shown',
              value: 'none',
          },
          {
              text: 'Alert was red',
              value: 'red',
          },
          {
              text: 'Alert was yellow',
              value: 'yellow',
          },
          {
              text: 'Alert was green',
              value: 'green',
          }          
          ],
          // our alert level is returned in this callback
          callback: function (alertLevel) {
        	// setup counter to display video
          	let count = 0;
          	Session.set(me.room_number, count);
          	let interval = setInterval(function() {
              count++;
              Session.set(me.room_number, count);
              if (count === 10) {
                clearInterval(interval);
                 bootbox.dialog({
                    title: "This is the video that was recorded.",
                    message: `
                        <video width="360" controls autoplay muted="true" preload="none">
                          <source src="https://rtsp.zenzig.com/upload/${fileName._str}.mp4" type="video/mp4" />
                        </video>
                    `
                  });
                  // reset our recording counter
                  Session.set(me.room_number, false);
              }
            }, 1000);
	
          	Meteor.call('ffmpegRecordFromCamera', me.edge_device, fileName._str, function(error, result) {
          	  if(error) return console.log(error);
              // create a unique id for this record in the db.
              let id = new Meteor.Collection.ObjectID();
              let recordingObj = {
                 'id': id._str,
                 'alert_level': alertLevel,
                 'first_name' :me.first_name,
                 'last_name': me.last_name,
                 'room_number': me.room_number,
                 'camera_url': me.camera_url,
                 'nurse_name': me.nurse_name,
                 'nurse_phone': me.nurse_phone,
                 'edge_device': me.edge_device,
                 'file_location': `${window.location.protocol}//${window.location.hostname}/upload/${fileName._str}.mp4`
              };
                Meteor.call('recordingPushRecordings',recordingObj, function(err, res) {
                  if (err) { return console.log("recordingPushRecordings err: "+err)} 
                });          	  
          	});
       
          }
  
      });
  },


 'click #js-kill-ffmpeg': function(e,t) {
    e.preventDefault();
    let me = this;
    let edgeDevice = me.edge_device;
    // create an id from edge device name
    let videoid = '#'+me.edge_device+'';
    console.log("edgeDevice: "+edgeDevice);
    let sequence = new Promise(function (resolve) {
      // dispose the videojs instance and resolve the promise
      videojs(videoid).dispose();
      resolve();
    });
    sequence
      .then(() => {
    	  Meteor.call("devicePullObject", { "edgedevice": edgeDevice }); 
        return;
      }).then(() =>{
    	  // kill any ffmpeg instance for this device name
    	  Meteor.call("killffmpeg", edgeDevice);
        return;
      });  
  }, 

 'click #js-start-ffmpeg': function(e,t) {
        let me = this;
        Meteor.call('ffmpegCopyFromCamera',''+me.camera_url+'',''+me.edge_device+'', function(err, res) {
          if (err) { return console.log("ffmpegCopyFromCamera err: "+err)} 
          console.log("copy from camera called.");
          return true;
        });   
 },

 'click #js-stop-ffmpeg': function(e,t) {
        let me = this;
        let edgeDevice = me.edge_device;
    	  // kill any ffmpeg instance for this device name
    	  Meteor.call("killffmpeg", edgeDevice);  
   
 },

   
});
