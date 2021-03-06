const crypto = require("crypto");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const debug = require("debug")("kaycoin:blockchain");
const log = require("./util/log");
const { getHashOfData } = require("./util/keygenerator");

const RedactionPolicy = {
  rho: 0.51,
  votingPeriodInBlocks: 5,
};
const DIFFICULTY = 2;

class CandidatePool {
  constructor() {
    this.redactionCandidates = [];
  }

  getRedactionCandidates() {
    return this.redactionCandidates;
  }

  proposeRedact(redactionBlock, index, harmfulContent, revisedContent) {
    const redactionBlockTransactions = [];
    redactionBlock.transactions.forEach((transaction) => {
      redactionBlockTransactions.push(
        new Transaction(
          transaction.fromAddress,
          transaction.toAddress,
          transaction.amount,
          transaction.outScript,
          transaction.timestamp,
          transaction.signature
        )
      );
    });
    const candidateBlock = new Block(
      redactionBlock.timestamp,
      redactionBlockTransactions,
      redactionBlock.previousHash,
      redactionBlock.hash,
      redactionBlock.oldHash,
      redactionBlock.nonce
    );
    candidateBlock.transactions[0].outScript = revisedContent;
    candidateBlock.currentIndex = index;

    candidateBlock.mineBlock(DIFFICULTY);
    const redactionCandidate = {
      candidateBlock,
      index,
      harmfulContent,
      revisedContent,
    };
    this.redactionCandidates.push(redactionCandidate);
  }

  getLatestCandidate() {
    if (this.redactionCandidates && this.redactionCandidates.length)
      return this.redactionCandidates[this.redactionCandidates.length - 1];
    else return null;
  }

  removeBlock(block) {
    let index = 0;
    for (; index < this.redactionCandidates.length; index++) {
      if (this.redactionCandidates[index].hash == block.hash) break;
    }
    this.redactionCandidates.splice(index - 1, 1);
  }
}

