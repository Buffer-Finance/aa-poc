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
  PaymasterFeeQuote,
  PaymasterMode,
  SponsorUserOperationDto,
} from "@biconomy/paymaster";
console.log(erc20ABI);
const sleep = async (sec: number) =>
  setTimeout(() => {
    Promise.resolve();
  }, sec);
const TransferWOSessionSponsoredUSDC: React.FC<{
  smartAccount: BiconomySmartAccountV2;
  scwAddress: string;
  provider: any;
}> = ({ smartAccount, scwAddress, provider }) => {
  const { address } = useAccount();
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState<
    boolean | null
  >(null);
  const signer = provider;
  const [fullLoading, setFullLoading] = useState<"off" | "prereq" | "send">(
    "off"
  );
  const { data: swBalance, isError } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: scwAddress,
    watch: true,
  });
  const [pk, setPk] = useState(
    window.localStorage.getItem("sessionPKey" + scwAddress)
  );

  const { data: receiverBalance } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6",
    watch: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

  const [spender, setSpender] = useState("");
  const [feeQuotesArr, setFeeQuotesArr] = useState<PaymasterFeeQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PaymasterFeeQuote>();
  const [estimatedUserOp, setEstimatedUserOp] = useState({});
  useEffect(() => {
    const fetchFeeOption = async () => {
      setIsLoading(true);
      setIsLoadingFee(true);
      setFeeQuotesArr([]);
      if (!smartAccount || !scwAddress || !signer) return;
      const txs = [];

      const usdcContract = new ethers.Contract(
        "0xdA5289fCAAF71d52a80A254da614a192b693e977",
        erc20ABI,
        signer
      );
      const amountGwei = ethers.utils.parseUnits("0.1".toString(), 6);

      const data = (
        await usdcContract.populateTransaction.transfer(
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
      txs.push(tx1);

      console.log("Tx array created", txs);
      let partialUserOp = await smartAccount.buildUserOp([tx1], {
        paymasterServiceData: {
          mode: PaymasterMode.ERC20,
        },
      });
      setEstimatedUserOp(partialUserOp);

      const biconomyPaymaster =
        smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
      const feeQuotesResponse =
        await biconomyPaymaster.getPaymasterFeeQuotesOrData(partialUserOp, {
          // here we are explicitly telling by mode ERC20 that we want to pay in ERC20 tokens and expect fee quotes
          mode: PaymasterMode.ERC20,
          // one can pass tokenList empty array. and it would return fee quotes for all tokens supported by the Biconomy paymaster
          tokenList: [],
          // preferredToken is optional. If you want to pay in a specific token, you can pass its address here and get fee quotes for that token only
          // preferredToken: config.preferredToken,
        });
      setSpender(feeQuotesResponse.tokenPaymasterAddress || "");
      const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
      setFeeQuotesArr(feeQuotes);
      setSelectedQuote(feeQuotes?.[2]);
      setIsLoadingFee(false);
      setIsLoading(false);
    };
    fetchFeeOption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scwAddress]);
  // console.log(
  //   `TransferWOSessionSponsoredUSDC-feeQuotesArr: `,
  //   feeQuotesArr?.[2]
  // );

  const erc20Transfer = async () => {
    console.log(
      `TransferWOSessionSponsoredUSDC-erc20Transfer: `,
      erc20Transfer
    );
    if (
      !scwAddress ||
      !smartAccount ||
      !address ||
      !smartAccount.paymaster ||
      !selectedQuote
    ) {
      return;
    }
    try {
      setFullLoading("send");
      const userOp = await smartAccount.buildTokenPaymasterUserOp(
        estimatedUserOp,
        {
          feeQuote: selectedQuote,
          spender: spender,
          maxApproval: false,
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
      const paymasterAndDataWithLimits =
        await biconomyPaymaster.getPaymasterAndData(userOp, {
          mode: PaymasterMode.ERC20, // - mandatory // now we know chosen fee token and requesting paymaster and data for it
          feeTokenAddress: selectedQuote?.tokenAddress,
          // - optional by default false
          // This flag tells the paymaster service to calculate gas limits for the userOp
          // since at this point callData is updated callGasLimit may change and based on paymaster to be used verification gas limit may change
          calculateGasLimits: true,
        });
      if (
        paymasterAndDataWithLimits?.callGasLimit &&
        paymasterAndDataWithLimits?.verificationGasLimit &&
        paymasterAndDataWithLimits?.preVerificationGas
      ) {
        // Returned gas limits must be replaced in your op as you update paymasterAndData.
        // Because these are the limits paymaster service signed on to generate paymasterAndData
        // If you receive AA34 error check here..

        userOp.callGasLimit = paymasterAndDataWithLimits.callGasLimit;
        userOp.verificationGasLimit =
          paymasterAndDataWithLimits.verificationGasLimit;
        userOp.preVerificationGas =
          paymasterAndDataWithLimits.preVerificationGas;
      }
      userOp.paymasterAndData = paymasterAndDataWithLimits.paymasterAndData;

      // send user op
      const userOpResponse = await smartAccount.sendUserOp(userOp);

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
        Sign from Main EOA & send funds from Smart Wallet (Sponsored Gas in USDC
        Token)
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
        {feeQuotesArr?.[2] ? "Transfer 0.1 USDC" : "Fetching quotes.."}
      </button>
    </div>
  );
};

export default TransferWOSessionSponsoredUSDC;
