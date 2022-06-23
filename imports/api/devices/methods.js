// Methods related to devices
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Devices } from './devices.js';

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
  
});
