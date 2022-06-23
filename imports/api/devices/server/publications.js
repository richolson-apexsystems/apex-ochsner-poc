import { Meteor } from 'meteor/meteor';
import { Devices } from '../devices.js';

Meteor.publish('devices.all', function () {
  return Devices.find();
});
