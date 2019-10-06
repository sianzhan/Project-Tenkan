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
    function dataHandler(dataString) {
      const dest = net.createConnection(DEST_PORT, DEST_HOST);
      const json = JSON.parse(dataString);
  
      dest.on('connect', () => {
        dest.write(Buffer.from(json.data));
      });
  
      dest.on('data', (data) => {
        socketUpward.write(JSON.stringify({ id: json.id, data }));
      });
      dest.on('error', (error) => {
        console.error(error);
      });
    }

    let dataset = recv.toString();
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
  });
}

connect();
