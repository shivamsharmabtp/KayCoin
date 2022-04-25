const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const {
  Blockchain,
  Transaction,
  CandidatePool,
  Block,
} = require("./blockchain");
const { privateKey } = require("./util/keygenerator");
const { initializeNetworkLayer } = require("./network");
const log = require("./util/log");
const handleError = require("./util/handleError");
const {
  testRun,
  KayCoin,
  localCandidatePool,
  myWalletAddress,
} = require("./../playground/play");

const HTTP_PORT = process.env.HTTP_PORT || 3001;

app.get("/getBlockchain", (req, res) => {
  try {
    let chain = KayCoin.getChain();
    chain = chain.map((block, index) => {
      return {
        ...block,
        index,
      };
    });
    res.json({
      totalLength: chain.length,
      chain,
    });
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
    res.status(200).json({
      balance: KayCoin.getBalanceOfAddress(myWalletAddress),
      myWalletAddress,
    });
  } catch (error) {
    handleError(req, res, ...[, ,], error);
  }
});

app.get("/redactChain", (req, res) => {
  try {
    KayCoin.redactChain(localCandidatePool);
    res.status(200).send("OK");
  } catch (error) {
    handleError(req, res, ...[, ,], error);
  }
});

app.get("/getCandidatePool", (req, res) => {
  try {
    res.json(localCandidatePool.getRedactionCandidates());
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.listen(HTTP_PORT, () => {
  log(`Node started on ${HTTP_PORT}`);
  initializeNetworkLayer();
  testRun();
});
