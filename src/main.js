const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { Blockchain, Transaction } = require("./blockchain");
const { privateKey } = require("./util/keygenerator");
const { initializeNetworkLayer } = require("./network");
const log = require("./util/log");
const handleError = require("./util/handleError");

const HTTP_PORT = process.env.HTTP_PORT || 3001;
const myWalletAddress = privateKey.getPublic("hex");
const KayCoin = new Blockchain();

app.get("/getBlockchain", (req, res) => {
  try {
    res.json(KayCoin.getChain());
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.post("/minePendingTransactions", (req, res) => {
  try {
    KayCoin.minePendingTransactions(myWalletAddress);
    res.send("OK");
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.post("/addTransaction", (req, res) => {
  try {
    const { sendersAddress, amount } = req.body;
    const transaction = new Transaction(
      myWalletAddress,
      sendersAddress,
      amount
    );
    transaction.signTransaction(privateKey);
    KayCoin.addTransaction(transaction);
    res.send("OK");
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.get("/getBalance", (req, res) => {
  try {
    res.send(KayCoin.getBalanceOfAddress(myWalletAddress));
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.get("/isChainValid", (req, res) => {
  try {
    res.send(KayCoin.isChainValid());
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

const dryRun = () => {
  // Mine first block
  KayCoin.minePendingTransactions(myWalletAddress);

  // Create a transaction & sign it with your key
  const tx1 = new Transaction(
    myWalletAddress,
    "address2",
    80,
    "Some harmful content 👻 👻 👻"
  );
  tx1.signTransaction(privateKey);
  KayCoin.addTransaction(tx1);

  // Mine block
  KayCoin.minePendingTransactions(myWalletAddress);

  // Create second transaction
  const tx2 = new Transaction(myWalletAddress, "address1", 50);
  tx2.signTransaction(privateKey);
  KayCoin.addTransaction(tx2);

  // Mine block
  KayCoin.minePendingTransactions(myWalletAddress);

  log(`Balance of xavier is ${KayCoin.getBalanceOfAddress(myWalletAddress)}`);
};

app.listen(HTTP_PORT, () => {
  log(`Node started on ${HTTP_PORT}`);
  initializeNetworkLayer();
  dryRun();
});
