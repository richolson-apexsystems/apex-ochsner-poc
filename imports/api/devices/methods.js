// Methods related to devices
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Devices } from './devices.js';
const fs = Npm.require('fs-extra');
const readline = require('readline'); // CANVAS VIDEO REQUIREMENT
const insertLine = require('insert-line');// CANVAS VIDEO REQUIREMENT

Meteor.methods({
	'devices.insert'(edge_device) {
		check(edge_device, String);
		return Devices.insert({
		  edge_device,
		  createdAt: new Date(),
		});
	},
  
	"devices.update": function(id, data) {
		return Devices.update({ _id: id }, { $set: data }, {upsert: true});
	},

	"devicePullObject": function(obj) {
		return Devices.update({_id: "devices" }, {$pull: { "devices": obj }});
	},	

	"devicePushDevices": function(obj) {
		// empty Object check
		if(Object.keys(obj).length === 0 && obj.constructor === Object) {
			return false;
		} else {
			return Devices.update({_id: "devices" },  {$addToSet: { "devices": obj }});
		}
	},

	"deviceUpdateObject": function(id, obj) {
		return Devices.update({"_id": id},{$set: {"devices.$": obj}});
	},	

	'devicesAddToArray'(data) {
	 	return Devices.update({ _id: "devices" },{ $push: { devices: data }});
	}, 

	"devices.remove": function(id) {
		return Devices.remove({ _id: "devices" });
	},
	
	"devicesPushPid": function(obj) {
		return Devices.update({_id: "devices" },  {$push: { obj }});
	},	

	"devicesSetEdge": function(device) {
		return Devices.update({_id: "devices"},{$set: {"edge.$.edgedevice": device.edgedevice}}, { unique : true });
	},	

	"devicesPullPid": function(obj) {
		return Devices.update({_id: "devices" },  {$pull: { "devices": obj }});
	},	 
	// CANVAS VIDEO : method called from client /imports/ui/components/patients/patients.js line 170
	"deviceAddProxie": function(edge_device, camera_url) {
		// these modules are required for file reading/writing operations below  
		// const fs = Npm.require('fs-extra');
		// const readline = require('readline'); // this can be used to find specific lines in a text file
		// const insertLine = require('insert-line');
		
		// create readline interface to get a line number where the String 'paths:' appears in the file. 
		const rl = readline.createInterface({
		    input: fs.createReadStream(`${process.env.PWD}/.uploads/rtsp-simple-server-sources/rtsp-simple-server.yml`), // read from yml file
		    crlfDelay: Infinity // - \r followed by \n will always be considered a single newline 
		});
		// set counter for line numbers
		let count = 0; 
		rl.on('line', (line) => {
		    count++;
		    if (line.includes('paths:')) { // find the line with paths
		        console.log('found paths at line number: '+count); 
		        // we want to insert our line below our "paths:" line so we will increment our count by one here
		        count++;
		       /* rtsp-simple-server requires entries to its config file follow an indented syntax as in the following example:
		          paths:
		            room36:
		              source: "rtsp://home.zenzig.com:8554/profile2/media.smp"
		        */
		        // to maintain our indented syntax we construct a variable as follows to represent our new proxie "room37"
		        const newLine = `  ${edge_device}:\n    source: "${camera_url}" `
		        // we read the file using readline to get our line number, now we use "insertLine" becuase it lets us insert at a line number
		        insertLine(`${process.env.PWD}/.uploads/rtsp-simple-server-sources/rtsp-simple-server.yml`).content(newLine).at(count).then(function(err) {
		          if (err) return console.log(err);
		          let content = fs.readFileSync(`${process.env.PWD}/.uploads/rtsp-simple-server-sources/rtsp-simple-server.yml`, 'utf8');
		          console.log("new proxie written to rtsp-simple-server config.");
		        });
		    }
		});
	},  
	
	// CANVAS VIDEO : method called from client /imports/ui/components/patients/patients.js line 217
	"deviceRemoveProxie": function(edge_device) {
	  console.log("edge_device: "+edge_device);
    fs.readFile(`${process.env.PWD}/.uploads/rtsp-simple-server-sources/rtsp-simple-server.yml`, {encoding: 'utf-8'}, function(err, data) {
        if (err) throw err;
        let dataArray = data.split('\n'); // convert file data in an array
        const searchKeyword = edge_device; // we are looking for a line containing edge_device in the file
        let lastIndex = -1; // let say we have not found the edge_device
    
        for (let index=0; index<dataArray.length; index++) {
            if (dataArray[index].includes(searchKeyword)) { // check if a line contains edge_device 
                lastIndex = index; // found a line that contains edge_device
                break; 
            }
        }
    
        dataArray.splice(lastIndex, 1); // remove the edge_device from the data Array
        dataArray.splice(lastIndex, 1); // old index assigned to next line so we just call it again 
        // now we write our modified array data back to file.
        const updatedData = dataArray.join('\n');
        fs.writeFile(`${process.env.PWD}/.uploads/rtsp-simple-server-sources/rtsp-simple-server.yml`, updatedData, (err) => {
            if (err) throw err;
            console.log ('Successfully updated the file data');
        });

    });
	}  
  
  
  
  
  
});
