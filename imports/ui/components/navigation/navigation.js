import { Session } from 'meteor/session';
import './navigation.html';
import './navigation.scss';

Template.navigation.onCreated(function navigationOnCreated() {

});


Template.navigation.onDestroyed(function() {
    
});


Template.navigation.onRendered(function() {


 $(document).ready(function () {

 });

});

Template.navigation.helpers({

});

Template.navigation.events({
    'click .login-toggle': ()=> {
        Session.set('nav-toggle', 'open');
    },

});

