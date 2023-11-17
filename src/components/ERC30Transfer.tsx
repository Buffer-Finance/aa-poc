import React from "react";
import { ethers } from "ethers";
import { BiconomySmartAccountV2 } from "@biconomy/account";
import {
  SessionKeyManagerModule,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
  BatchedSessionRouterModule,
  DEFAULT_BATCHED_SESSION_ROUTER_MODULE,
} from "@biconomy/modules";
import { erc20ABI, useAccount } from "wagmi";

interface props {
  smartAccount: BiconomySmartAccountV2;
  provider: ethers.providers.Provider;
  scwAddress: string;
}

const ERC20Transfer: React.FC<props> = ({
  smartAccount,
  provider,
  scwAddress,
}) => {
  const { address } = useAccount();
  const erc20Transfer = async () => {
    if (!scwAddress || !smartAccount || !address) {
      return;
    }
    try {
      let biconomySmartAccount = smartAccount;
      const managerModuleAddr = DEFAULT_SESSION_KEY_MANAGER_MODULE;
      const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA";
      const routerModuleAddr = DEFAULT_BATCHED_SESSION_ROUTER_MODULE;
      const mockSessionModuleAddr =
        "0x7Ba4a7338D7A90dfA465cF975Cc6691812C3772E";

      // get session key from local storage
      const sessionKeyPrivKey = window.localStorage.getItem("sessionPKey");

      console.log("sessionKeyPrivKey", sessionKeyPrivKey);
      if (!sessionKeyPrivKey) {
        return;
      }
      const sessionSigner = new ethers.Wallet(sessionKeyPrivKey);
      console.log("sessionSigner", sessionSigner);

      // generate sessionModule
      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: managerModuleAddr,
        smartAccountAddress: scwAddress,
      });
      const sessionRouterModule = await BatchedSessionRouterModule.create({
        moduleAddress: routerModuleAddr,
        sessionKeyManagerModule: sessionModule,
        smartAccountAddress: scwAddress,
      });

      // set active module to sessionRouterModule
      biconomySmartAccount =
        biconomySmartAccount.setActiveValidationModule(sessionRouterModule);

      // er20 transfer data generation
      const tokenContract = new ethers.Contract(
        "0xdA5289fCAAF71d52a80A254da614a192b693e977",
        erc20ABI,
        provider
      );
      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        throw new Error("invalid token address supplied");
      }
      const amountGwei = ethers.utils.parseUnits("1".toString(), decimals);
      // sender - 0x109b9198ea5e58375e4936DF393F7CBa8F65945E // 21
      const data = (
        await tokenContract.populateTransaction.transfer(
          "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6", // 192
          amountGwei
        )
      ).data;
      const data2 = (
        await tokenContract.populateTransaction.transfer(
          "0x5a86A87b3ea8080Ff0B99820159755a4422050e6", // 17
          amountGwei
        )
      ).data;
      // generate tx data to erc20 transfer
      const tx1 = {
        to: "0xdA5289fCAAF71d52a80A254da614a192b693e977", //erc20 token address
        data: data,
        value: "0",
      };
      const tx2 = {
        to: "0xdA5289fCAAF71d52a80A254da614a192b693e977", //erc20 token address
        data: data2,
        value: "0",
      };
      // after send
      // sender - 21 -> 19
      // r1 - 192 -193
      // r2 - 17 -18

      // after send 2 w single reciever
      // sender - 19 -> 17
      // r1 - 193 -> 195

      // after send 3 w custom reciever 0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6
      // sender - 17 -> 15
      // build user op
      // build user op
      let userOp = await biconomySmartAccount.buildUserOp([tx1, tx1], {
        overrides: {
          // signature: "0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000456b395c4e107e0302553b90d1ef4a32e9000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000db3d753a1da5a6074a9f74f39a0a779d3300000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfe121a6dcf92c49f6c2ebd4f306ba0ba0ab6f1c000000000000000000000000da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000042138576848e839827585a3539305774d36b96020000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041feefc797ef9e9d8a6a41266a85ddf5f85c8f2a3d2654b10b415d348b150dabe82d34002240162ed7f6b7ffbc40162b10e62c3e35175975e43659654697caebfe1c00000000000000000000000000000000000000000000000000000000000000"
          callGasLimit: 400000, // only if undeployed account
          verificationGasLimit: 900000,
        },
        skipBundlerGasEstimation: true,
        params: {
          batchSessionParams: [
            {
              sessionSigner: sessionSigner,
              // sessionID: "67e910ef2c", // only require session id filter when multiple leafs have same SVM
              sessionValidationModule: erc20ModuleAddr,
            },
            {
              sessionSigner: sessionSigner,
              sessionValidationModule: mockSessionModuleAddr,
            },
          ],
        },
      });

      // send user op
      const userOpResponse = await biconomySmartAccount.sendUserOp(userOp, {
        batchSessionParams: [
          {
            sessionSigner: sessionSigner,
            sessionValidationModule: erc20ModuleAddr,
          },
          {
            sessionSigner: sessionSigner,
            sessionValidationModule: mockSessionModuleAddr,
          },
        ],
      });

      console.log("userOpHash", userOpResponse);
      const { transactionHash } = await userOpResponse.waitForTxHash();
      console.log("txHash", transactionHash);
    } catch (err: any) {
      console.error(err);
    }
  };

  return <button onClick={erc20Transfer}>Transfer 1 USDC</button>;
};

export default ERC20Transfer;
