import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
const rtspRelay = require('rtsp-relay');// CANVAS VIDEO REQUIREMENT
const https = require('https');// CANVAS VIDEO REQUIREMENT
import { Mongo } from 'meteor/mongo';
import { Devices } from '/imports/api/devices/devices.js';
import http from 'http';
import socket_io from 'socket.io';
import { io } from 'socket.io-client';
const remotesocket = io("http://demo.zenzig.com:8083");
const homesocket = io("http://home.zenzig.com:8081");
const fs = Npm.require('fs-extra');// CANVAS VIDEO REQUIREMENT (and other things)
const OnvifManager = require('onvif-nvt');
const Blob = require('node-blob');
const readline = require('readline'); // CANVAS VIDEO REQUIREMENT
const insertLine = require('insert-line');// CANVAS VIDEO REQUIREMENT
// set a port for the socket.io connection, meteor is running on port 3000
const PORT = 8080;

import express from 'express';


// meteor needs a seperate process to handle external synchronous commands, like calling a bash script and getting the result
var process_exec_sync = function (command) {
  // Load future from fibers
  var Future = Npm.require("fibers/future");
  // Load exec
  var child = Npm.require("child_process");
  // Create new future
  var future = new Future();
  // Run command synchronous
  child.exec(command, function(error, stdout, stderr) {
    // return an object to identify error and success
    var result = {};
    // test for error
    if (error) {
      result.error = error;
    }
    // return stdout
    result.stdout = stdout;
    future.return(result);
  });
  // wait for future
  return future.wait();
};

function ffmpegStreamAudio(filename) {
    let result = process_exec_sync(`ffmpeg -re -i  /home/rich/apex/apex-ochsner-poc/.uploads/${filename} -acodec pcm_s16be -ar 44100 -ac 2 -payload_type 10 -f rtp udp://home.zenzig.com:8554`);
     // check for error
    if (result.error) {
      throw new Meteor.Error("exec-fail", "Error running ffmpeg: " + result.error.message);
    }
    // success
    return result;
}

function ffmpegStreamAudioBuffer(chunk) {
    //let result = process_exec_sync(`ffmpeg -re -i  ${chunk} -acodec pcm_s16be -ar 44100 -ac 2 -payload_type 10 -f rtp udp://98.188.56.212:8888`);
    let result = process_exec_sync(`ffmpeg -re -i /.uploads/myaudio.wav -c:a pcm_mulaw -f rtp -ssrc 61811 -sdp_file ./out.sdp -ar 8000 -ac 1 tcp://home.zenzig.com:554`);
     // check for error
    if (result.error) {
      throw new Meteor.Error("exec-fail", "Error running ffmpeg: " + result.error.message);
    }
    // success
    return result;
}


// function to return a random number between 0 and max - we use this to simulate our data feed in the client
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// we call this from within our socket.on(audioMessage) event handler. Saves a blob to a wav file
function saveRecording(blob, name, path, encoding) {
 	let ourpath = ''+process.env.PWD+path;
  name = name || 'file';
  encoding = encoding || 'binary';
  fs.ensureDir(ourpath)
  .then(() => {
    fs.writeFile(ourpath + name, blob, encoding, function(err) {
      if (err) {
        throw (new Meteor.Error(500, 'Failed to save recording.', err));
      } else {
        console.log('The recording ' + name + ' (' + encoding + ') was saved to ' + ourpath);
      }
    }); 
  })
  .catch(err => {
    console.error(err);
  });
} 


