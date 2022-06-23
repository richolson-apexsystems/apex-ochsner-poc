/**
 * TODO support other encodings:
 * http://stackoverflow.com/questions/7329128/how-to-write-binary-data-to-a-file-using-node-js
 * https://stackoverflow.com/questions/38744548/meteor-js-how-to-write-a-file-to-local-disk-from-the-server
 */

var fs = Npm.require('fs-extra');
var path = Npm.require('path');
var ourpath = false;


Meteor.methods({
  saveArrayAsFile: function(arrayBuffer, filePath){
      fs.writeFile(filePath, Buffer.from(arrayBuffer), 'binary',  (err)=> {
          if (err) {
              console.log("There was an error writing the image")
          }
          else {
              console.log("Written File :" + filePath)
          }
      });    
  },
  
  saveFile: function(blob, name, path, encoding) {
    console.log("saveFile: "+name);
   	var ourpath = ''+process.env.PWD+'/.uploads/profiles/';
   	//ourpath = ''+process.env.PWD + path;   	
    name = name || 'file';
    encoding = encoding || 'binary';
    chroot = Meteor.chroot || 'public';

    fs.ensureDir(ourpath)
    .then(() => {
      fs.writeFile(ourpath + name, blob, encoding, function(err) {
        if (err) {
          throw (new Meteor.Error(500, 'Failed to save file.', err));
        } else {
          //console.log('The file ' + name + ' (' + encoding + ') was saved to ' + ourpath);
          return console.log('The file ' + name + ' (' + encoding + ') was saved to ' + ourpath);
        }
      }); 
    })
    .catch(err => {
      console.error(err);
    });

    function cleanPath(str) {
      if (str) {
        return str.replace(/\.\./g,'').replace(/\/+/g,'').
          replace(/^\/+/,'').replace(/\/+$/,'');
      }
    }
    function cleanName(str) {
      return str.replace(/\.\./g,'').replace(/\//g,'');
    }
  },
  
   fileExists: function(filename) {
      //let ourpath = ''+process.env.PWD+'/.uploads/profiles/'+filename;
      fs.stat(ourpath, function(err, stat) {
          if(err == null) {
              console.log('File exists');
          } else if(err.code === 'ENOENT') {
              // file does not exist
              console.log('File does not exist');
          } else {
              console.log('Some other error: ', err.code);
          }
      });
  },
  
  
   saveRecording: function(blob, name, path, encoding) {
   	ourpath = ''+process.env.PWD+path;
    name = name || 'file';
    encoding = encoding || 'binary';
    chroot = Meteor.chroot || 'public';

    fs.ensureDir(ourpath)
    .then(() => {
      fs.writeFile(ourpath + name, blob, encoding, function(err) {
        if (err) {
          throw (new Meteor.Error(500, 'Failed to save video recording.', err));
        } else {
          //console.log('The file ' + name + ' (' + encoding + ') was saved to ' + ourpath);
          console.log('The recording ' + name + ' (' + encoding + ') was saved to ' + ourpath);
        }
      }); 
    })
    .catch(err => {
      console.error(err);
    });

  },  

	
});
