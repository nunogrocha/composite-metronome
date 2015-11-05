var app = angular.module('metronome', ['ngMaterial','ngMdIcons','dndLists','ngStorage']);

app.config(function($mdThemingProvider){
    $mdThemingProvider.theme('default')
        .primaryPalette('indigo')
        .accentPalette('pink');
});

app.run(function($localStorage) {

    $localStorage.timelineQueue;

    if(window.localStorage['me-firstVisit'] !== "true"){
        $localStorage.timelineQueue = [];

        $localStorage.timelineQueue.push({signature : 4, signaturebottom : 4, noteResolution : 0, nrString : 'Quarter', mute: 'false'});
        $localStorage.timelineQueue.push({signature : 3, signaturebottom : 4, noteResolution : 1, nrString : '8th', mute: 'false'});
        $localStorage.timelineQueue.push({signature : 2, signaturebottom : 8, noteResolution : 0, nrString : '8th', mute: 'false'});

        window.localStorage['me-firstVisit'] = true;
    }
});
