// Tests for the behavior of the patients collection
// https://guide.meteor.com/testing.html

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Patients } from './patients.js';

if (Meteor.isServer) {
  describe('patients collection', function () {
    it('insert correctly', function () {
      const patientId = Patients.insert({
        first_name: 'Joe',
        last_name: 'Patient',
        room_number: 123,
        edge_device: "room123"
      });
      const added = Patients.find({ _id: patientId });
      const collectionName = added._getCollectionName();
      const count = added.count();

      assert.equal(collectionName, 'patients');
      assert.equal(count, 1);
    });
  });
}
