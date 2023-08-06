const socket = io(`/`);
const videoGrid = document.getElementById(`video-grid`);
const myPeer = new Peer();
const myVideo = document.createElement(`video`);
myVideo.muted = true;
const peers = {};
let videoElements = [];

navigator.mediaDevices.getUserMedia({
  video: false,
  audio: true
}).then(stream => {
  addStream(myVideo, stream);

  myPeer.on(`call`, call => {
    call.answer(stream);
    const video = document.createElement(`video`);
    call.on(`stream`, userAudioStream => {
      addStream(video, userAudioStream);
    });
    call.on(`close`, () => {
      removeStream(video);
    });
    call.on(`error`, error => {
      console.error(`Error with peer connection: `, error);
    });
  
    peers[call.peer] = call;
  });

  socket.on(`user-connected`, userId => {
    connectToNewUser(userId, stream);
  });
}).catch(error => {
  console.log(`Error accessing media devices.`, error);
});

socket.on(`user-disconnected`, userId => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId]; // Delete the peer connection from the object
    const disconnectedUserVideo = videoElements.find(video => video.dataset.userId === userId);
    if (disconnectedUserVideo) {
      removeStream(disconnectedUserVideo);
    }
  }
});

myPeer.on(`open`, id => {
  socket.emit(`join-room`, ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement(`video`);
  call.on(`stream`, userVideoStream => {
    addStream(video, userVideoStream);
  });

  // Handle the `track` event
  call.peerConnection.ontrack = event => {
    if (event.track.kind === `video`) {
      // Remove the old video element
      removeStream(video);
      // Create a new stream using the received track
      const newStream = new MediaStream([event.track]);
      // Add the new stream to a new video element
      addStream(video, newStream);
    }
  };

  call.on(`close`, () => {
    removeStream(video);
  });
  call.on(`error`, error => {
    console.error(`Error with peer connection: `, error);
  });

  peers[userId] = call;
}


function addStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener(`loadedmetadata`, () => {
    video.play();
  });
  videoGrid.appendChild(video);
  videoElements.push(video);
}

function removeStream(video) {
  const index = videoElements.indexOf(video);
  if (index > -1) {
    videoElements.splice(index, 1);
    video.remove();
  }
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
        addStream(myVideo, stream);
      }
    }).catch(error => {
      console.log(`No audio device detected.`, error);
    });
}

function checkForVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      if (stream.getVideoTracks().length > 0) {
        addStream(myVideo, stream);
      }
    }).catch(error => {
      console.log(`No video device detected.`, error);
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
    if (videoTracks.length === 0) {
      // If no video tracks exist, get video stream and add it
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(videoStream => {
          const videoTrack = videoStream.getVideoTracks()[0];
          myVideo.srcObject.addTrack(videoTrack);
          // Replace the old stream with the new one in the peer connections
          for (let peerId in peers) {
            const sender = peers[peerId].peerConnection.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
            peers[peerId].peerConnection.createOffer()
              .then(offer => peers[peerId].peerConnection.setLocalDescription(offer));
          }
          socket.emit('video-toggle', { enabled: true });
        }).catch(error => {
          console.log('Failed to get video stream.', error);
        });
    } else {
      // If video tracks already exist, enable them
      videoTracks.forEach(track => track.enabled = true);
      socket.emit('video-toggle', { enabled: true });
    }
  }
}

function disableVideo() {
  if (myVideo.srcObject) {
    myVideo.srcObject.getVideoTracks().forEach(track => {
      track.enabled = false; // Disable the track instead of stopping it
      // Remove the track from the stream
      myVideo.srcObject.removeTrack(track);
      // Replace the old stream with the new one in the peer connections
      for (let peerId in peers) {
        const sender = peers[peerId].peerConnection.getSenders().find(s => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(null);
        }
        peers[peerId].peerConnection.createOffer()
          .then(offer => peers[peerId].peerConnection.setLocalDescription(offer));
      }
      socket.emit('video-toggle', { enabled: false });

    });
  }
}

socket.on('video-toggle', ({ userId, enabled }) => {
  if (peers[userId]) {
    const remoteVideoTrack = peers[userId].peerConnection.getRemoteStreams()[0].getVideoTracks()[0];
    if (remoteVideoTrack) {
      remoteVideoTrack.enabled = enabled;
    }
  }
});
