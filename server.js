const net = require('net');

if (process.argv.length !== 4) {
  console.log('usage: %s <serverhost> <serverport>', process.argv[1]);
  process.exit();
}

const SERVER_HOST = process.argv[2];
const SERVER_PORT = process.argv[3];

const PASSPHRASE = 'ABC1234';

// App will route all connections to server to dest
const server = net.createServer();


server.listen(SERVER_PORT, SERVER_HOST);

server.on('listening', () => {
  console.log('opened server on', server.address());
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Address in use, retrying...');
    setTimeout(() => {
      server.close();
      server.listen(SERVER_PORT, SERVER_HOST);
    }, 1000);
  }
});

// Downward means to the client, Upward means to the server
let socketDownward = null;

const socketList = [];

server.on('connection', (socket) => {
  console.log(`${socket.remoteAddress}:${socket.remotePort} Connected.`);

  socket.id = `${socket.remoteAddress}.${socket.remotePort}`;
  socketList[socket.id] = socket;

  socket.on('data', (data) => {
    function dataHandler(dataString) {
      const json = JSON.parse(dataString);
      const userSocket = socketList[json.id];
      if (userSocket) userSocket.write(Buffer.from(json.data));
    }

    if (!socketDownward) {
      if (data.toString() === PASSPHRASE) {
        socketDownward = socket;
        console.log(`${socket.remoteAddress}:${socket.remotePort} is the Forward Node.`);
      } else {
        socket.write('');
      }
    } else if (socket === socketDownward) {
      // Forward responses to user
      let dataset = data;
      while (true) {
        const index = dataset.indexOf('}{');
        if (index === -1) {
          dataHandler(dataset);
          break;
        } else {
          dataHandler(dataset.slice(0, index + 1));
          dataset = dataset.substring(index + 1);
        }
      }

    } else {
      // Forward requests from user to proxy server
      socketDownward.write(JSON.stringify({ id: socket.id, data }));
    }
  });

  socket.on('close', (error) => {
    if (error) console.error(error);
    if (socket === socketDownward) socketDownward = null;
    delete socketList[socket.id];
    console.log(`${socket.remoteAddress}:${socket.remotePort} Closed.`);
  });

  socket.on('error', (error) => {
    console.error(error, 'socket');
  });

});
