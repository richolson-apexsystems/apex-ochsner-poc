// Client entry point, imports all client code
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import popper from 'popper.js';
global.Popper = popper;
import '/node_modules/bootstrap/dist/js/bootstrap.bundle.js'; // 5.1.3
import '/imports/startup/client';
import '/imports/startup/both';

// create global template helper
Template.registerHelper('instance', function () {
  return Template.instance();
});
