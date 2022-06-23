import { Patients } from '/imports/api/patients/patients.js';
import { Devices } from '/imports/api/devices/devices.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveDict } from 'meteor/reactive-dict';
import './patients.html';
import './grid.css';
import { io } from 'socket.io-client';
//const socket = io("https://demos.zenzig.com");
const localsocket = io("https://rtsp.zenzig.com");
var dayjs = require('dayjs');
//import "jquery-validation";
//import "jquery-validation/dist/additional-methods.js"
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
    
/* 
    // socket.io testing
      socket.on('pytest', (data) => {
        //console.log("pytest: "+data);
        let el = document.getElementById("js-test-audio");
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
*/


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
    formFields.forEach((element) => {
      //console.log(element);
    });
    
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
          document.getElementById("js-patient-form").reset();            }
      });          
      //document.getElementById("submit-alert-success").classList.remove("hide-alert");
      //setTimeout( function() { document.getElementById("submit-alert-success").classList.add("hide-alert");; }, 1500);
    }
	},

  "click #js-patient-delete": function(e, t) {
		e.preventDefault();
		let me = this;
		// we have to set our edgedevice value here becuase we will remove the record first
		let edgedevice = me.edge_device;
	  // get our devices data
    //let devices = Devices.find({_id: "devices"}).fetch();
    //let deviceIndex = getDeviceIndex(devices[0].devices, me.edge_device);
    //console.log("deviceIndex: "+devices[0].devices[deviceIndex].edgedevice); 
		
		//console.log("me: "+JSON.stringify(me));
		bootbox.dialog({
			message: "Delete? Are you sure?",
			title: "Delete",
			animate: false,
			buttons: {
				success: {
					label: "Yes",
					className: "btn-success",
					callback: function() {
					  
					  // first we remove the record to prevent videos template from trying to add element
					  Meteor.call('patients.remove', me._id, (error) => {
                if (error) {
                  alert(error.error);
                } else {
                  return true;
                }
            });
					  // next we remove the record using a timeout to (should probably refactor to async/await) make sure 
					  // our killffmpeg call above has the me.edge_device record available
					  Meteor.setTimeout(function(){
					      // remove device from devices database
					  Meteor.call("devicePullObject", { "edgedevice": edgedevice }); 
					  // kill any ffmpeg instance for this device name
					  Meteor.call("killffmpeg", edgedevice);
   					    
					  }, 200);

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
        //document.getElementById("js-patient-edit-submit-form").reset();
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
 
 
 
 
 
 
    
////////////////////////////////////////////////////////
/*
new Cam({
  hostname: '68.227.145.128',
  username: 'admin',
  password: 'Password123',
  port: '8888'
}, function(err) {
  this.getDeviceInformation(function(err, res){
    console.log("res: "+res);
  });

});
*/

//////////////////////////////////////////////////////////
    
    
    
    
    
    
    
    
    
    
    
    
    
	},	  
});
