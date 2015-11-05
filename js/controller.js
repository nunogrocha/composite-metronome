//********************************            ****************************
//*                             MAIN CONTROLLER                          *
//********************************            ****************************

app.controller('homeController', ['$scope', '$rootScope', '$localStorage', '$mdUtil', '$mdSidenav', '$log', '$window', '$mdDialog',
    function($scope, $rootScope, $localStorage, $mdUtil, $mdSidenav, $log, $window, $mdDialog) {

        /****************************************************************
        *
        *   VARIABLES
        *
        ****************************************************************/

        var mainContentEl = document.getElementById('main-content');
        var scrollToBottomCurrentValue = 0;

        //Global window width access.
        $scope.windowWidth = 0;

        //Used to populate the resolution select dropdown.
        $scope.resolutions = [
            { value: '3', name: '3rd' },
            { value: '0', name: 'Quarter' },
            { value: '1', name: '8th' },
            { value: '2', name: '16th' }
        ];

        //Used to populate the signatures select dropdown.
        $scope.signatures = [
            { value: '1' },
            { value: '2' },
            { value: '3' },
            { value: '4' },
            { value: '5' },
            { value: '6' },
            { value: '7' },
            { value: '8' },
            { value: '9' },
            { value: '10' }
        ];

        //Used to populate the signaturesbottom select dropdown.
        $scope.signaturesbottom = [
            { value: '4', name: '4' },
            { value: '8', name: '8' },
            { value: '16', name: '16' }
        ];

        //Used to set the select dropdown default values.
        $scope.signaturebottom = $scope.signaturesbottom[0];
        $scope.signature = $scope.signatures[3];
        $scope.resolution = $scope.resolutions[0];

        //Fix up prefixing
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        //Web Audio API.
        //var audioContext = new (window.AudioContext || window.webkitAudioContext)()
        var audioContext = new AudioContext();

        //Scheduler from https://github.com/mohayonao/web-audio-scheduler
        var scheduler = new WebAudioScheduler({
            context: audioContext
        });

        //Beep global oscilator.
        var osc = audioContext.createOscillator();
        var filter = audioContext.createBiquadFilter();
        var compressor = audioContext.createDynamicsCompressor();

        //Mute node.
        var mute = audioContext.createGain();
        var muteBar = false;

        //Default values.
        $scope.stop = true;
        $scope.tempo = 120.0;
        var noteTime = (60 / $scope.tempo);
        var signature = 4 * 4;
        var noteResolution = 0;
        var nextNoteTime = 0.0;
        var signaturebottom = 1;

        //Oscilator gain used as volume.
        $scope.gain = 0.6;

        //TimelineQueue position index.
        var timelinePosition = 0;

        //Frontend selected loop block index.
        $scope.fronttimeline = 0;

        //Array with the loop blocks.
        //Always loads from localstorage.
        $scope.timelineQueue = $localStorage.timelineQueue;

        /****************************************************************
        *
        *   FRONT END $scope CALLED FUNCTIONS
        *
        ****************************************************************/

        //Open left sidenav.
        $scope.toggleLeft = buildToggler('left');

        //Binds to window size and sets windowWidth with it's current width.
        $scope.$watch(function(){
            return $window.innerWidth;
            }, function(value) {
                $scope.windowWidth = value;
        });

        //Front end increment time.
        $scope.increaseBPM = function (){
            $scope.tempo++;
        }

        //Front end decrement time.
        $scope.decreaseBPM = function (){
            $scope.tempo--;
        }

        //Silence node front end bind.
        $scope.silenceChange = function() {
            muteBar = !muteBar;
        }

        //Signature denominator front end bind.
        //Changes the values shown on the note resolution depending on the signature demoninator.
        $scope.bottomChange = function() {
            if ($scope.signaturebottom.value == 8) {
                $scope.resolutions = [
                    { value: '0', name: '8th' },
                    { value: '1', name: '16th' }
                ];
            } else if ($scope.signaturebottom.value == 16) {
                $scope.resolutions = [
                    { value: '0', name: '16th' }
                ];
            } else {
                $scope.resolutions = [
                    { value: '0', name: 'Quarter' },
                    { value: '3', name: '3rd' },
                    { value: '1', name: '8th' },
                    { value: '2', name: '16th' }
                ];
            }
            $scope.resolution = $scope.resolutions[0];
        }

        //Saves the $scope.timelineQueue in the localstorage.
        $scope.saveTimeline = function() {
            $localStorage.timelineQueue = $scope.timelineQueue;
        }

        //Adds a loop block to the queue and saves it to localstorage.
        $scope.addTimeline = function() {
            $scope.timelineQueue.push({
                signature: $scope.signature.value,
                signaturebottom: $scope.signaturebottom.value,
                noteResolution: $scope.resolution.value,
                nrString: $scope.resolution.name,
                mute: muteBar
            });
            $scope.saveTimeline();
        }

        //Removes a loop block from the queue and saves it to localstorage.
        //Then stops the metronome and sets it to the start of the loop.
        $scope.removeTimeline = function(obj) {
            $scope.stop = true;
            setTimeline(0);

            var index = $scope.timelineQueue.indexOf(obj);

            if (index > -1) {
                $scope.timelineQueue.splice(index, 1);
            }

            if ($scope.timelineQueue.length == 1) {
                timelinePosition = 0;
                $scope.$apply(function() {
                    $scope.fronttimeline = 0;
                });
            }
            $scope.saveTimeline();
        }

        //Sets the TimelineQueue position index to the loop block that was selected on the frontend.
        $scope.selectTimeline = function(index) {
            setTimeline(index);
        }

        //Increases oscilator gain to work as volume.
        $scope.volumeUp = function() {
            if ($scope.gain <= 1) {
                $scope.gain = $scope.gain + 0.1;
            }
        }

        //Lowers oscilator gain to work as volume.
        $scope.volumeDown = function() {
            if ($scope.gain >= 0) {
                $scope.gain = $scope.gain - 0.1;
            }
        }

        //Starts the scheduler.
        $scope.start = function() {
            if ($scope.stop) {
                scheduler.start(metronome);
                $scope.stop = false;
            }
        }

        //Stops the scheduler.
        $scope.stp = function() {
            if (!$scope.stop) {
                $scope.stop = true;
                osc.stop();
                scheduler.remove();
            }
        }

        //Opens right sidenav.
        $scope.toggleRight = buildToggler('right');

        $scope.getRightMenuClass = function() {
            if( !$mdSidenav('right').isOpen() ){
                scrollToBottomCurrentValue = 0;
                mainContentEl.style['-webkit-transform'] = '';
            }
            return '';
        };

        $scope.scrollToBottom = function(){
            var rectMainContent = mainContentEl.getBoundingClientRect();
            var rectDocument = document.documentElement.getBoundingClientRect();

            var val = rectDocument.bottom - rectMainContent.bottom;
            scrollToBottomCurrentValue += Math.min(val, 0);
            mainContentEl.style['-webkit-transform'] = 'translate3d(0px, '+scrollToBottomCurrentValue+'px, 0px)';
        };

        /****************************************************************
        *
        *   BACK END WORK FUNCTIONS
        *
        ****************************************************************/

        //Sets the TimelineQueue position index to a recived index position.
        function setTimeline(index){
            timelinePosition = index;
            $scope.fronttimeline = timelinePosition;
        }

        //This function is called when a loop block gets played in metronome(e).
        //Sets the loop block variables to the n + 1 TimelineQueue index data.
        //At any time, we only know how the next loop block is like.
        function timeline(index) {
            if (!$scope.stop) {
                //Loads the variables from the timeline position loop block so that
                //they get played by the metronome(e) on his next iteration.
                signaturebottom = ($scope.timelineQueue[timelinePosition].signaturebottom / 4);
                signature = parseInt($scope.timelineQueue[timelinePosition].signature) * 4;
                noteResolution = $scope.timelineQueue[timelinePosition].noteResolution;
                muteBar = $scope.timelineQueue[timelinePosition].mute;

                $scope.$apply(function() {
                    $scope.fronttimeline = timelinePosition;
                });

                if (timelinePosition == $scope.timelineQueue.length - 1) {
                    timelinePosition = 0;
                } else {
                    timelinePosition++;
                }
            } else {
                timelinePosition=0;
                $scope.$apply(function() {
                    $scope.fronttimeline = 0;
                });
            }
        }

        //Recursive function that calls timeline() for it to load the n + 1 loop block and then
        //adds the loop blocks from index n to the scheduler so that they get played.
        function metronome(e) {
            timeline(timelinePosition);

            var lastBeat = 0;
            var lastSubBeat = 0;

            //Goes through a signature playing every beat in the loop block.
            for (var i = 0; i <= signature; i++) {

                noteTime = (60 / ($scope.tempo * signaturebottom));
                nextNoteTime = 0.25 * noteTime;

                if ($scope.stop == true) {
                    scheduler.stop(true);
                } else if ((noteResolution == 1) && (i % 2)) {
                    //Skips playing non-8th 16th notes
                } else if ((noteResolution == 0) && (i % 4)) {
                    //Skips playing non-quarter 8th notes
                } else if (noteResolution != 3) { //REGULAR SUBDIVISIONS
                    if (i == 0) {
                        //First beat has a higher oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, ticktack, [1000, 0.05, muteBar]);
                    } else if (i == signature) {
                        //Recursive callback for the next loop block.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, metronome);
                    } else if ((i % 2) || (i % 4)) {
                        //Regular beat has a lower oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, ticktack, [400, 0.05, muteBar]);
                    } else {
                        //Regular beat has a lower oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, ticktack, [600, 0.05, muteBar]);
                    }
                } else if (noteResolution == 3) { //THIRDS
                    if (i == 0) {
                        //First beat has a higher oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, ticktack, [1000, 0.05, muteBar]);
                    } else if (i == signature) {
                        //Recursive callback for the next loop block.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, metronome);
                    } else if (i == 0 || i == 4 || i ==  8 || i == 12 || i == 16 || i == 20 || i == 24 || i == 28 || i == 32 || i == 36 || i == 40) {
                        //Regular beat has a lower oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime, ticktack, [600, 0.05, muteBar]);
                        lastBeat = i;
                    } else if (i > lastBeat && i < lastBeat + 3 && lastSubBeat == 0) {
                        //Regular beat has a lower oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime + 0.033, ticktack, [400, 0.05, muteBar]);
                        lastSubBeat = 1;
                    } else if (i > lastBeat && i < lastBeat + 3 && lastSubBeat == 1) {
                        //Regular beat has a lower oscilator pitch.
                        scheduler.insert(e.playbackTime + i * nextNoteTime + 0.066 , ticktack, [400, 0.05, muteBar]);
                        lastSubBeat = 0;
                    }
                }
            }
        }

        //Plays a beat on an oscilator.
        function ticktack(e, freq, dur, muteBar) {
            var t0 = e.playbackTime;
            var t1 = t0 + dur;

            osc = audioContext.createOscillator();
            var amp = audioContext.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';
            amp.gain.value = $scope.gain;

            //Silence beat
            if (muteBar == 'true' || muteBar == true) {
                mute.gain.value = 0;
            } else {
                mute.gain.value = 1;
            }

            osc.start(e.playbackTime);

            osc.connect(amp);
            amp.connect(mute);

            mute.connect(filter);
            filter.connect(compressor);

            filter.frequency.value = 2440;
            filter.type = 'highshelf';
            filter.Q.value = 10;
            filter.gain.value = 1;

            filter.connect(audioContext.destination);

            scheduler.insert(t1, function(e) {
                osc.stop(e.playbackTime);
                scheduler.nextTick(function() {

                });
            });
        }

        /**
         * Build handler to open/close a SideNav; when animation finishes
         * report completion in console
         */

        function buildToggler(navID) {
          var debounceFn =  $mdUtil.debounce(function(){
                $mdSidenav(navID).toggle()
                  .then(function () {
                    $scope.scrollToBottom();
                    $log.debug("toggle " + navID + " is done");
                  });
              },300);
          return debounceFn;
        }

    }
])
