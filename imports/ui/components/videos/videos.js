import { Meteor } from 'meteor/meteor';
import './videos.html';
import { Patients } from '/imports/api/patients/patients.js';
import { Devices } from '/imports/api/devices/devices.js';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { io } from 'socket.io-client';
const socket = io("https://rtsp.zenzig.com", {secure:true});
import '/node_modules/bootstrap-select/dist/css/bootstrap-select.css';
import videojs from 'video.js';
const pageSession = new ReactiveDict();

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

//JSON.stringify(circularReference, getCircularReplacer());

// check for existence of HLS url 
function ifUrlExist(url, callback) {
  //console.log("url: "+url);
    let request = new XMLHttpRequest;
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

// return index of object containing searchfor parameter 
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

function resizeListener() {
  Session.set('resize', window.innerWidth);
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
    Meteor.subscribe('devices.all')
  ];

  Tracker.autorun(() => {
    // setup variable to test when our subscriptions are ready
    this.areReady = this.handles.every(handle => handle.ready());
    //console.log(`Handles are ${this.areReady ? 'ready' : 'not ready'}`);
    if(this.areReady) {
      // Insert empty array if the device collection does not exist
      if (Devices.find().count() === 0) {
      		Meteor.call('devices.update', "devices", {
      			"devices": []
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
          //console.log("deviceIndex: "+deviceIndex);
          // if an index is found it means we already have an ffmpeg process running for this device and we skip this step
          // if the value is undefined we need to call ffmpeg to get the stream for this device
          if(deviceIndex === undefined) {
            // this starts server-side ffmpeg process to ingest rtsp from remote camera and route to local rtsp server
            // to create hls consumed by our client
            Meteor.call('ffmpegCopyFromCamera',''+myDoc.camera_url+'',''+myDoc.edge_device+'', function(err, res) {
              if (err) { return console.log("ffmpegCopyFromCamera err: "+err)} 
              //console.log("copy from camera called.");
              return true;
            });   
            // this adds device name to devices array  
            Meteor.call("devicePushDevices",{"edgedevice": myDoc.edge_device});
          }
        }
      });
    }
  });

  // set default Session values - these are returned to the template by 
  // helper functions defined in the helpers section below - Session is reactive 
  // in Meteor so events tied to Session fire when Session values change
  Session.set('edgeDevice', false);
  Session.set("mouseOver", false);
});

Template.videos.onRendered(function videosOnRendered() {
  $(document).ready(function(){
/*    
    socket.on('audioMessage', function (audioChunks) {
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    });    
*/    
    // socket.io testing
      socket.on('pytest', (data) => {
        //console.log("pytest: "+data);
        let el = document.getElementById("js-socket-test");
          //If it isn't "undefined" and it isn't "null", then it exists.
          if(typeof(el) != 'undefined' && el != null){
            if (data == 0) {
                el.style.border = "solid 6px green";
            } else if (data == 1) {
                el.style.border = "solid 6px yellow";
            } else if (data == 2) {
                el.style.border = "solid 6px red";
            } 
          }
      });
      socket.on('pong', () => {
        console.log("sent ping, recieved pong");
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
          // This is used to show the data value in card with player. 
          Session.set(myDoc.edge_device, false);
          // our ffmpeg call in onCreated should have started pulling rtsp from the remote camera passing it to local rtsp server to generate HLS.
          
          // NOTE: I've noticed that sometimes ifUrlExist returns true even when there is not a URL. This is probably related to relying on existence of edge data 
          // device name being in devices array to call ffmpegCopyFromCamera method. If ffmpeg didn't start correctly or the process died at some point 
          // we do not have a mechanism to restart it. As it is now we have to remove the room data from db, then add it again to get the ffmpeg process started again.
          // I do have an ffmpeg log monitor script that we can use to solve this issue, by logging output from ffmpeg process and monitoring log we can 
          // easily restart ffmpeg if log shows no data for a period: /imports/api/ffmpeg/ffchecker.sh. While this would work it would be a poor solution, a better 
          // way would be to detect errors from simple-rtsp-server - errors are thrown when client requests a url that is not being published.
          
          // we need to make sure our hls url is available before we insert the videojs player so we wrap our insertion code in this url checking function.
          ifUrlExist(`https://hls.zenzig.com/${myDoc.edge_device}/index.m3u8`, function(exists) {
            // our HLS url is avaialable but we delay for a couple of seconds here just to make sure
            Meteor.setTimeout(function() {
              //let el = document.getElementById(videoid);
              //console.log(JSON.stringify(el, getCircularReplacer()));
              // we use a setInterval to continuosly check our element exists before we try to remove it.
              let existCondition = setInterval(function() {
               if ($(videoid).length) {
                // here we have our element so we can procede
                // console.log("Element Exists!");
                // 1. we have to destroy our videojs instance.
                // 2. we have to replace the html video container.
                // 3. we have to initialize a new videojs instance on the new container.
                // These things must be done in sequence so we setup a promise chain to handle it.
                let sequence = new Promise(function (resolve) {
                  // dispose the videojs instance and resolve the promise
                  videojs(videoid).dispose();
                  resolve()
                })
                sequence
                  .then(() => {
                  // we still have our video border element to use as a referrence to replace the video element that was removed 
                  // so we insert the code into that container here
                      $(`#${myDoc.edge_device}-border`).html(`<video id="${myDoc.edge_device}" class="video-js vjs-default-skin vjs-16-9" height="360" controls autoplay muted="true" preload="none"><source src="https://hls.zenzig.com/${myDoc.edge_device}/index.m3u8" type="application/x-mpegURL" /></video>`); 
                    return;
                  }).then(() =>{
                    // since we added a new video element we just need to initialize videojs on the it
                    let player = videojs(videoid);
                    return;
                  })                
                  clearInterval(existCondition);
               } // close if element exists
              }, 100); // check every 100ms                   
            },2000);
          }); // close ifUrlExists
        }); // close Patients.find()
      } // close if areReady
    });
/*  
    // code below can be used to test audio capture by returning 
    // audio blob back to client after it is sent to server.
    socket.on('audioMessage', function (audioChunks) {
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    });
*/    
  }); 


});

