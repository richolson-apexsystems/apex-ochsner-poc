// Tests for patients methods
// https://guide.meteor.com/testing.html

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Patients } from './patients.js';
import './methods.js';

if (Meteor.isServer) {
  describe('patients methods', function () {
    beforeEach(function () {
      Patients.remove({});
    });

    it('can add a new patient', function () {
      const addPatient = Meteor.server.method_handlers['patients.insert'];
      addPatient.apply({}, [ 'Joe','Patient', 123,"room123"]);
      assert.equal(Patients.find().count(), 1);
    });
  });
}
