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
const localCandidatePool = new CandidatePool();

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
    res.send(KayCoin.getBalanceOfAddress(myWalletAddress));
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.get("/redactChain", (req, res) => {
  try {
    KayCoin.redactChain(localCandidatePool);
    res.send("OK");
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

app.get("/getCandidatePool", (req, res) => {
  try {
    res.json(localCandidatePool.getRedactionCandidates());
  } catch (error) {
    handleError(req, res, [, , ,]);
  }
});

const dryRun = () => {
  const harmfulContent = "👻 👻 👻 SOME_HARMFUL_CONTENT 👻 👻 👻";

  /**
   * MINING BLOCK
   */
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  /**
   * MINING 10 BLOCKS
   */
  for (let i = 0; i < 10; i++) {
    const transaction = new Transaction(
      myWalletAddress,
      "address " + i,
      80 + 2 * i,
      "Transaction " + i
    );
    transaction.signTransaction(privateKey);
    KayCoin.addTransaction(transaction);
    KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);
    //KayCoin.redactChain(localCandidatePool);
  }

  /**
   * MINING 13th BLOCK WITH HARMFUL CONTENT
   */
  let transaction = new Transaction(
    myWalletAddress,
    "address12",
    35,
    "Transaction Twelve. " + harmfulContent
  );
  transaction.signTransaction(privateKey);
  KayCoin.addTransaction(transaction);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);
  //KayCoin.redactChain(localCandidatePool);

  /**
   * FOUND SOME HARMFUL CONTENT ON CHAIN
   * REQUESTING REDACTION BY CREATING CANDIDATE BLOCK
   * AND PROPOSING IT FOR CANDIDATE POOL
   */
  let redactionBlock = KayCoin.getChain()[12];
  let revisedContent = "Transaction Twelve. Some Revised Content.";
  localCandidatePool.proposeRedact(
    redactionBlock,
    12,
    harmfulContent,
    revisedContent
  );

  /**
   * MINING 10 More BLOCKS
   */
  for (let i = 0; i < 10; i++) {
    const transaction = new Transaction(
      myWalletAddress,
      "address " + i + 100,
      40 + 2 * i,
      "Transaction " + (i + 100)
    );
    transaction.signTransaction(privateKey);
    KayCoin.addTransaction(transaction);
    KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);
    //KayCoin.redactChain(localCandidatePool);
  }

  /**
   * MINING 23rd BLOCK WITH SAME HARMFUL CONTENT
   */
  transaction = new Transaction(
    myWalletAddress,
    "address12",
    28,
    "Transaction Twenty Two. " + harmfulContent
  );
  transaction.signTransaction(privateKey);
  KayCoin.addTransaction(transaction);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);
  KayCoin.redactChain(localCandidatePool);

  /**
   * FOUND SOME HARMFUL CONTENT ON CHAIN
   * REQUESTING REDACTION BY CREATING CANDIDATE BLOCK
   * AND PROPOSING IT FOR CANDIDATE POOL
   */
  redactionBlock = KayCoin.getChain()[23];
  revisedContent = "Transaction Twenty Two. Some Revised Content.";
  localCandidatePool.proposeRedact(
    redactionBlock,
    23,
    harmfulContent,
    revisedContent
  );

  /**
   * MINING 10 More BLOCKS
   */
  for (let i = 0; i < 10; i++) {
    const transaction = new Transaction(
      myWalletAddress,
      "address " + i + 100,
      40 + 2 * i,
      "Transaction " + (i + 100)
    );
    transaction.signTransaction(privateKey);
    KayCoin.addTransaction(transaction);
    KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);
    KayCoin.redactChain(localCandidatePool);
  }

  log(
    `Balance of USER is : $${KayCoin.getBalanceOfAddress(myWalletAddress)} /-`
  );
};

app.listen(HTTP_PORT, () => {
  log(`Node started on ${HTTP_PORT}`);
  initializeNetworkLayer();
  dryRun();
});
