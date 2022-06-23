import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';

// Import needed templates
//import '../../ui/layouts/body/body.js';
import '../../ui/layouts/landingLayout/landingLayout.js';
import '../../ui/pages/home/home.js';
import '../../ui/pages/dashboard/dashboard.js';
import '../../ui/pages/not-found/not-found.js';


// main landing
FlowRouter.route('/', {
    name: 'landing',
    action() {
        BlazeLayout.render("landingLayout", { main: "App_home" });
    },
});

// Patient data
FlowRouter.route('/dashboard', {
    name: 'dashboard',
    action() {
        BlazeLayout.render("landingLayout", { main: "dashboard" });
    },
});

FlowRouter.route('*', { 
   action() {
     BlazeLayout.render("landingLayout", { main: 'App_notFound' });
  }
  
});
