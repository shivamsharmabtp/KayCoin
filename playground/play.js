const {
  Blockchain,
  Transaction,
  CandidatePool,
} = require("./../src/blockchain");
const { privateKey } = require("./../src/util/keygenerator");
const log = require("./../src/util/log");
const handleError = require("./../src/util/handleError");

const myWalletAddress = privateKey.getPublic("hex");
const KayCoin = new Blockchain();
const localCandidatePool = new CandidatePool();

const testRun = () => {
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
    KayCoin.redactChain(localCandidatePool);
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
  KayCoin.redactChain(localCandidatePool);

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
    KayCoin.redactChain(localCandidatePool);
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

module.exports = {
  testRun,
};
