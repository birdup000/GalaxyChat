const socket = io('/'); // Create our socket
const videoGrid = document.getElementById('video-grid'); // Find the Video-Grid element

const myPeer = new Peer(); // Creating a peer element which represents the current user
const myVideo = document.createElement('video'); // Create a new video tag to show our video
myVideo.muted = true; // Mute ourselves on our end so there is no feedback loop

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// Start with an audio call by default
navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true
}).then(stream => {
    addAudioStream(myVideo, stream); // Display our video to ourselves

    myPeer.on('call', call => { // When we join someone's room we will receive a call from them
        call.answer(stream); // Stream them our video/audio
        const video = document.createElement('video'); // Create a video tag for them
        call.on('stream', userAudioStream => { // When we receive their stream
            addAudioStream(video, userAudioStream); // Display their video to ourselves
        });
    });

    socket.on('user-connected', userId => { // If a new user connect
        connectToNewUser(userId, stream);
    });
}).catch(error => {
    // Handle error here
    console.log('Error accessing media devices.', error);
});

myPeer.on('open', id => { // When we first open the app, have us join a room
    socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) { // This runs when someone joins our room
    const call = myPeer.call(userId, stream); // Call the user who just joined
    // Add their video
    const video = document.createElement('video');
    call.on('stream', userAudioStream => {
        addAudioStream(video, userAudioStream);
    });
    // If they leave, remove their video
    call.on('close', () => {
        video.remove();
    });
}

function addAudioStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => { // Play the video as it loads
        video.play();
    });
    videoGrid.append(video); // Append video element to videoGrid
}

function checkForVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            if(stream.getVideoTracks().length > 0) {
                addVideoStream(myVideo, stream);
            }
        }).catch(error => {
            console.log('No video device detected.', error);
        });
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video); // Append video element to videoGrid
}

// Call this function when user attempts to switch to a video call
// checkForVideo();