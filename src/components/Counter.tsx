import React, { useState, useEffect } from "react";
import {
  BiconomySmartAccount,
  BiconomySmartAccountV2,
} from "@biconomy/account";
import {
  IHybridPaymaster,
  SponsorUserOperationDto,
  PaymasterMode,
} from "@biconomy/paymaster";
import {
  SessionKeyManagerModule,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
} from "@biconomy/modules";
import abi from "./abi.json";
import { ethers } from "ethers";
import { useContractRead } from "wagmi";
import { encodeFunctionData, getContract } from "viem";
import { defaultAbiCoder } from "ethers/lib/utils";

interface Props {
  smartAccount: BiconomySmartAccountV2;
  provider: any;
  address: any;
}
const erc20ModuleAddr = "0xcf1cB148D1A2f49697d5d98097896aBeeE453dA7";

const TotalCountDisplay: React.FC<{ count: number }> = ({ count }) => {
  return <div>Total count is {count}</div>;
};

const Counter: React.FC<Props> = ({ smartAccount, address, provider }) => {
  const [count, setCount] = useState<number>(0);
  const [counterContract, setCounterContract] = useState<any>(null);

  const counterAddress = "0x702991272Ac078BD26105c671821678544f6fA9b";

  const { data, isError, isLoading } = useContractRead({
    address: counterAddress,
    abi,
    functionName: "count",
    watch: true,
  });
  const getCount = async (isUpdating: boolean) => {};

  const incrementCount = async () => {
    try {
      console.log("processing");

      const data = encodeFunctionData({
        abi,
        functionName: "incrementCount",
      });
      console.log(`Encoded Function: `, data);
      const sessionKeyPrivKey =
        window.localStorage.getItem("sessionPKeycounter");
      console.log("sessionKeyPrivKey", sessionKeyPrivKey);
      if (!sessionKeyPrivKey) {
        alert("Session key not found please create session");
        return;
      }
      const sessionSigner = new ethers.Wallet(sessionKeyPrivKey);
      console.log("sessionSigner", sessionSigner);

      // generate sessionModule
      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
        smartAccountAddress: address,
      });
      smartAccount = smartAccount.setActiveValidationModule(sessionModule);

      const tx1 = {
        to: counterAddress,
        data: data,
      };
      let userOp = await smartAccount?.buildUserOp([tx1], {
        overrides: {
          // signature: "0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000456b395c4e107e0302553b90d1ef4a32e9000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000db3d753a1da5a6074a9f74f39a0a779d3300000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfe121a6dcf92c49f6c2ebd4f306ba0ba0ab6f1c000000000000000000000000da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000042138576848e839827585a3539305774d36b96020000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041feefc797ef9e9d8a6a41266a85ddf5f85c8f2a3d2654b10b415d348b150dabe82d34002240162ed7f6b7ffbc40162b10e62c3e35175975e43659654697caebfe1c00000000000000000000000000000000000000000000000000000000000000"
          // callGasLimit: 2000000, // only if undeployed account
          // verificationGasLimit: 700000
        },
        skipBundlerGasEstimation: false,
        params: {
          sessionSigner: sessionSigner,
          sessionValidationModule: erc20ModuleAddr,
        },
      });
      console.log("UserOp", { userOp });
      // const biconomyPaymaster =
      //   smartAccount?.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
      // let paymasterServiceData: SponsorUserOperationDto = {
      //   mode: PaymasterMode.SPONSORED,
      //   smartAccountInfo: {
      //     name: "BICONOMY",
      //     version: "2.0.0",
      //   },
      // };
      // const paymasterAndDataResponse =
      //   await biconomyPaymaster?.getPaymasterAndData(
      //     //@ts-ignore
      //     userOp,
      //     paymasterServiceData
      //   );

      // //@ts-ignore
      // userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;
      //@ts-ignore
      const userOpResponse = await smartAccount?.sendUserOp(userOp, {
        sessionSigner: sessionSigner,
        sessionValidationModule: erc20ModuleAddr,
      });
      console.log("userOpHash", { userOpResponse });
      //@ts-ignore
      const { receipt } = await userOpResponse.wait(1);
      console.log("txHash", receipt.transactionHash);

      getCount(true);
    } catch (error) {
      console.error("Error executing transaction:", error);
    }
  };

  const createSession = async (enableSessionKeyModule: boolean) => {
    if (!address || !smartAccount) {
      alert("Please connect wallet first");
    }
    try {
      // -----> setMerkle tree tx flow
      // create dapp side session key
      const sessionSigner = ethers.Wallet.createRandom();
      const sessionKeyEOA = await sessionSigner.getAddress();
      console.log("sessionKeyEOA", sessionKeyEOA);
      // BREWARE JUST FOR DEMO: update local storage with session key
      window.localStorage.setItem(
        "sessionPKeycounter",
        sessionSigner.privateKey
      );

      // generate sessionModule
      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
        smartAccountAddress: address,
      });

      // cretae session key data
      const sessionKeyData = defaultAbiCoder.encode(
        ["address", "address"],
        [
          sessionKeyEOA,
          "0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
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
    } catch (err: any) {
      console.error(err);
    }
  };
  return (
    <>
      {/* <TotalCountDisplay count={data} /> */}
      <div>Total count: {data?.toString()}</div>
      <br></br>
      <button onClick={() => createSession(true)}>Sesssion</button>
      <button onClick={() => incrementCount()}>Increment Count</button>
    </>
  );
};

export default Counter;
