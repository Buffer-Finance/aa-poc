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
const TransferWOSessionSponsored: React.FC<{
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

  const { data: receiverBalance } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6",
    watch: true,
  });
  const erc20Transfer = async () => {
    if (!scwAddress || !smartAccount || !address || !smartAccount.paymaster) {
      return;
    }
    try {
      setFullLoading("send");

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

      // generate tx data to erc20 transfer
      const tx1 = {
        to: "0xdA5289fCAAF71d52a80A254da614a192b693e977", //erc20 token address
        data: data,
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

      let biconomySmartAccount = smartAccount;
      let userOp = await biconomySmartAccount.buildUserOp([tx1], {
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
        },
      });
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
      const userOpResponse = await biconomySmartAccount.sendUserOp(userOp);

      console.log("send-txnuserOpHash", userOpResponse);
      const { receipt } = await userOpResponse.wait(1);
      console.log(`send-txn reciept: `, receipt);
      setFullLoading("off");
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div>
      <div>
        Sign from Main EOA & send funds from Smart Wallet (Sponsored Gas in
        MATIC)
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
        onClick={erc20Transfer}
      >
        Transfer 0.1 USDC
      </button>
    </div>
  );
};

export default TransferWOSessionSponsored;
