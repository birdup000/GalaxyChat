const http = require('http');
const express = require('express')
const app = express();
const path = require('path')
const {v4: uuidV4} = require('uuid')
const bodyParser = require('body-parser'); // middleware
app.use(bodyParser.urlencoded({ extended: false }));




///Change here to change what port is server hosted on
var port = 8000;



const socketio = require('socket.io')
const formatMessage = require('./views/js/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./views/js/users');
const { join } = require('path');

const server = http.createServer(app);

const io = socketio(server);


app.use(express.json())


app.set('view engine', 'ejs');


app.set("views", path.join(__dirname, "views"))

app.set('views', './views'); // specify the views directory
-// Static Files
app.use(express.static('views'))
app.use('/css', express.static(__dirname + 'views/css/css'))
app.use('/js', express.static(__dirname + 'views/js/js'))
app.use('/img', express.static(__dirname + 'views/img/img'))
app.get('/', (req, res) => {
  res.render("home")  
})

app.get('/home', (req, res) => {
  res.render("home")  
})

app.get('/news', (req, res) => {
  res.render("news")  
})

app.get('/video', (req, res) => {
  res.render("videochat")  
})

app.get('/videochathub', (req, res) => {
  res.render("videochathub")  
})

/// set it to here this chat file when you it logs in
app.get('/chat', (req, res) =>{
 res.render("whenloggedin")
})

app.get('/chatlogged', (req, res) =>{
  res.render("chatlogged")
})


//Broken For Now due to uuid generation for video calling
////app.use(function (req,res,next){
////	res.status(404).render("404");
///});

const botName = 'Chat Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to the Chat!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});


//video chatting merge


// If they join the link, generate a random UUID and send them to a new room with said UUID
app.get('/videochat', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

// If they join a specific room, then render that room
app.get('/:room', (req, res) => {
  res.render('room', {roomId: req.params.room});
});

// When someone connects to the server
io.on('connection', socket => {
  // When someone attempts to join the room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);  // Join the room

    // Broadcast to everyone else in the room that a new user has joined
    socket.broadcast.to(roomId).emit('user-connected', userId);

    // When the socket disconnects, broadcast to the room that the user has disconnected
    socket.on('disconnect', () => {
      socket.broadcast.to(roomId).emit('user-disconnected', userId);
    });

  });
});


///Also change here as well for showing what port server is running on
const PORT = process.env.PORT || 8000

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