Template.videos.helpers({
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
  
  edgeData(devicename) {
    //console.log("Session.get(devicename): "+Session.get(devicename));
    if(Session.get(devicename) === 0 || 1 || 2) {
      return Session.get(devicename);
    }
     
  },

  // helpers used to add/remove elements from the DOM
  insertDevice(devicename) {
    //console.log("devicename: "+devicename);
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
  getWidth() {
    //console.log("resize: "+Session.get("resize"));
    return Session.get("resize");
  },
  
  getEdgeData() {
      let edgeDevice = Patients.find({}, {"edge_device":String}).fetch();
      //console.log(JSON.stringify(edgeDevice));
      if(edgeDevice.length) {
        Session.set("EdgeDevice", edgeDevice[0].edge_device);
        Session.set(edgeDevice[0].edge_device, false);
        //console.log("Edge Device: "+edgeDevice[0].edge_device);
        return Patients.find({});
      }

  },
  
  
});

Template.videos.events({
   'mousedown  .js-audio-button': function(e,t) {
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
                    socket.emit('audioMessage',audioChunks);
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
      //console.log("'mouseup touchend");
      if (this.mediaRecorder.state !== 'inactive') {
          // state is recording or paused so we call stop
          this.mediaRecorder.stop();
      }

 
   },   

  
 'click #js-edgetest-start': function(e,t) {
    e.preventDefault();
    let me = this;
    //console.log("edgetest start");
    let edgeDevice = me.edge_device;
    //console.log("edgeDevice: "+edgeDevice);
    // send a message to the server to change the edge device state
    // socket.emit('message', "this is a test of edge socket");
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
    // send a message to the server to change the edge device state
    // socket.emit('message', "this is a test of edge1 socket");
    socket.emit('edgetest', true); 
    //console.log(Session.get("EdgeDevice"));
    let edgeDevice = Session.get("EdgeDevice");
    //socket.emit('ping'); 
    //console.log("socket.emit('ping'); ");
    
     socket.on('edgedata', (data) => {
        //console.log('video1data: ' + data);
        let el = document.getElementById(""+edgeDevice+"-border");
        //If it isn't "undefined" and it isn't "null", then it exists.
        if(typeof(el) != 'undefined' && el != null){
          if (data == 0) {
              el.style.border = "solid 6px green";
              Session.set("edgedata", data);
          } else if (data == 1) {
            Session.set("edgedata", data);
              el.style.border = "solid 6px yellow";
          } else if (data == 2) {
            Session.set("edgedata", data);
              el.style.border = "solid 6px red";
          } 
        }
   });


  },  


  'mouseenter .js-mouse-vidb'(e, t ) {
    e.preventDefault();
		let me = this;
    Session.set("mouseOver", true);
    if(e.target.classList.contains(me.edge_device)) {
      Session.set("edgeDevice", me.edge_device);
    }        
  
  },
  'mouseleave .js-mouse-vidb'(e, t) {
    Session.set("mouseOver", false);
    Session.set('edgeDevice', false);
 
  },

  
   'click #js-reset-player': function(e,t) {
      e.preventDefault();  
      const me = this;
      // create an id from edge device name
      let videoid = '#'+me.edge_device+'';
       Tracker.autorun(() => {
          const areReady = t.handles.every(handle => handle.ready());
          // make sure data is ready
          if(areReady) {
              // our ffmpeg call in onCreated should have started pulling rtsp from the remote camera passing it to local rtsp server to generate HLS.
              // we need to make sure our hls url is available before we insert the videojs player so we wrap our insertion code in this url checking function.
              ifUrlExist(`https://hls.zenzig.com/${me.edge_device}/index.m3u8`, function(exists) {
                   if ($(videoid).length) {
                     // here we have our element so we can procede
                     // console.log("Element Exists!");
                    // 1. we have to destroy our videojs instance.
                    // 2. we have to replace the html video container.
                    // 3. we have to initialize a new videojs instance on the new container.
                    // These things must be done in sequence so we setup a promise chain to handle it.
                    let sequence = new Promise(function (resolve) {
                      // dispose the videojs instance and resolve the promise
                      videojs(videoid).dispose();
                      resolve();
                    })
                    sequence
                      .then(() => {
                      // we still have our video border element to use as a referrence to replace the video element that was removed 
                      // so we append the code into that container here
                      $(`#${me.edge_device}-border`).append(`<video id="${me.edge_device}" class="video-js vjs-default-skin vjs-16-9" height="360" controls autoplay muted="true" preload="none"><source src="https://hls.zenzig.com/${me.edge_device}/index.m3u8" type="application/x-mpegURL" /></video>`); 
                        return;
                      }).then(() =>{
                        // since we added a new video element we just need to initialize videojs on it
                        let player = videojs(videoid);
                        return;
                      })                
                   } // close if element exists
              }); // close ifUrlExists
      
          } // close if areReady
        });      
     },

   
});

      
