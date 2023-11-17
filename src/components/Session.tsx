import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  SessionKeyManagerModule,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
  BatchedSessionRouterModule,
  DEFAULT_BATCHED_SESSION_ROUTER_MODULE,
} from "@biconomy/modules";
import {
  BiconomySmartAccount,
  BiconomySmartAccountV2,
} from "@biconomy/account";
import { defaultAbiCoder } from "ethers/lib/utils";
import { erc20ABI, useAccount } from "wagmi";
import ERC20Transfer from "./ERC30Transfer";
console.log(erc20ABI);
const Session: React.FC<{
  smartAccount: BiconomySmartAccountV2;
  scwAddress: string;
  provider: any;
}> = ({ smartAccount, scwAddress, provider }) => {
  const { address } = useAccount();
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState<
    boolean | null
  >(null);
  // smartAccount.getAccountAddress();

  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isBRMenabled, setIsBRMenabled] = useState(false);

  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      if (!scwAddress || !smartAccount || !address) {
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
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    };
    checkSessionModuleEnabled();
  }, [isSessionKeyModuleEnabled, scwAddress, smartAccount, address]);
  const createSession = async (enableModule: boolean) => {
    if (!scwAddress || !smartAccount || !address) {
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
      window.localStorage.setItem("sessionPKey", sessionSigner.privateKey);

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
          "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6", // receiver address
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
          sessionKeyData: sessionKeyData,
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
        transactionArray,
        {
          skipBundlerGasEstimation: false,
        }
      );

      const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
      console.log("userOpHash", userOpResponse);
      const { transactionHash } = await userOpResponse.waitForTxHash();
      console.log("txHash", transactionHash);

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
    }
  };
  return (
    <div>
      <div>
        This is the session demonstration, txn should happpen automatically
      </div>
      {isSessionKeyModuleEnabled === null ? (
        "Fetching States"
      ) : isSessionKeyModuleEnabled === false ? (
        <div>
          Not enabled
          <button onClick={() => createSession(true)}>
            Enable and Create Session
          </button>
        </div>
      ) : (
        <div>
          Enabled
          <button onClick={() => createSession(false)}>Create Session</button>
        </div>
      )}
      <ERC20Transfer
        smartAccount={smartAccount}
        provider={provider}
        scwAddress={scwAddress}
      />
      {isSessionKeyModuleEnabled && <div></div>}
    </div>
  );
};

export default Session;
