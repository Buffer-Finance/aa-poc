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
import { erc20ABI } from "wagmi";
import ERC20Transfer from "./ERC30Transfer";
console.log(erc20ABI);
const Session: React.FC<{
  smartAccount: BiconomySmartAccountV2;
  address: string;
  provider: any;
}> = ({ smartAccount, address, provider }) => {
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState<
    boolean | null
  >(null);
  // smartAccount.getAccountAddress();

  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      if (!address || !smartAccount) {
        setIsSessionKeyModuleEnabled(false);
        return;
      }
      try {
        // ATTENTION, isModuleEnabled  - a very important function is not available on smartAccount
        console.log(
          "isSessionKeyModuleEnabled",
          await smartAccount.getAccountAddress()
        );
        const isEnabled = await smartAccount?.isModuleEnabled(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );

        setIsSessionKeyModuleEnabled(isEnabled);
        return;
      } catch (err: any) {
        console.log("error whilegettingdefault ", err);
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    };
    checkSessionModuleEnabled();
  }, [isSessionKeyModuleEnabled, address, smartAccount]);
  const createSession = async (enableSessionKeyModule: boolean) => {
    if (!address || !smartAccount) {
      alert("Please connect wallet first");
    }
    try {
      const erc20ModuleAddr = "0x7Ba4a7338D7A90dfA465cF975Cc6691812C3772E";
      // -----> setMerkle tree tx flow
      // create dapp side session key
      const sessionSigner = ethers.Wallet.createRandom();
      const sessionKeyEOA = await sessionSigner.getAddress();
      console.log("sessionKeyEOA", sessionKeyEOA);
      // BREWARE JUST FOR DEMO: update local storage with session key
      window.localStorage.setItem("sessionPKey", sessionSigner.privateKey);
      const routerModuleAddr = DEFAULT_BATCHED_SESSION_ROUTER_MODULE;

      // generate sessionModule
      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
        smartAccountAddress: address,
      });
      const sessionRouterModule = await BatchedSessionRouterModule.create({
        moduleAddress: routerModuleAddr,
        sessionKeyManagerModule: sessionModule,
        smartAccountAddress: address,
      });

      // cretae session key data
      const sessionKeyData = defaultAbiCoder.encode(
        ["address", "address", "address", "uint256"],
        [
          sessionKeyEOA,
          "0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
          "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6", // receiver address
          ethers.utils.parseUnits("5".toString(), 6).toHexString(), // 50 usdc amount
        ]
      );
      console.log(`1Session-sessionKeyData: `, sessionKeyData);

      const sessionTxData = await sessionModule.createSessionData([
        {
          validUntil: 0,
          validAfter: 0,
          sessionValidationModule: erc20ModuleAddr,
          sessionPublicKey: sessionKeyEOA,
          sessionKeyData: sessionKeyData,
        },
      ]);
      console.log("2sessionTxData", sessionTxData);

      // write a programe using wagmi hooks to send some erc20 tokens
      // tx to set session key
      const setSessiontrx = {
        to: DEFAULT_SESSION_KEY_MANAGER_MODULE, // session manager module address
        data: sessionTxData.data,
      };

      const transactionArray = [];

      if (enableSessionKeyModule) {
        // -----> enableModule session manager module
        const enableModuleTrx = await smartAccount.getEnableModuleData(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );
        transactionArray.push(enableModuleTrx);
      }

      transactionArray.push(setSessiontrx);
      console.log(`3Session-transactionArray: `, transactionArray);

      let partialUserOp = await smartAccount.buildUserOp(transactionArray);
      console.log(`4Session-partialUserOp: `, partialUserOp);

      const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
      console.log(`5userOp Hash: ${userOpResponse.userOpHash}`);
      const transactionDetails = await userOpResponse.wait();
      console.log("6txHash", transactionDetails.receipt.transactionHash);
      setIsSessionActive(true);
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
        address={address}
      />
      {isSessionKeyModuleEnabled && <div></div>}
    </div>
  );
};

export default Session;
