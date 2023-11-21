const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const app = express()

const route = require('./route')
const { addUser, findUser, getRoomUsers, removeUser } = require('./users')

app.use(cors({ origin: '*' }))
app.use(route)

const server = http.createServer(app)

const socketIO = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

socketIO.on('connection', (socket) => {
  console.log(`${socket.id} user connected`)

  socket.on('join', ({ name, room }) => {
    socket.join(room)
    const { user, isExist } = addUser({ name, room })
    const userMessage = isExist ? `${user.name}, here you go again` : `Hey, ${user.name}`

    socket.emit('message', {
      user: { name: 'Admin' },
      message: userMessage,
    })

    socket.broadcast.to(user.room).emit('message', {
      user: { name: 'Admin' },
      message: `${user.name} has join`,
    })

    socketIO.to(user.room).emit('room', { users: getRoomUsers(user.room) })
  })

  socket.on('sendMessage', ({ message, params }) => {
    console.log('sendMessage', message)
    const user = findUser(params)

    if (user) {
      socketIO.to(user.room).emit('message', { user, message })
    }
  })

  socket.on('left', ({ params }) => {
    const user = removeUser(params)

    if (user) {
      const { room, name } = user
      socketIO.to(room).emit('message', { user: { name: 'Admin' }, message: `${name}, has left` })
      socketIO.to(room).emit('room', { users: getRoomUsers(room) })
    }
  })

  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnect`)
  })
})

server.listen(8080, () => {
  console.log('Server is running')
})
