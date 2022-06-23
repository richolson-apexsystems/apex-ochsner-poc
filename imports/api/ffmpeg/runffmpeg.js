import { Meteor } from 'meteor/meteor';

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

var pathToFfmpeg = require('ffmpeg-static');


Meteor.methods({
    runffmpeg: function(data) {
      // This method call won't return immediately, it will wait for the
      // asynchronous code to finish, so we call unblock to allow this client
      // to queue other method calls.
      this.unblock();
      // run synchonous system command
      if(data === "edge1"){
        console.log("edge1");
        var video = "SnowBranch.mp4"
        var target = "video1"

      } else if(data === "edge2"){
        console.log("edge2");
        video = "Veniceskatepark.mp4"
        target = "video2"
      }
      var video = "SnowBranch.mp4"
      var target = data;
      var result = process_exec_sync(`ffmpeg -re -stream_loop -1 -i /home/rich/apex/apex-ochsner-poc/imports/api/ffmpeg/${video} -c copy -f rtsp rtsp://localhost:8554/${target}`);
      // check for error
      if (result.error) {
        throw new Meteor.Error("exec-fail", "Error running ffmpeg: " + result.error.message);
      }
      // success
      return true;
    },
    
    // NOTE: When this method is called the endpoint is being passed in as data. This was done to be ready for a demo. More information will need to be passed in order
    // work with multiple inbound streams being copied and pushed to local rtsp server.
    runffmpegCopy: function(data) {
      // This method call won't return immediately, it will wait for the
      // asynchronous code to finish, so we call unblock to allow this client
      // to queue other method calls.
      this.unblock();
      // run synchonous system command
      var result = process_exec_sync(`ffmpeg -rtsp_transport tcp -i rtsp://admin:1070Ma1trix@home.zenzig.com:554/Streaming/Channels/101/ -c copy -f rtsp rtsp://localhost:8554/${data}`);
      // check for error
      if (result.error) {
        throw new Meteor.Error("exec-fail", "Error running ffmpeg: " + result.error.message);
      }
      // success
      return true;
    },
    

    ffmpegCopyFromCamera: function(camera_url, edge_device) {
      //console.log("pathToFfmpeg: "+pathToFfmpeg);
      // This method call won't return immediately, it will wait for the
      // asynchronous code to finish, so we call unblock to allow this client
      // to queue other method calls.        
      this.unblock();
      // run synchonous system command
        //console.log(`ffmpeg -use_wallclock_as_timestamps 1 -rtsp_transport tcp -i ${camera_url} -c copy -f rtsp rtsp://localhost:8554/${edge_device} 2> /home/rich/apex/apex-ochsner-poc2/imports/api/ffmpeg/ffmpeg.log`);
       // var result = process_exec_sync(`pkill -f ^ffmpeg.* ${edge_device}$; ffmpeg -use_wallclock_as_timestamps 1 -rtsp_transport tcp -i ${camera_url} -c copy -f rtsp rtsp://localhost:8554/${edge_device} 2> /home/rich/apex/apex-ochsner-poc2/imports/api/ffmpeg/ffmpeg.log`);
        var result = process_exec_sync(`pkill -f ^ffmpeg.* ${edge_device} $; ffmpeg -use_wallclock_as_timestamps 1 -rtsp_transport tcp -i ${camera_url} -c copy -f rtsp rtsp://localhost:8554/${edge_device}`);
         // check for error
        if (result.error) {
          throw new Meteor.Error("exec-fail", "Error running ffmpeg: " + result.error.message);
        }
        // success
        return result;
    },
    
    killffmpeg: function(device) {
      this.unblock();
      // run synchonous system command.
      let result = process_exec_sync(`pkill -f '^ffmpeg.*${device}$'`);
      if (result.error) {
          throw new Meteor.Error("exec-fail", "Error killing ffmpeg: " + result.error.message);
        }
        // success
        return result;
    },
    
    findffmpeg: function(edge_device) {
      // This method call won't return immediately, it will wait for the
      // asynchronous code to finish, so we call unblock to allow this client
      // to queue other method calls.
      this.unblock();
      // run synchonous system command.
      let pidString = process_exec_sync(`ps aux | grep  ${edge_device} | tr -s ' ' | cut -d ' ' -f 2`);
      return pidString;
    },

  });

  