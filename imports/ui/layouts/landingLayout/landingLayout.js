import './landingLayout.html';
import './landingLayout.scss';
import '../../components/navigation/navigation.js';
var dayjs = require('dayjs');

Template.landingLayout.onCreated(function() {
});

Template.landingLayout.onRendered(function(){
    $(document).ready(function () {
    });
    
});

Template.landingLayout.helpers({
    getDate() {
        return dayjs(new Date()).format('MM/DD/YYYY');
    }
});

Template.landingLayout.events({

});