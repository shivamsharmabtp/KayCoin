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
  const harmfulContent = "👻 👻 👻 SOME_HARMFUL_CONTENT 👻 👻 👻";
  const localCandidatePool = new CandidatePool();

  /**
   * MINING GENESIS BLOCK
   */
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  /**
   * MINING TRANSACTION 01 BLOCK
   */
  const tx1 = new Transaction(
    myWalletAddress,
    "address1",
    80,
    "Transaction One."
  );
  tx1.signTransaction(privateKey);
  KayCoin.addTransaction(tx1);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  /**
   * MINING TRANSACTION 02 BLOCK
   */
  const tx2 = new Transaction(
    myWalletAddress,
    "address2",
    50,
    "Transaction two" + harmfulContent
  );
  tx2.signTransaction(privateKey);
  KayCoin.addTransaction(tx2);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  /**
   * FOUND SOME HARMFUL CONTENT ON CHAIN
   * REQUESTING REDACTION BY CREATING CANDIDATE BLOCK
   * AND PROPOSING IT FOR CANDIDATE POOL
   */
  const candidateBlock = KayCoin.getChain()[2];
  candidateBlock.transactions[0].outScript = "Transaction One";
  localCandidatePool.proposeRedact(candidateBlock, 2, harmfulContent);

  /**
   * MINING TRANSACTION 03 BLOCK
   */
  const tx3 = new Transaction(
    myWalletAddress,
    "address3",
    45,
    "Transaction three"
  );
  tx3.signTransaction(privateKey);
  KayCoin.addTransaction(tx3);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  log(
    `Balance of USER is : $${KayCoin.getBalanceOfAddress(myWalletAddress)} /-`
  );
};

app.listen(HTTP_PORT, () => {
  log(`Node started on ${HTTP_PORT}`);
  initializeNetworkLayer();
  dryRun();
});