Meteor.startup(() => {

// CANVAS VIDEO : define rtsp-relay video server
const rd = process.env.PWD;
const key = fs.readFileSync(`${rd}/imports/startup/server/privkey.pem`, 'utf8');
const cert = fs.readFileSync(`${rd}/imports/startup/server/fullchain.pem`, 'utf8');
const app = express();
const vidserver = https.createServer({ key, cert }, app);
const { proxy, scriptUrl } = rtspRelay(app, vidserver);
// we use rtsp-relay's "cameraIP" parameter to pass our proxy name from the client by useing it in the canvas initialization here  /imports/ui/components/videos/videos.js line 209
app.ws('/api/stream/:cameraIP', (ws, req) =>
  proxy({
    additionalFlags: ['-q', '1', '-acodec', 'aac', '-ac', '2', '-ab', '32k', '-ar', '44100', '-max_muxing_queue_size', '1024' ],
    transport: 'tcp',
   // in the client we construct a url like this: url: 'wss://' + window.location.host + ':8443' + `/api/stream/${myDoc.edge_device}`
    url: `rtsp://rtsp.zenzig.com:8554/${req.params.cameraIP}`, // cameraIP contains our proxy name from client.
  })(ws),
);

vidserver.listen(8443);
// WebApp is an internal connect server that Meteor runs - basically Express.
WebApp.connectHandlers.use(app);  
// END CANVAS VIDEO CODE
  
  
  
  // define socket.io server and set CORS to allow all access
  const server = http.createServer();
  const io = socket_io(server, {
    cors: {
      origin: '*',
    }
  });
  
  io.on("connection", (socket) => {

  // pass values from remotesocket to socket
  function emitLocal(emitTo, data) {
    socket.emit(emitTo, data);
  }

  // this is remote onAny listener. For example, if remotesocket sends data to "room352" namespace the value will be contained in event.
  // args contains the data object. Could not pass anything to local socket from within remotesocket so created emitLocal helper function
  // to pass values.
  remotesocket.onAny((event, args) => {
    //console.log("remotesocket onAny: "+JSON.stringify(event)+" - "+JSON.stringify(args));
    emitLocal(""+event+"", args.FallRisk);
  });  
  
    // dynamic listeners - listeners are edge device names, exp: "room301", "room302", etc.
    // and are the value of event, args is true or false
    socket.onAny((event, args) => {
      let dataInterval;
      socket.on(event, function(args) {
        if (args == false) {
          // if false we call clear() on our running interval function
          clearInterval(dataInterval);
        } else if (args == true) {
          // we start our interval function and emit data to our device name every two seconds
          dataInterval = setInterval(function() {
            socket.emit(event, getRandomInt(3));
          }, 2000);
        }
      });
    });

  // use rawCollection to access native mongo driver and return result as a promise
  Devices.rawCollection().find({_id: "devices"}).forEach(function(doc) {
      console.log(doc);
  });
 
    socket.on("socketTest", function() {
      console.log("socketTest");
      homesocket.emit('socketTest');
    });

  socket.on("testSocket", function(data) {
      console.log("testSocket: "+data);
      remotesocket.emit('audioMessage', data);
    });
  
  remotesocket.on('PING', function(){
    console.log("got ping, send pong");
    remotesocket.emit('PONG');
  });
  
  socket.on("audioSend", function(barray) {
        let myBlob;
        let sequence = new Promise(function (resolve) {
          myBlob = new Blob(barray, { type: 'audio/wav' });
          resolve();
        });
        sequence
          .then(() => {
            //saveRecording(myBlob.buffer, "myaudio.wav", "/.uploads/");
            homesocket.emit('audioMessage',myBlob.buffer);
            console.log("emit audio to remote: ");
            return;
        });
  });
     

  // testing various node onvif modules to aid in communicating with remote cameras 
  socket.on("audiotest", function(data) {
    console.log("audiotest: "+data);
    OnvifManager.connect('68.227.145.128', 8888, 'admin', 'Password123')
      .then(results => {
        //console.log(results.core.soap.username);
        console.log("results: "+JSON.stringify(results));
      });  
  });  
  
   // get audio bytearray from client, stream audio back to client
  socket.on("audioSendLocal", function(barray) {
      io.emit("audioReturnLocal", barray);
  });     
  
  
  // get audio bytearray from client, save to file, stream audio to remote over rtp
  socket.on("audioMessage", function(barray) {
    console.log("audioMessage");
      let myBlob;
      let sequence = new Promise(function (resolve) {
        myBlob = new Blob(barray, { type: 'audio/wav' });
        resolve();
      });
      sequence
        .then(() => {
          saveRecording(myBlob.buffer, "myaudio.wav", "/.uploads/");
          return;
      }).then(() =>{
        ffmpegStreamAudio("myaudio.wav");
          return;
      });  

    // emit audio stream back to client for playback test
   // io.emit("audioMessage", barray);
  });    

    
});


// Start the socket.io server we defined above
try {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

} catch (error) {
  console.log(error);
}   

  // this upload server links the hidden "uploads" (plural) directory to an available URL path of "upload" (singular)
  // this is a Meteor specific requirment.
  UploadServer.init({
    tmpDir: process.env.PWD + '/.uploads/tmp',
    uploadDir: process.env.PWD + '/.uploads/',
    checkCreateDirectories: true,
    overwrite: true,

    getDirectory: function(fileInfo, formData) {
      if (formData && formData.directoryName !== null) {
      // create a sub-directory in the uploadDir based on the content type (e.g. 'images')
      return formData.directoryName;
      }
      return "";
    },
    getFileName: function(fileInfo, formData) {
      if (formData && formData.prefix !== null) {
        return fileInfo.name;
      }
    },
    finished: function(fileInfo, formData) {
        if (formData && formData._id !== null) {
        return fileInfo;
      }
    }
  });









});









              
        
   
                  
    


















