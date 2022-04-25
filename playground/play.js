const {
  Blockchain,
  Transaction,
  CandidatePool,
} = require("./../src/blockchain");
const { privateKey } = require("./../src/util/keygenerator");
const log = require("./../src/util/log");

const KayCoin = new Blockchain();
const localCandidatePool = new CandidatePool();
const myWalletAddress = privateKey.getPublic("hex");

const testRun = () => {
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  let transaction = new Transaction(
    myWalletAddress,
    "Megan",
    20,
    "Paying 20$ to megan."
  );
  transaction.signTransaction(privateKey);
  KayCoin.addTransaction(transaction);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  const harmfulContent = "👻 👻 👻 SOME_HARMFUL_CONTENT 👻 👻 👻";

  transaction = new Transaction(
    myWalletAddress,
    "Leo",
    35,
    "Transaction details. " + harmfulContent
  );
  transaction.signTransaction(privateKey);
  KayCoin.addTransaction(transaction);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  let redactionBlock = KayCoin.getChain()[3];
  let revisedContent = "Transaction Twelve. Some Revised Content.";
  localCandidatePool.proposeRedact(
    redactionBlock,
    3,
    harmfulContent,
    revisedContent
  );

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

  // Repeat transaction with similar harmful content
  transaction = new Transaction(
    myWalletAddress,
    "Leo",
    65,
    "Transaction details. " + harmfulContent
  );
  transaction.signTransaction(privateKey);
  KayCoin.addTransaction(transaction);
  KayCoin.minePendingTransactions(myWalletAddress, localCandidatePool);

  redactionBlock = KayCoin.getChain()[13];
  revisedContent = "Transaction Twelve. Some Revised Content.";
  localCandidatePool.proposeRedact(
    redactionBlock,
    13,
    harmfulContent,
    revisedContent
  );

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
    "My current balance is : $ " + KayCoin.getBalanceOfAddress(myWalletAddress)
  );
};

module.exports = {
  testRun,
  KayCoin,
  localCandidatePool,
  myWalletAddress,
};
