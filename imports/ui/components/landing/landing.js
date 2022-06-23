import { Patients } from '/imports/api/patients/patients.js';
import { Meteor } from 'meteor/meteor';
import './landing.html';
import './grid.css';
var dayjs = require('dayjs');
import bootbox from 'bootbox';

Template.landing.onCreated(function landingOnCreated() {
  // get our data
  Meteor.subscribe('patients.all');
});

Template.landing.onRendered(function(){
    $(document).ready(function () {
    });
});

Template.landing.helpers({
  // helper that returns text shown in alert message to alert element in template
  alertTarget() {
    return Session.get("alertTarget");
  },
  
  editPatient() {
    //return true;
    return Session.get("editPatient");
  },
  
  addPatient() {
    //return true;
    return Session.get("addPatient");
  },
  // return cursor to template
  patients() {
    return Patients.find({});
  },
  // date format helper called in template with date passed in as value
  checkDate(value) {
    return dayjs(value).format('MM/DD/YYYY');
  },
  
  firstName() {
    return Session.get("firstName");
  },
  
  lastName() {
    return Session.get("lastName");
  },

  roomNumber() {
    return Session.get("roomNumber");
  },  
});

Template.landing.events({
 "click #form-submit-button": function(e, t) {
    e.preventDefault();
    let first_name = t.find('#first_name').value;
    let last_name = t.find('#last_name').value;    
    let room_number = t.find('#room_number').value;
    let edge_device = t.find('#edge_device').value;

    if(!first_name) {
      Session.set("alertTarget", "First Name");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
      
    } else if (!last_name) {
      Session.set("alertTarget", "Last Name");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
      
    } else if(!room_number) {
      Session.set("alertTarget", "Room Number");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");  
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);

    } else if(!edge_device || edge_device === "Choose...") {
      Session.set("alertTarget", "Edge Device");
      document.getElementById("submit-alert-fail").classList.remove("hide-alert");  
      setTimeout( function() { document.getElementById("submit-alert-fail").classList.add("hide-alert");; }, 1500);
  
    } else {
      
      Meteor.call('patients.insert', first_name, last_name, room_number, edge_device, (error) => {
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
		bootbox.dialog({
			message: "Delete? Are you sure?",
			title: "Delete",
			animate: false,
			buttons: {
				success: {
					label: "Yes",
					className: "btn-success",
					callback: function() {
  					Meteor.call('patients.remove', me._id, (error) => {
              if (error) {
                alert(error.error);
              } else {
  
              }
            });   
      
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
    Session.set("addPatient", false);
    // get values for our edit form
    let patients = Patients.findOne({_id: me._id});
    // populate our edit form
    Session.set("firstName", me.first_name);
    Session.set("lastName", me.last_name);
    Session.set("roomNumber", me.room_number);
    Session.set("editId", me._id);
	},	
	 "click #js-patient-edit-submit": function(e, t) {
    e.preventDefault();
    let me = this;
    let first_name = t.find('#first_name').value;
    let last_name = t.find('#last_name').value;    
    let room_number = t.find('#room_number').value;
    let edge_device = t.find('#edge_device').value;



   

    Meteor.call('patients.update', Session.get("editId"),  first_name, last_name, room_number, edge_device, (error) => {
      if (error) {
        alert(error.error);
      } else {
        //document.getElementById("js-patient-edit-submit-form").reset();
        //show our add form
        Session.set("addPatient", true);
        
      }
    });  

	},
  
});