class Transaction {
  /**
   * @param {string} fromAddress
   * @param {string} toAddress
   * @param {number} amount
   * @param {string} outScript // here harmful content will go
   */
  constructor(fromAddress, toAddress, amount, outScript, timestamp, signature) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = timestamp || Date.now();
    this.outScript = outScript;
    this.signature = this.signature;
  }

  /**
   * Creates a SHA256 hash of the transaction
   *
   * @returns {string}
   */
  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.fromAddress +
          this.toAddress +
          this.amount +
          this.timestamp +
          this.outScript
      )
      .digest("hex");
  }

  /**
   * Signs a transaction with the given signingKey (which is an Elliptic keypair
   * object that contains a private key). The signature is then stored inside the
   * transaction object and later stored on the blockchain.
   *
   * @param {string} signingKey
   */
  signTransaction(signingKey) {
    // You can only send a transaction from the wallet that is linked to your
    // key. So here we check if the fromAddress matches your publicKey
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }

    // Calculate the hash of this transaction, sign it with the key
    // and store it inside the transaction obect
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");

    this.signature = sig.toDER("hex");
  }

  /**
   * Checks if the signature is valid (transaction has not been tampered with).
   * It uses the fromAddress as the public key.
   *
   * @returns {boolean}
   */
  isValid() {
    // If the transaction doesn't have a from address we assume it's a
    // mining reward and that it's valid. You could verify this in a
    // different way (special field for instance)
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction");
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  /**
   * @param {number} timestamp
   * @param {Transaction[]} transactions
   * @param {string} previousHash
   */
  constructor(
    timestamp,
    transactions,
    previousHash = "",
    hash,
    oldHash,
    nonce
  ) {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = nonce || 0;
    this.hash = hash || this.calculateHash();
    this.oldHash = oldHash || this.calculateHash(); // Old merkel root
  }

  getHash() {
    return this.hash;
  }

  /**
   * Returns the SHA256 of this block (by processing all the data stored
   * inside this block)
   *
   * @returns {string}
   */
  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest("hex");
  }

  /**
   * Starts the mining process on the block. It changes the 'nonce' until the hash
   * of the block starts with enough zeros (= difficulty)
   *
   * @param {number} difficulty
   */
  mineBlock(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
      this.oldHash = this.calculateHash();
    }

    debug(`Block mined: ${this.hash}`);
  }

  /**
   * Validates all the transactions inside this block (signature + hash) and
   * returns true if everything checks out. False if the block is invalid.
   *
   * @returns {boolean}
   */
  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = DIFFICULTY;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.persistence = 5;
  }

  /**
   * @returns {Block}
   */
  createGenesisBlock() {
    return new Block(Date.parse("2022-01-01"), [], "0");
  }

  /**
   * Returns the latest block on our chain. Useful when you want to create a
   * new Block and you need the hash of the previous Block.
   *
   * @returns {Block[]}
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Returns the complete chain
   *
   * @returns [Block[]]
   */
  getChain() {
    return this.chain;
  }

  /**
   * Takes all the pending transactions, puts them in a Block and starts the
   * mining process. It also adds a transaction to send the mining reward to
   * the given address.
   *
   * @param {string} miningRewardAddress
   */
  minePendingTransactions(miningRewardAddress, candidatePool) {
    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward
    );
    this.pendingTransactions.push(rewardTx);

    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);

    /**
     * NODES VOTING FOR REDACTION CANDIDATE
     */
    const redactionCandidate = candidatePool.getLatestCandidate();
    const redactionLooksGoodToMe = parseInt(Math.random() * 100) % 2;
    if (redactionCandidate && redactionLooksGoodToMe) {
      block.requestHash = redactionCandidate.candidateBlock.getHash();
    }
    /**
     * .........................................
     */
    this.chain.push(block);
    this.pendingTransactions = [];
  }

  /**
   * Add a new transaction to the list of pending transactions (to be added
   * next time the mining process starts). This verifies that the given
   * transaction is properly signed.
   *
   * @param {Transaction} transaction
   */
  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error("Transaction must include from and to address");
    }

    // Verify the transactiion
    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    if (transaction.amount <= 0) {
      throw new Error("Transaction amount should be higher than 0");
    }

    // Making sure that the amount sent is not greater than existing balance
    const walletBalance = this.getBalanceOfAddress(transaction.fromAddress);
    if (walletBalance < transaction.amount) {
      throw new Error("Not enough balance");
    }

    // Get all other pending transactions for the "from" wallet
    const pendingTxForWallet = this.pendingTransactions.filter(
      (tx) => tx.fromAddress === transaction.fromAddress
    );

    // If the wallet has more pending transactions, calculate the total amount
    // of spend coins so far. If this exceeds the balance, we refuse to add this
    // transaction.
    if (pendingTxForWallet.length > 0) {
      const totalPendingAmount = pendingTxForWallet
        .map((tx) => tx.amount)
        .reduce((prev, curr) => prev + curr);

      const totalAmount = totalPendingAmount + transaction.amount;
      if (totalAmount > walletBalance) {
        throw new Error(
          "Pending transactions for this wallet is higher than its balance."
        );
      }
    }

    this.pendingTransactions.push(transaction);
    debug("transaction added: %s", transaction);
  }

  /**
   * Returns the balance of a given wallet address.
   *
   * @param {string} address
   * @returns {number} The balance of the wallet
   */
  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    debug("getBalanceOfAdrees: %s", balance);
    return balance;
  }

  /**
   * Returns a list of all transactions that happened
   * to and from the given wallet address.
   *
   * @param  {string} address
   * @return {Transaction[]}
   */
  getAllTransactionsForWallet(address) {
    const txs = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push(tx);
        }
      }
    }

    debug("get transactions for wallet count: %s", txs.length);
    return txs;
  }

  /**
   * Loops over all the blocks in the chain and verify if they are properly
   * linked together and nobody has tampered with the hashes. By checking
   * the blocks it also verifies the (signed) transactions inside of them.
   *
   * @returns {boolean}
   */
  isChainValid() {
    // Check if the Genesis block hasn't been tampered with by comparing
    // the output of createGenesisBlock with the first block on our chain
    const realGenesis = JSON.stringify(this.createGenesisBlock());

    if (realGenesis !== JSON.stringify(this.chain[0])) {
      return false;
    }

    // Check the remaining blocks on the chain to see if there hashes and
    // signatures are correct
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (previousBlock.hash !== currentBlock.previousHash) {
        return false;
      }

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
    }

    return true;
  }

  validateProofOfWork(block) {
    block.calculateHash();
    return DIFFICULTY <= (block.hash.match(/^0+/) || [""])[0].length;
  }

  redactChain(candidatePool) {
    /**
     * FOR EACH BLOCK IN CANDIDATE POOL
     * VALIDATE BLOCK BY CHECKING LINK WITH PREVIOUS AND NEXT BLOCK
     * CHECK PROOF OF WORK
     * CALCULATE VOTING RESULT AND COMPARE IT TO RHO
     * ADD TO CHAIN IF ACCEPTABLE BY POLICY
     * REMOVE FROM POOL
     */
    candidatePool.redactionCandidates.forEach((redactionCandidate) => {
      const { index, candidateBlock, harmfulContent } = redactionCandidate;
      const hashOfHarmfulContent = getHashOfData(harmfulContent);
      for (let block of this.getChain()) {
        if (block.deltaHash == hashOfHarmfulContent) {
          log("Cache of vote found. Redaction proposal accepted. ");
          this.chain[candidateBlock.currentIndex] = {
            ...candidateBlock,
            deltaHash: getHashOfData(harmfulContent),
          };
          candidatePool.removeBlock(candidateBlock);
          return;
        }
      }

      const nextBlockInChain = this.getChain()[index + 1];
      const prevBlockInChain = this.getChain()[index - 1];
      if (
        nextBlockInChain.previousHash == candidateBlock.oldHash &&
        candidateBlock.previousHash == prevBlockInChain.hash
      ) {
        if (this.validateProofOfWork(candidateBlock)) {
          if (
            RedactionPolicy.votingPeriodInBlocks +
              this.persistence +
              candidateBlock.currentIndex <
            this.getChain().length
          ) {
            let inFavour = 0;
            for (
              let i = candidateBlock.currentIndex;
              i < this.getChain().length - this.persistence;
              i++
            ) {
              if (this.getChain()[i].requestHash) inFavour++;
            }
            if (
              inFavour /
                (this.getChain().length -
                  this.persistence -
                  candidateBlock.currentIndex) >
              RedactionPolicy.rho
            ) {
              // REDACTION IS ACCEPTED
              log(`Redaction proposal accepted`);
              this.chain[candidateBlock.currentIndex] = {
                ...candidateBlock,
                deltaHash: getHashOfData(harmfulContent),
              };
              candidatePool.removeBlock(candidateBlock);
            } else {
              // REDACTION IS REJECTED
              log(`Redaction proposal rejected`);
              candidatePool.removeBlock(candidateBlock);
            }
          }
        }
      }
    });
  }
}

module.exports = {
  Block,
  Blockchain,
  Transaction,
  RedactionPolicy,
  CandidatePool,
};
