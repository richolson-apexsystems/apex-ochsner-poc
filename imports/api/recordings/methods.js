// Methods related to recordings
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Recordings } from './recordings.js';

Meteor.methods({
	'recordings.insert'(data) {
		return Recordings.insert({
		  data,
		  createdAt: new Date(),
		});
	},
  
	"recordings.update": function(id, data) {
		return Recordings.update({ _id: id }, { $set: data }, {upsert: true});
	},

	"recordingPullObject": function(obj) {
		return Recordings.update({_id: "recordings" }, {$pull: { "recordings": obj }});
	},	

	"recordingPushRecordings": function(obj) {
		// empty Object check
		if(Object.keys(obj).length === 0 && obj.constructor === Object) {
			return false;
		} else {
			return Recordings.update({_id: "recordings" },  {$addToSet: { "recordings": obj }});
		}
	},

	"recordingUpdateObject": function(id, obj) {
		return Recordings.update({"_id": id},{$set: {"recordings.$": obj}});
	},	

	'recordingsAddToArray'(data) {
	 	return Recordings.update({ _id: "recordings" },{ $push: { recordings: data }});
	}, 

	"recordings.remove": function(id) {
		return Recordings.remove({ _id: "recordings" });
	},
	
	"recordingsPushPid": function(obj) {
		return Recordings.update({_id: "recordings" },  {$push: { obj }});
	},	

	"recordingsSetRecording": function(recording) {
		return Recordings.update({_id: "recordings"},{$set: {"recordings.$.recording": recording}}, { unique : true });
	},	

	"recordingsPullRecording": function(recording) {
		return Recordings.update({_id: "recordings" },  {$pull: { "recordings": recording }});
	},	 
  
});
