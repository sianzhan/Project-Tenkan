const net = require('net');

if (process.argv.length !== 6) {
  console.log('usage: %s <serverhost> <serverport> <desthost> <destport>', process.argv[1]);
  process.exit();
}

const SERVER_HOST = process.argv[2];
const SERVER_PORT = process.argv[3];
const DEST_HOST = process.argv[4];
const DEST_PORT = process.argv[5];

const PASSPHRASE = 'ABC1234';

let socketUpward;


const bufferList = [];
let buffer = '';
let bufferLock = false;

function dataHandler(dataString) {
  const dest = net.createConnection(DEST_PORT, DEST_HOST);
  const json = JSON.parse(dataString);

  dest.on('connect', () => {
    dest.write(Buffer.from(json.data));
  });

  dest.on('data', (data) => {
    socketUpward.write(`${JSON.stringify({ id: json.id, data })}\n\n`);
  });
  dest.on('error', (error) => {
    console.error(error);
  });
}

function processBuffer() {
  if (bufferLock) return;
  bufferLock = true;
  while (bufferList.length > 0) {
    buffer += bufferList.shift();
  }

  while (true) {
    const index = buffer.indexOf('}\n\n');
    if (index === -1) {
      break;
    } else {
      dataHandler(buffer.slice(0, index + 1));
      buffer = buffer.substring(index + 3);
    }
  }

  bufferLock = false;
}

function connect() {
  // Downward means to the client, Upward means to the server
  socketUpward = net.createConnection(SERVER_PORT, SERVER_HOST);
  socketUpward.setNoDelay(true);

  socketUpward.on('error', (error) => {
    console.error(error);
    console.log('...Attempting to reconnect after 3s');
    setTimeout(connect, 3000);
    socketUpward.destroy();
  });

  socketUpward.on('connect', () => {
    socketUpward.write(PASSPHRASE);
    console.log(`initialized connection with server on ${socketUpward.remoteAddress}:${socketUpward.remotePort}`);
  });

  socketUpward.on('data', (recv) => {
    bufferList.push(recv.toString());
    processBuffer();
  });
}

connect();
