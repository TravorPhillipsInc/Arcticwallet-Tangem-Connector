import { expect } from "chai";
import { ethers } from "hardhat";

const requestId = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

describe("ArcticVault", () => {
  it("allows the operator to withdraw within configured limits", async () => {
    const [owner, operator, recipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const vault = await (await ethers.getContractFactory("ArcticVault")).deploy(
      owner.address,
      operator.address,
      100n,
      250n,
    );

    await vault.connect(owner).setTokenAllowed(await token.getAddress(), true);
    await vault.connect(owner).setRecipientAllowed(recipient.address, true);
    await token.mint(await vault.getAddress(), 500n);

    await expect(
      vault
        .connect(operator)
        .withdraw(await token.getAddress(), recipient.address, 80n, requestId("order-1")),
    ).to.changeTokenBalances(token, [vault, recipient], [-80n, 80n]);
  });

  it("rejects replayed request ids and transfers above the per-transaction limit", async () => {
    const [owner, operator, recipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const vault = await (await ethers.getContractFactory("ArcticVault")).deploy(
      owner.address,
      operator.address,
      100n,
      250n,
    );

    await vault.connect(owner).setTokenAllowed(await token.getAddress(), true);
    await vault.connect(owner).setRecipientAllowed(recipient.address, true);
    await token.mint(await vault.getAddress(), 500n);

    await expect(
      vault
        .connect(operator)
        .withdraw(await token.getAddress(), recipient.address, 101n, requestId("too-big")),
    ).to.be.revertedWithCustomError(vault, "PerTransactionLimitExceeded");

    await vault
      .connect(operator)
      .withdraw(await token.getAddress(), recipient.address, 50n, requestId("same"));

    await expect(
      vault
        .connect(operator)
        .withdraw(await token.getAddress(), recipient.address, 50n, requestId("same")),
    ).to.be.revertedWithCustomError(vault, "RequestAlreadyProcessed");
  });

  it("enforces a UTC-day limit and owner pause", async () => {
    const [owner, operator, recipient] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    const vault = await (await ethers.getContractFactory("ArcticVault")).deploy(
      owner.address,
      operator.address,
      200n,
      250n,
    );

    await vault.connect(owner).setTokenAllowed(await token.getAddress(), true);
    await vault.connect(owner).setRecipientAllowed(recipient.address, true);
    await token.mint(await vault.getAddress(), 1000n);
    await vault
      .connect(operator)
      .withdraw(await token.getAddress(), recipient.address, 150n, requestId("a"));

    await expect(
      vault
        .connect(operator)
        .withdraw(await token.getAddress(), recipient.address, 101n, requestId("b")),
    ).to.be.revertedWithCustomError(vault, "DailyLimitExceeded");

    await vault.connect(owner).pause();
    await expect(
      vault
        .connect(operator)
        .withdraw(await token.getAddress(), recipient.address, 1n, requestId("c")),
    ).to.be.revertedWithCustomError(vault, "EnforcedPause");
  });
});
