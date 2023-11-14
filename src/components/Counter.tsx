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
      let userOp = await smartAccount?.buildUserOp([tx1, tx1]);
      console.log("UserOp", { userOp });
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
        await biconomyPaymaster?.getPaymasterAndData(
          //@ts-ignore
          userOp,
          paymasterServiceData
        );

      //@ts-ignore
      userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;
      //@ts-ignore
      const userOpResponse = await smartAccount?.sendUserOp(userOp);
      console.log("userOpHash", { userOpResponse });
      //@ts-ignore
      const { receipt } = await userOpResponse.wait(1);
      console.log("txHash", receipt.transactionHash);

      getCount(true);
    } catch (error) {
      console.error("Error executing transaction:", error);
    }
  };

  return (
    <>
      {/* <TotalCountDisplay count={data} /> */}
      <div>Total count: {data?.toString()}</div>
      <br></br>
      <button onClick={() => incrementCount()}>Increment Count</button>
    </>
  );
};

export default Counter;
