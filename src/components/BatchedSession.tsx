import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  BatchedSessionRouterModule,
  SessionKeyManagerModule,
} from "@biconomy-devx/modules";
import { BiconomySmartAccountV2 } from "@biconomy-devx/account";

import { defaultAbiCoder } from "ethers/lib/utils";
import {
  DEFAULT_BATCHED_SESSION_ROUTER_MODULE,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
} from "@biconomy-devx/modules";
import ERC20Transfer from "./ERC30Transfer";
const showErrorMessage = (a: any) => {
  return null;
};
const showInfoMessage = (a: any) => {
  return null;
};
const getActionForErrorMessage = (a: any) => null;
const CreateBatchRouter: React.FC<{
  smartAccount: BiconomySmartAccountV2;
  provider: ethers.providers.Provider;
  scwAddress: string;
}> = ({ smartAccount, scwAddress, provider }) => {
  const [loading, setLoading] = useState(false);
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] =
    useState(false);
  const [isBRMenabled, setIsBRMenabled] = useState(false);

  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      if (!scwAddress || !smartAccount) {
        setIsSessionKeyModuleEnabled(false);
        return;
      }
      try {
        let biconomySmartAccount = smartAccount;
        const isEnabled1 = await biconomySmartAccount.isModuleEnabled(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );
        setIsSessionKeyModuleEnabled(isEnabled1);
        const isEnabled2 = await biconomySmartAccount.isModuleEnabled(
          DEFAULT_BATCHED_SESSION_ROUTER_MODULE
        );
        setIsBRMenabled(isEnabled2);
        console.log(
          "isSessionKeyModuleEnabled, setIsBRMenabled",
          isEnabled1,
          isEnabled2
        );
        return;
      } catch (err: any) {
        console.error(err);
        setLoading(false);
        showErrorMessage("Error in getting session key module status");
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    };
    checkSessionModuleEnabled();
  }, [isSessionKeyModuleEnabled, scwAddress, smartAccount]);

  const createSession = async (enableModule: boolean) => {
    if (!scwAddress || !smartAccount) {
      showErrorMessage("Please connect wallet first");
      return;
    }
    try {
      let biconomySmartAccount = smartAccount;
      const managerModuleAddr = DEFAULT_SESSION_KEY_MANAGER_MODULE;
      const routerModuleAddr = DEFAULT_BATCHED_SESSION_ROUTER_MODULE;
      const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA";
      const mockSessionModuleAddr =
        "0x7Ba4a7338D7A90dfA465cF975Cc6691812C3772E";

      // -----> setMerkle tree tx flow
      // create dapp side session key
      const sessionSigner = ethers.Wallet.createRandom();
      const sessionKeyEOA = await sessionSigner.getAddress();
      console.log("sessionKeyEOA", sessionKeyEOA);
      // BREWARE JUST FOR DEMO: update local storage with session key
      window.localStorage.setItem(
        "sessionPKey-batched",
        sessionSigner.privateKey
      );
      console.log("sessionPKey-batched", sessionSigner.privateKey);

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

      // cretae session key data
      const sessionKeyData = defaultAbiCoder.encode(
        ["address", "address", "address", "uint256"],
        [
          sessionKeyEOA,
          "0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
          "0x42138576848E839827585A3539305774D36B9602", // receiver address
          ethers.utils.parseUnits("50".toString(), 6).toHexString(), // 50 usdc amount
        ]
      );
      /*const sessionKeyData2 = defaultAbiCoder.encode(
        ["address", "address", "address", "uint256"],
        [
          sessionKeyEOA,
          "0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
          "0x5a86A87b3ea8080Ff0B99820159755a4422050e6", // receiver address 2
          ethers.utils.parseUnits("100".toString(), 6).toHexString(),
        ]
      );*/

      const sessionKeyData2 = defaultAbiCoder.encode(
        ["address"],
        [sessionKeyEOA]
      );

      const sessionTxData = await sessionRouterModule.createSessionData([
        {
          validUntil: 0,
          validAfter: 0,
          sessionValidationModule: erc20ModuleAddr,
          sessionPublicKey: sessionKeyEOA,
          sessionKeyData: sessionKeyData,
        },
        {
          validUntil: 0,
          validAfter: 0,
          sessionValidationModule: mockSessionModuleAddr,
          sessionPublicKey: sessionKeyEOA,
          sessionKeyData: sessionKeyData2,
        },
      ]);
      console.log("sessionTxData", sessionTxData);

      // tx to set session key
      const tx3 = {
        to: managerModuleAddr, // session manager module address
        data: sessionTxData.data,
      };

      let transactionArray = [];
      if (!isSessionKeyModuleEnabled) {
        // -----> enableModule session manager module
        const tx1 = await biconomySmartAccount.getEnableModuleData(
          managerModuleAddr
        );
        transactionArray.push(tx1);
      }
      if (!isBRMenabled) {
        // -----> enableModule batched session router module
        const tx2 = await biconomySmartAccount.getEnableModuleData(
          routerModuleAddr
        );
        transactionArray.push(tx2);
      }
      transactionArray.push(tx3);
      let partialUserOp = await biconomySmartAccount.buildUserOp(
        transactionArray
      );

      const userOpResponse = await biconomySmartAccount.sendUserOp(
        partialUserOp
      );
      console.log(`userOp Hash: ${userOpResponse.userOpHash}`);
      const transactionDetails = await userOpResponse.wait();
      console.log("txHash", transactionDetails.receipt.transactionHash);
      showInfoMessage("Session Created Successfully");

      // update the session key //enableModule
      /*await sessionRouterModule.updateSessionStatus(
        {
          sessionPublicKey: sessionKeyEOA,
          sessionValidationModule: erc20ModuleAddr,
        },
        "ACTIVE"
      );*/
    } catch (err: any) {
      console.error(err);
      setLoading(false);
      const errorAction = getActionForErrorMessage(err.message);
      showErrorMessage(
        errorAction || err.message || "Error in sending the transaction"
      );
    }
  };

  return (
    <main>
      <h3>Create Session Flow</h3>
      <ERC20Transfer
        smartAccount={smartAccount}
        provider={provider}
        address={scwAddress}
      />
      {isSessionKeyModuleEnabled && isBRMenabled ? (
        <div>
          <p style={{ marginBottom: 20 }}>
            Session Key Manager Module is already enabled ✅. Click on the
            button to create a new session.
          </p>

          <button onClick={() => createSession(false)}>Create Session</button>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: 20 }}>
            This is single transaction to enable the sesion manager module and
            set merkle root.
          </p>

          <button onClick={() => createSession(true)}>
            Enable And Create Session
          </button>
        </div>
      )}
    </main>
  );
};

export default CreateBatchRouter;
