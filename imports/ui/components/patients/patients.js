import { Patients } from '/imports/api/patients/patients.js';
import { Devices } from '/imports/api/devices/devices.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveDict } from 'meteor/reactive-dict';
import './patients.html';
import './grid.css';
import { io } from 'socket.io-client';
const localsocket = io("https://rtsp.zenzig.com");
var dayjs = require('dayjs');
import bootbox from 'bootbox';
// we create a reactive variable named pageSession scoped to this template to prevent name collisions
// that would occur accross various templates if we were to use the globally available Session object here.
const pageSession = new ReactiveDict();
  
//function to return index of object containing searchfor parameter 
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

Template.patients.onCreated(function patientsOnCreated() {
  // get our data
  this.handles = [
    Meteor.subscribe('patients.all'),
    Meteor.subscribe('devices.all')
  ];
  
  Tracker.autorun(() => {
    const areReady = this.handles.every(handle => handle.ready());
  });

  // track the state of our web form
  pageSession.set("addPatient", true);
  pageSession.set("editPatient", false);
});

Template.patients.onRendered(function(){
  $(document).ready(function(){
  }); 
});

Template.patients.helpers({
  // helper that returns text shown in alert message to alert element in template
  alertTarget() {
    return pageSession.get("alertTarget");
  },
  
  editPatient() {
    return pageSession.get("editPatient");
  },
  
  addPatient() {
    return pageSession.get("addPatient");
  },
  // return mongo cursor to template
  patients() {
    return Patients.find({});
  },
  // date format helper called in template with date passed in as value
  checkDate(value) {
    return dayjs(value).format('MM/DD/YYYY');
  },
  
  firstName() {
    return pageSession.get("firstName");
  },
  
  lastName() {
    return pageSession.get("lastName");
  },

  roomNumber() {
    return pageSession.get("roomNumber");
  },
  
  cameraUrl() {
    return pageSession.get("cameraUrl");
  },  
  
  nurseName() {
    return pageSession.get("nurseName");
  },   
  
  nursePhone() {
    return pageSession.get("nursePhone");
  },   
  edgeDevices() {
    const edgeDevicesArray = ["edge1", "edge2", "edge3"];
    return edgeDevicesArray;
  }  
});

Template.patients.events({
 "click #form-submit-button": function(e, t) {
    e.preventDefault();
    let formFields = ['first_name', 'last_name', 'room_number', 'camera_url', 'nurse_name', 'nurse_phone', 'edge_device'];
    //formFields.forEach((element) => {
      //console.log(element);
    //});
    
    let first_name = t.find('#first_name').value;
    let last_name = t.find('#last_name').value;    
    let room_number = t.find('#room_number').value;
    let camera_url = t.find('#camera_url').value;  
    let nurse_name = t.find('#nurse_name').value;    
    let nurse_phone = t.find('#nurse_phone').value;
    //  rtsp://68.227.145.128:8554/profile2/media.smp
    let edge_device = "room"+room_number;
    // set error messages to display for each field being submitted
    if(!first_name) {
      pageSession.set("alertTarget", "a first name for the patient");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
    } else if (!last_name) {
      pageSession.set("alertTarget", "a last name for the patient");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
    } else if(!room_number) {
      pageSession.set("alertTarget", "a room number");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");  
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
    } else if(!nurse_name) {
      pageSession.set("alertTarget", "the on-call nurse's name");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");  
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
    } else if(!nurse_phone) {
      pageSession.set("alertTarget", "a phone number for the on-call nurse");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");  
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);    
     
    } else {
      Meteor.call('patients.insert', first_name, last_name, room_number, camera_url, nurse_name, nurse_phone, edge_device, (error) => {
        if (error) {
          alert(error.error);
        } else {
          document.getElementById("js-patient-form").reset(); 
          // CANVAS VIDEO : add proxie to rtsp server config for this camera
          Meteor.call("deviceAddProxie", edge_device, camera_url, (error) => {
            if (error) {
              alert(error.error);
            } 
          });           
        }
      }); 

    }
	},

  "click #js-patient-delete": function(e, t) {
		e.preventDefault();
		let me = this;
		// we have to set our edgedevice value here becuase we will remove the record first
		let edgedevice = me.edge_device;

		bootbox.dialog({
			message: "Delete? Are you sure?",
			title: "Delete",
			animate: false,
			buttons: {
				success: {
					label: "Yes",
					className: "btn-success",
					callback: function() {

					  // remove the patient record 
					  Meteor.call('patients.remove', me._id, (error) => {
                if (error) {
                  alert(error.error);
                } else {
                  return true;
                }
            });
            
            // CANVAS VIDEO : remove the rtsp proxie for this camera
            Meteor.call("deviceRemoveProxie", edgedevice, (error) => {
					      if (error) {
                  alert(error.error);
                } else {
                  return true;
                }
					  }); 
					  
					  Meteor.call("devicePullObject", { "edgedevice": edgedevice }); 
					}
				},
				danger: {
					label: "No",
					className: "btn-default"
				}
			}
		});
		return false;
	}, 
	
 "click #js-patient-edit": function(e, t) {
    e.preventDefault();
    let me = this;
    //show our edit form
    pageSession.set("addPatient", false);
    // get values for our edit form
    let patients = Patients.findOne({_id: me._id});
    // populate our edit form
    pageSession.set("firstName", me.first_name);
    pageSession.set("lastName", me.last_name);
    pageSession.set("roomNumber", me.room_number);
    pageSession.set("cameraUrl", me.camera_url);
    pageSession.set("nurseName", me.nurse_name);
    pageSession.set("nursePhone", me.nurse_phone);
    pageSession.set("editId", me._id);
	},	
	 "click #js-patient-edit-submit": function(e, t) {
    e.preventDefault();
    let me = this;
    let first_name = t.find('#first_name').value;
    let last_name = t.find('#last_name').value;    
    let room_number = t.find('#room_number').value;
    let camera_url = t.find('#camera_url').value;    
    let nurse_name = t.find('#nurse_name').value;    
    let nurse_phone = t.find('#nurse_phone').value;
    let edge_device = "room"+room_number;
 
    Meteor.call('patients.update', pageSession.get("editId"), first_name, last_name, room_number, camera_url, nurse_name, nurse_phone, edge_device, (error) => {
      if (error) {
        alert(error.error);
      } else {
        //show our add form
        pageSession.set("addPatient", true);
      }
    });  

	},
  
 "click #js-test-audio": function(e, t) {
    e.preventDefault();
    let me = this;
    console.log("test audio");
    const xaddr = 'http://68.227.145.128:8888/onvif/device_service' ;
    localsocket.emit("audiotest", true);
	},	 
	
	
	
});
