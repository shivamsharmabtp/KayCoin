const WebSocket = require("ws");

const p2pPort = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(",") : [];
const sockets = [];

const connectToPeers = (newPeers) => {
  newPeers.forEach((peer) => {
    const ws = new WebSocket(peer);
    ws.on("open", () => initConnection(ws));
    ws.on("error", (e) => {
      console.log("Error in websocket. " + e);
    });
  });
};

const initConnection = (ws) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
};

const initP2PServer = () => {
  const server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws) => initConnection(ws));
};

const initializeNetworkLayer = () => {
  connectToPeers(initialPeers);
  initP2PServer();
};

const initMessageHandler = (ws) => {
  ws.on("message", (data) => {
    const message = JSON.parse(data);
    console.log(message);
  });
};

const initErrorHandler = (ws) => {
  var closeConnection = (ws) => {
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

const write = (ws, message) => ws.send(JSON.stringify(message));

module.exports = {
  connectToPeers,
  initConnection,
  initP2PServer,
  initializeNetworkLayer,
};
