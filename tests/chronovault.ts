import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chronovault } from "../target/types/chronovault";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import BN from "bn.js";

describe("ChronoVault Protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Chronovault as Program<Chronovault>;

  let mint: PublicKey;
  let treasury: Keypair;
  let treasuryTokenAccount: PublicKey;
  let user: Keypair;
  let userTokenAccount: PublicKey;
  let recipient: Keypair;
  let recipientTokenAccount: PublicKey;
  let keeper: Keypair;
  let keeperTokenAccount: PublicKey;

  const PROTOCOL_FEE_BPS = 50;
  const KEEPER_FEE_BPS = 30;
  const INITIAL_MINT_AMOUNT = 1000 * 1e6;

  const deriveConfigPda = (): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config")],
      program.programId
    );
  };

  const derivePaymentPda = (owner: PublicKey, paymentId: BN): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment"),
        owner.toBuffer(),
        paymentId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  };

  const deriveEscrowPda = (paymentPda: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), paymentPda.toBuffer()],
      program.programId
    );
  };

  const deriveKeeperStatsPda = (keeper: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("keeper_stats"), keeper.toBuffer()],
      program.programId
    );
  };

  before(async () => {
    treasury = Keypair.generate();
    user = Keypair.generate();
    recipient = Keypair.generate();
    keeper = Keypair.generate();

    const airdropTx1 = await provider.connection.requestAirdrop(
      user.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx1);

    const airdropTx2 = await provider.connection.requestAirdrop(
      keeper.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx2);

    mint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    treasuryTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      treasury.publicKey
    );

    userTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    recipientTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      recipient.publicKey
    );

    keeperTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      keeper.publicKey
    );

    await mintTo(
      provider.connection,
      user,
      mint,
      userTokenAccount,
      user.publicKey,
      INITIAL_MINT_AMOUNT
    );
  });

  describe("initialize", () => {
    it("initializes the protocol successfully", async () => {
      const [configPda] = deriveConfigPda();

      await program.methods
        .initialize(PROTOCOL_FEE_BPS, KEEPER_FEE_BPS)
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.protocolConfig.fetch(configPda);

      expect(config.authority.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(config.treasury.toString()).to.equal(treasury.publicKey.toString());
      expect(config.protocolFeeBps).to.equal(PROTOCOL_FEE_BPS);
      expect(config.keeperFeeBps).to.equal(KEEPER_FEE_BPS);
      expect(config.paused).to.equal(false);
      expect(config.totalPaymentsCreated.toNumber()).to.equal(0);
      expect(config.totalPaymentsExecuted.toNumber()).to.equal(0);
    });

    it("fails to initialize twice", async () => {
      const [configPda] = deriveConfigPda();

      try {
        await program.methods
          .initialize(PROTOCOL_FEE_BPS, KEEPER_FEE_BPS)
          .accounts({
            config: configPda,
            authority: provider.wallet.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have failed");
      } catch (error: any) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("register_keeper", () => {
    it("registers a new keeper", async () => {
      const [configPda] = deriveConfigPda();
      const [keeperStatsPda] = deriveKeeperStatsPda(keeper.publicKey);

      await program.methods
        .registerKeeper()
        .accounts({
          config: configPda,
          keeperStats: keeperStatsPda,
          keeper: keeper.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([keeper])
        .rpc();

      const keeperStats = await program.account.keeperStats.fetch(keeperStatsPda);

      expect(keeperStats.keeper.toString()).to.equal(keeper.publicKey.toString());
      expect(keeperStats.executionsCount.toNumber()).to.equal(0);
      expect(keeperStats.totalFeesEarned.toNumber()).to.equal(0);
    });
  });

  describe("create_scheduled_payment", () => {
    const paymentId = new BN(1);
    const paymentAmount = new BN(100 * 1e6);

    it("creates a scheduled payment successfully", async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot + 10);

      const userBalanceBefore = (await getAccount(provider.connection, userTokenAccount)).amount;

      await program.methods
        .createScheduledPayment(paymentId, paymentAmount, executeAtSlot)
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          owner: user.publicKey,
          recipient: recipient.publicKey,
          mint: mint,
          ownerTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      const payment = await program.account.scheduledPayment.fetch(paymentPda);

      expect(payment.id.toNumber()).to.equal(paymentId.toNumber());
      expect(payment.owner.toString()).to.equal(user.publicKey.toString());
      expect(payment.recipient.toString()).to.equal(recipient.publicKey.toString());
      expect(payment.amount.toNumber()).to.equal(paymentAmount.toNumber());
      expect(payment.executeAtSlot.toNumber()).to.equal(executeAtSlot.toNumber());
      expect(payment.executed).to.equal(false);
      expect(payment.cancelled).to.equal(false);

      const escrowAccount = await getAccount(provider.connection, escrowPda);
      expect(Number(escrowAccount.amount)).to.equal(paymentAmount.toNumber());

      const userBalanceAfter = (await getAccount(provider.connection, userTokenAccount)).amount;
      expect(Number(userBalanceBefore) - Number(userBalanceAfter)).to.equal(paymentAmount.toNumber());
    });

    it("fails with zero amount", async () => {
      const invalidPaymentId = new BN(999);
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, invalidPaymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot + 10);

      try {
        await program.methods
          .createScheduledPayment(invalidPaymentId, new BN(0), executeAtSlot)
          .accounts({
            config: configPda,
            payment: paymentPda,
            escrow: escrowPda,
            owner: user.publicKey,
            recipient: recipient.publicKey,
            mint: mint,
            ownerTokenAccount: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have failed with InvalidAmount");
      } catch (error: any) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("fails with past execution slot", async () => {
      const invalidPaymentId = new BN(998);
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, invalidPaymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot - 10);

      try {
        await program.methods
          .createScheduledPayment(invalidPaymentId, new BN(1000), executeAtSlot)
          .accounts({
            config: configPda,
            payment: paymentPda,
            escrow: escrowPda,
            owner: user.publicKey,
            recipient: recipient.publicKey,
            mint: mint,
            ownerTokenAccount: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have failed with InvalidExecutionSlot");
      } catch (error: any) {
        expect(error.message).to.include("InvalidExecutionSlot");
      }
    });
  });

  describe("execute_payment", () => {
    const paymentId = new BN(2);
    const paymentAmount = new BN(50 * 1e6);

    before(async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot + 2);

      await program.methods
        .createScheduledPayment(paymentId, paymentAmount, executeAtSlot)
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          owner: user.publicKey,
          recipient: recipient.publicKey,
          mint: mint,
          ownerTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it("executes payment after target slot", async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);
      const [keeperStatsPda] = deriveKeeperStatsPda(keeper.publicKey);

      const recipientBalanceBefore = (await getAccount(provider.connection, recipientTokenAccount)).amount;
      const keeperBalanceBefore = (await getAccount(provider.connection, keeperTokenAccount)).amount;
      const treasuryBalanceBefore = (await getAccount(provider.connection, treasuryTokenAccount)).amount;

      await program.methods
        .executePayment()
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          keeper: keeper.publicKey,
          keeperStats: keeperStatsPda,
          recipientTokenAccount: recipientTokenAccount,
          keeperTokenAccount: keeperTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keeper])
        .rpc();

      const payment = await program.account.scheduledPayment.fetch(paymentPda);
      expect(payment.executed).to.equal(true);
      expect(payment.executor.toString()).to.equal(keeper.publicKey.toString());

      const recipientBalanceAfter = (await getAccount(provider.connection, recipientTokenAccount)).amount;
      const keeperBalanceAfter = (await getAccount(provider.connection, keeperTokenAccount)).amount;
      const treasuryBalanceAfter = (await getAccount(provider.connection, treasuryTokenAccount)).amount;

      expect(Number(recipientBalanceAfter)).to.be.greaterThan(Number(recipientBalanceBefore));
      expect(Number(keeperBalanceAfter)).to.be.greaterThan(Number(keeperBalanceBefore));
      expect(Number(treasuryBalanceAfter)).to.be.greaterThan(Number(treasuryBalanceBefore));

      const keeperStats = await program.account.keeperStats.fetch(keeperStatsPda);
      expect(keeperStats.executionsCount.toNumber()).to.equal(1);
    });

    it("fails to execute already executed payment", async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);
      const [keeperStatsPda] = deriveKeeperStatsPda(keeper.publicKey);

      try {
        await program.methods
          .executePayment()
          .accounts({
            config: configPda,
            payment: paymentPda,
            escrow: escrowPda,
            keeper: keeper.publicKey,
            keeperStats: keeperStatsPda,
            recipientTokenAccount: recipientTokenAccount,
            keeperTokenAccount: keeperTokenAccount,
            treasuryTokenAccount: treasuryTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([keeper])
          .rpc();
        expect.fail("Should have failed with AlreadyExecuted");
      } catch (error: any) {
        expect(error.message).to.include("AlreadyExecuted");
      }
    });
  });

  describe("cancel_payment", () => {
    const paymentId = new BN(3);
    const paymentAmount = new BN(30 * 1e6);

    before(async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot + 1000);

      await program.methods
        .createScheduledPayment(paymentId, paymentAmount, executeAtSlot)
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          owner: user.publicKey,
          recipient: recipient.publicKey,
          mint: mint,
          ownerTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
    });

    it("cancels payment and refunds owner (minus penalty)", async () => {
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, paymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const userBalanceBefore = (await getAccount(provider.connection, userTokenAccount)).amount;
      const treasuryBalanceBefore = (await getAccount(provider.connection, treasuryTokenAccount)).amount;

      await program.methods
        .cancelPayment()
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          owner: user.publicKey,
          ownerTokenAccount: userTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const payment = await program.account.scheduledPayment.fetch(paymentPda);
      expect(payment.cancelled).to.equal(true);

      const userBalanceAfter = (await getAccount(provider.connection, userTokenAccount)).amount;
      const treasuryBalanceAfter = (await getAccount(provider.connection, treasuryTokenAccount)).amount;

      const expectedPenalty = paymentAmount.toNumber() * 10 / 10000;
      const expectedRefund = paymentAmount.toNumber() - expectedPenalty;

      expect(Number(userBalanceAfter) - Number(userBalanceBefore)).to.be.closeTo(expectedRefund, 1);
      expect(Number(treasuryBalanceAfter) - Number(treasuryBalanceBefore)).to.be.closeTo(expectedPenalty, 1);
    });

    it("fails when non-owner tries to cancel", async () => {
      const anotherPaymentId = new BN(4);
      const [configPda] = deriveConfigPda();
      const [paymentPda] = derivePaymentPda(user.publicKey, anotherPaymentId);
      const [escrowPda] = deriveEscrowPda(paymentPda);

      const currentSlot = await provider.connection.getSlot();
      const executeAtSlot = new BN(currentSlot + 1000);

      await program.methods
        .createScheduledPayment(anotherPaymentId, paymentAmount, executeAtSlot)
        .accounts({
          config: configPda,
          payment: paymentPda,
          escrow: escrowPda,
          owner: user.publicKey,
          recipient: recipient.publicKey,
          mint: mint,
          ownerTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      try {
        await program.methods
          .cancelPayment()
          .accounts({
            config: configPda,
            payment: paymentPda,
            escrow: escrowPda,
            owner: keeper.publicKey,
            ownerTokenAccount: keeperTokenAccount,
            treasuryTokenAccount: treasuryTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([keeper])
          .rpc();
        expect.fail("Should have failed with Unauthorized");
      } catch (error: any) {
        expect(error.message).to.include("Unauthorized");
      }
    });
  });

  describe("update_config", () => {
    it("updates protocol configuration", async () => {
      const [configPda] = deriveConfigPda();

      const newProtocolFeeBps = 60;
      const newKeeperFeeBps = 40;

      await program.methods
        .updateConfig(newProtocolFeeBps, newKeeperFeeBps, false)
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const config = await program.account.protocolConfig.fetch(configPda);

      expect(config.protocolFeeBps).to.equal(newProtocolFeeBps);
      expect(config.keeperFeeBps).to.equal(newKeeperFeeBps);
      expect(config.paused).to.equal(false);
    });

    it("fails when non-authority tries to update", async () => {
      const [configPda] = deriveConfigPda();

      try {
        await program.methods
          .updateConfig(100, 50, true)
          .accounts({
            config: configPda,
            authority: keeper.publicKey,
          })
          .signers([keeper])
          .rpc();
        expect.fail("Should have failed with constraint");
      } catch (error: any) {
        expect(error.message).to.include("constraint");
      }
    });
  });
});
