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
import abi from "./abi.json";
import { ethers } from "ethers";
import { useContractRead } from "wagmi";
import { encodeFunctionData, getContract } from "viem";

interface Props {
  smartAccount: BiconomySmartAccountV2;
  provider: any;
}

const TotalCountDisplay: React.FC<{ count: number }> = ({ count }) => {
  return <div>Total count is {count}</div>;
};

const Counter: React.FC<Props> = ({ smartAccount, provider }) => {
  console.log(`Counter-smartAccount: `, smartAccount);
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

      const tx1 = {
        to: counterAddress,
        data: data,
      };
      console.log(`1[deb-txn]Counter-const: `, tx1);

      // counter should increase four times
      let partialUserOp = await smartAccount.buildUserOp([tx1, tx1, tx1, tx1]);

      const biconomyPaymaster =
        smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

      let paymasterServiceData: SponsorUserOperationDto = {
        mode: PaymasterMode.SPONSORED,
        // optional params...
      };
      console.log(`3[deb-txn]paymasterServiceData: `, paymasterServiceData);

      try {
        const paymasterAndDataResponse =
          await biconomyPaymaster.getPaymasterAndData(
            partialUserOp,
            paymasterServiceData
          );
        console.log(
          `4[deb-txn]paymasterAndDataResponse: `,
          paymasterAndDataResponse
        );

        partialUserOp.paymasterAndData =
          paymasterAndDataResponse.paymasterAndData;

        const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
        console.log(`5[deb-txn]userOpResponse: `, userOpResponse);
        const transactionDetails = await userOpResponse.wait();
        console.log("Transaction Details:", transactionDetails);
        console.log("Transaction Hash:", userOpResponse.userOpHash);

        getCount(true);
      } catch (e) {
        console.error("Error executing transaction:", e);
        // ... handle the error if needed ...
      }
    } catch (error) {
      console.error("Error executing transaction:", error);
    }
  };

  return (
    <>
      {/* marking batched txn. */}
      {/* <TotalCountDisplay count={data} /> */}
      <div>Total count: {data?.toString()}</div>
      <br></br>
      <button onClick={() => incrementCount()}>
        Increment Count by 4 time (batched)
      </button>
    </>
  );
};

export default Counter;
