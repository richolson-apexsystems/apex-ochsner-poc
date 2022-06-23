// Tests for the patients publications
// https://guide.meteor.com/testing.html

import { assert } from 'chai';
import { Patients } from '../patients.js';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import './publications.js';

describe('patients publications', function () {
  beforeEach(function () {
    Patients.remove({});
    Patients.insert({
        first_name: 'Joe',
        last_name: 'Patient',
        room_number: 123,
        edge_device: "room123"
    });
  });

  describe('patients.all', function () {
    it('sends all patients', function (done) {
      const collector = new PublicationCollector();
      collector.collect('patients.all', (collections) => {
        assert.equal(collections.patients.length, 1);
        done();
      });
    });
  });
});
