import { Meteor } from 'meteor/meteor';
//import { Devices } from '/imports/api/devices/devices.js';
import http from 'http';
import socket_io from 'socket.io';
var fs = Npm.require('fs-extra');
//var ffmpeg = require('ffmpeg');
//var pathToFfmpeg = require('ffmpeg-static');
//var path = Npm.require('path');
const OnvifManager = require('onvif-nvt');
const Blob = require('node-blob');
// set a port for the socket.io connection, meteor is running on port 3000
const PORT = 8080;
//var clients = 0;

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

// with our process_exec_sync function defined above we can use ffmpeg to stream our audio file
function ffmpegStreamAudio(filename) {
    let result = process_exec_sync(`ffmpeg -re -i  /home/rich/apex/apex-ochsner-poc/.uploads/${filename} -acodec pcm_s16be -ar 44100 -ac 2 -payload_type 10 -f rtp udp://98.188.56.212:8888`);
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
// define socket.io server and set CORS to allow all access
const server = http.createServer();
const io = socket_io(server, {
  cors: {
    origin: '*',
  }
});

io.on("connection", (socket) => {
    console.log("client connected");
    
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

  // testing various node onvif modules to aid in communicating with remote cameras 
  socket.on("audiotest", function(data) {
    console.log("audiotest: "+data);
    OnvifManager.connect('68.227.145.128', 8888, 'admin', 'Password123')
      .then(results => {
        //console.log(results.core.soap.username);
        console.log("results: "+JSON.stringify(results));
      });  
  });  
  
  // get audio bytearray from client, save to file, stream audio to remote over rtp
  socket.on("audioMessage", function(barray) {
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


});









              
        
   
                  
    


















