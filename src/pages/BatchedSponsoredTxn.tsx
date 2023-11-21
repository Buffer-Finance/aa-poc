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
import { erc20ABI, useAccount, useBalance } from "wagmi";
import {
  IHybridPaymaster,
  PaymasterMode,
  SponsorUserOperationDto,
} from "@biconomy/paymaster";
console.log(erc20ABI);
const sleep = async (sec: number) =>
  setTimeout(() => {
    Promise.resolve();
  }, sec);
const SponsoredBatchedTxn: React.FC<{
  smartAccount: BiconomySmartAccountV2;
  scwAddress: string;
  provider: any;
}> = ({ smartAccount, scwAddress, provider }) => {
  const { address } = useAccount();
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState<
    boolean | null
  >(null);
  const [fullLoading, setFullLoading] = useState<"off" | "prereq" | "send">(
    "off"
  );
  const { data: swBalance, isError } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: scwAddress,
    watch: true,
  });
  const [pk, setPk] = useState(
    typeof window !== "undefined" &&
      window.localStorage.getItem("sessionPKey" + scwAddress)
  );

  const { data: receiverBalance } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6",
    watch: true,
  });
  const [isBRMenabled, setIsBRMenabled] = useState(false);
  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      console.log("deb-1");
      if (!scwAddress || !smartAccount || !address) {
        setIsSessionKeyModuleEnabled(false);
        return;
      }
      try {
        console.log("deb-2");

        let biconomySmartAccount = smartAccount;
        const isEnabled1 = await biconomySmartAccount.isModuleEnabled(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );
        console.log("deb-3");

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
        console.log("erroor while fetrfhing");
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    };
    checkSessionModuleEnabled();
  }, [isSessionKeyModuleEnabled, scwAddress, smartAccount, address]);
  const erc20Transfer = async () => {
    if (!scwAddress || !smartAccount || !address) {
      return;
    }
    try {
      setFullLoading("send");
      let biconomySmartAccount = smartAccount;
      const managerModuleAddr = DEFAULT_SESSION_KEY_MANAGER_MODULE;
      const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA";
      const routerModuleAddr = DEFAULT_BATCHED_SESSION_ROUTER_MODULE;
      const mockSessionModuleAddr =
        "0x7Ba4a7338D7A90dfA465cF975Cc6691812C3772E";

      // get session key from local storage
      const sessionKeyPrivKey = localStorage.getItem(
        "sessionPKey" + scwAddress
      );

      console.log("sessionKeyPrivKey", sessionKeyPrivKey);
      if (!sessionKeyPrivKey) {
        return;
      }
      const sessionSigner = new ethers.Wallet(sessionKeyPrivKey);
      console.log("master-deb-3 session signer created");

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
      console.log("master-deb-4 session module createe");

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
        console.error(error);
      }
      const amountGwei = ethers.utils.parseUnits("0.1".toString(), decimals);
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
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
        },
      });
      console.log("master-deb-5 userop built");
      const biconomyPaymaster =
        smartAccount?.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
      let paymasterServiceData: SponsorUserOperationDto = {
        mode: PaymasterMode.SPONSORED,
        smartAccountInfo: {
          name: "BICONOMY",
          version: "2.0.0",
        },
      };
      const paymasterAndDataResponse =
        await biconomyPaymaster.getPaymasterAndData(
          //@ts-ignore
          userOp,
          paymasterServiceData
        );
      userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

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

      console.log("master-deb-6 ", userOpResponse);
      const { receipt } = await userOpResponse.wait(1);
      console.log(`master-deb-7 `, receipt);
      setFullLoading("off");
    } catch (err: any) {
      console.log("error in initating", err);
      //   console.error(err);
    }
  };
  const createSession = async () => {
    if (!scwAddress || !smartAccount || !address) {
      return;
    }
    try {
      setFullLoading("prereq");
      let biconomySmartAccount = smartAccount;
      const managerModuleAddr = DEFAULT_SESSION_KEY_MANAGER_MODULE;
      const routerModuleAddr = DEFAULT_BATCHED_SESSION_ROUTER_MODULE;
      const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA";
      const mockSessionModuleAddr =
        "0x7Ba4a7338D7A90dfA465cF975Cc6691812C3772E";

      const sessionSigner = ethers.Wallet.createRandom();
      const sessionKeyEOA = await sessionSigner.getAddress();
      console.log("sessionKeyEOA", sessionSigner.privateKey);
      window.localStorage.setItem(
        "sessionPKey" + scwAddress,
        sessionSigner.privateKey
      );
      console.log(
        "sessionKeyfromlc",
        window.localStorage.getItem("sessionPKey" + scwAddress)
      );

      setPk(sessionSigner.privateKey);

      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: managerModuleAddr,
        smartAccountAddress: scwAddress,
      });

      const sessionRouterModule = await BatchedSessionRouterModule.create({
        moduleAddress: routerModuleAddr,
        sessionKeyManagerModule: sessionModule,
        smartAccountAddress: scwAddress,
      });

      const sessionKeyData = defaultAbiCoder.encode(
        ["address", "address", "address", "uint256"],
        [
          sessionKeyEOA,
          "0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
          "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6", // receiver address
          ethers.utils.parseUnits("50".toString(), 6).toHexString(), // 50 usdc amount
        ]
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
          // skipBundlerGasEstimation: false,
          paymasterServiceData: {
            mode: PaymasterMode.SPONSORED,
          },
        }
      );
      const biconomyPaymaster =
        smartAccount?.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
      let paymasterServiceData: SponsorUserOperationDto = {
        mode: PaymasterMode.SPONSORED,
        smartAccountInfo: {
          name: "BICONOMY",
          version: "2.0.0",
        },
      };
      const paymasterAndDataResponse =
        await biconomyPaymaster.getPaymasterAndData(
          //@ts-ignore
          partialUserOp,
          paymasterServiceData
        );
      partialUserOp.paymasterAndData =
        paymasterAndDataResponse.paymasterAndData;

      const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
      console.time("wait");
      await sleep(5000);
      console.log("master-deb-1 userresp session creation", userOpResponse);
      const { receipt } = await userOpResponse.wait(1);
      console.log(`master-deb-2 session done `, receipt);
      console.timeEnd("wait");
      setFullLoading("off");
      erc20Transfer();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div>
      <div>
        This is sponsored batched sessions demonstration.
        <div>Sender Balance : {swBalance?.formatted}</div>
        <div>Reciver Balance : {receiverBalance?.formatted}</div>
      </div>

      <button
        title={
          fullLoading == "off"
            ? "  Click to transfer"
            : fullLoading == "prereq"
            ? "Please wait till MM confirmation comes"
            : "Transaction is in process"
        }
        onClick={() => {
          if (isBRMenabled && isSessionKeyModuleEnabled && pk) {
            console.log("[deb]justtransfer");

            erc20Transfer();
          } else {
            console.log("[deb]fulltxn");
            createSession();
          }
        }}
      >
        Transfer 0.1 + 0.1 USDC (sponsored sessions)
      </button>
    </div>
  );
};

export default SponsoredBatchedTxn;
