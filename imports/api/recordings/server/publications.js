import { Meteor } from 'meteor/meteor';
import { Recordings } from '../recordings.js';

Meteor.publish('recordings.all', function () {
  return Recordings.find();
});
