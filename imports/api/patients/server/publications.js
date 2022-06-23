// All patients-related publications

import { Meteor } from 'meteor/meteor';
import { Patients } from '../patients.js';

Meteor.publish('patients.all', function () {
  return Patients.find();
});
