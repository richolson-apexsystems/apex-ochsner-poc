// Methods related to patients

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Patients } from './patients.js';

Meteor.methods({
  'patients.insert'(first_name, last_name, room_number, camera_url, nurse_name, nurse_phone, edge_device) {
    check(first_name, String);
    check(last_name, String);
    check(room_number, String);
    check(camera_url, String);    
    check(edge_device, String);
    check(nurse_name, String);
    check(nurse_phone, String);

    return Patients.insert({
      first_name, 
      last_name, 
      room_number,
      camera_url,
      nurse_name,
      nurse_phone,
      edge_device,
      createdAt: new Date(),
    });
  },
  
 'patients.update'(id, first_name, last_name, room_number, camera_url, nurse_name, nurse_phone, edge_device) {
    return Patients.update({ _id: id }, { first_name: first_name, last_name: last_name, room_number: room_number, camera_url: camera_url, nurse_name: nurse_name, nurse_phone: nurse_phone, edge_device: edge_device });
	},
  
  "patients.remove": function(id) {
		return Patients.remove({ _id: id });
	},
  

});
