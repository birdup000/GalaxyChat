const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer();
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

navigator.mediaDevices.getUserMedia({
  video: false,
  audio: true
}).then(stream => {
  addAudioStream(myVideo, stream);

  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userAudioStream => {
      addAudioStream(video, userAudioStream);
    });
    call.on('close', () => {
      video.remove();
    });

    peers[call.peer] = call;
  });

  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream);
  });
}).catch(error => {
  console.log('Error accessing media devices.', error);
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addAudioStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

socket.on('stream-update', userId => {
  if (peers[userId]) {
    const remoteVideoTrack = peers[userId].peerConnection.getRemoteStreams()[0].getVideoTracks()[0];
    if (remoteVideoTrack) remoteVideoTrack.enabled = true;
  }
});


function toggleAudio() {
  const audioToggle = document.getElementById('audio-toggle');
  if (audioToggle.checked) {
    unmuteAudio();
  } else {
    muteAudio();
  }
}

function muteAudio() {
  if (myVideo.srcObject) {
    myVideo.srcObject.getAudioTracks().forEach(track => track.enabled = false);
  }
}

function unmuteAudio() {
  if (myVideo.srcObject) {
    myVideo.srcObject.getAudioTracks().forEach(track => track.enabled = true);
  }
}

function stopAudio() {
  if (myVideo.srcObject) {
    myVideo.srcObject.getAudioTracks().forEach(track => track.stop());
  }
}

function checkForAudio() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      if (stream.getAudioTracks().length > 0) {
        addAudioStream(myVideo, stream);
      }
    }).catch(error => {
      console.log('No audio device detected.', error);
    });
}

function checkForVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      if (stream.getVideoTracks().length > 0) {
        addVideoStream(myVideo, stream);
      }
    }).catch(error => {
      console.log('No video device detected.', error);
    });
}

document.getElementById('video-toggle').addEventListener('change', toggleVideo);

function toggleVideo() {
    const videoToggle = document.getElementById('video-toggle');
    if (videoToggle.checked) {
      enableVideo();
    } else {
      disableVideo();
    }
  }
  
  function enableVideo() {
    if (myVideo.srcObject) {
      const videoTracks = myVideo.srcObject.getVideoTracks();
      if (videoTracks.length > 0) {
        // If video tracks already exist, enable them
        videoTracks.forEach(track => track.enabled = true);
      } else {
        // If no video tracks exist, get video stream and add it
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(videoStream => {
            videoStream.getVideoTracks().forEach(videoTrack => myVideo.srcObject.addTrack(videoTrack));
            socket.emit('video-toggle', { enabled: true });
          }).catch(error => {
            console.log('Failed to get video stream.', error);
          });
      }
    }
  }
  
  function disableVideo() {
    if (myVideo.srcObject) {
      myVideo.srcObject.getVideoTracks().forEach(track => {
        track.enabled = false; // Disable the track instead of stopping it
        socket.emit('video-toggle', { enabled: false });
      });
    }
  }
  
  socket.on('video-toggle', ({ userId, enabled }) => {
    if (peers[userId]) {
      const remoteVideoTrack = peers[userId].peerConnection.getRemoteStreams()[0].getVideoTracks()[0];
      if (remoteVideoTrack) remoteVideoTrack.enabled = enabled;
    }
  });

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video); // Append video element to videoGrid
}

