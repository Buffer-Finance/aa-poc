import {
  useConnect,
  useAccount,
  useDisconnect,
  useWalletClient,
  WalletClient,
  useBalance,
} from "wagmi";
import { providers } from "ethers";

import {
  BiconomySmartAccount,
  BiconomySmartAccountConfig,
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
import {
  ECDSAOwnershipValidationModule,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
} from "@biconomy/modules";
import { ChainId } from "@biconomy/core-types";
import { IPaymaster, BiconomyPaymaster } from "@biconomy/paymaster";
import { IBundler, Bundler } from "@biconomy/bundler";
import { useState } from "react";
import Counter from "@/components/Counter";
import Session from "@/components/Session";
import { SendTokens } from "@/components/Send";
export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

export default function Home() {
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const [smartAccountAddress, setSmartAccountAddress] = useState();
  const [biconomyAccount, setBiconomyAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const bundler: IBundler = new Bundler({
    bundlerUrl: `https://bundler.biconomy.io/api/v2/${ChainId.POLYGON_MUMBAI}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
    chainId: ChainId.POLYGON_MUMBAI,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  });

  const paymaster: IPaymaster = new BiconomyPaymaster({
    paymasterUrl:
      "https://paymaster.biconomy.io/api/v1/80001/pKLSky7Jb.9370f1ef-de34-4a90-afcf-65c962f34ada",
  });

  const createv2SmartAccount = async () => {
    if (!walletClient) return;
    // const signer = new WalletClientSigner(walletClient, "json-rpc");
    const ecdsaModule = await ECDSAOwnershipValidationModule.create({
      signer: walletClientToSigner(walletClient),
      moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
    });
    let biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId: ChainId.POLYGON_MUMBAI,
      bundler: bundler,
      paymaster: paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: ecdsaModule,
      activeValidationModule: ecdsaModule,
    });
    console.log(biconomySmartAccount);
    setBiconomyAccount(biconomySmartAccount);
    const smartAddressTemporary =
      await biconomySmartAccount.getAccountAddress();
    setSmartAccountAddress(smartAddressTemporary);
  };
  const { data, isError } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: "0x0CB8D067bb7bA1D44edc95F96A86196C6C7adFA6",
    watch: true,
  });
  const { data: d2 } = useBalance({
    token: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    address: smartAccountAddress,
    watch: true,
  });
  console.log("1ct balance", data);
  const createv1SmartAccount = async () => {
    if (!walletClient) return;
    const biconomySmartAccountConfig: BiconomySmartAccountConfig = {
      signer: walletClientToSigner(walletClient),
      chainId: ChainId.POLYGON_MUMBAI,
      bundler: bundler,
      paymaster: paymaster,
    };
    let biconomySmartAccount = new BiconomySmartAccount(
      biconomySmartAccountConfig
    );
    biconomySmartAccount = await biconomySmartAccount.init();

    setBiconomyAccount(biconomySmartAccount);
    const addres = await biconomySmartAccount.getSmartAccountAddress();
    set;
  };
  const steps = [
    "Connect Metamask",
    "Create Smart Account. Now you can interact gaslessly",
    "Create Session Keys for better no-click UX (Gas needed in Smart account)",
  ];
  return (
    <>
      <main className={""}>
        <div>Counter Contract POC</div>
        {address && <h2>EOA: {address}</h2>}
        {smartAccountAddress && <h2>Smart Account: {smartAccountAddress}</h2>}
        {biconomyAccount && (
          <Counter
            address={smartAccountAddress}
            smartAccount={biconomyAccount}
            provider={""}
          />
        )}
        <div>Reciever Balance:{data?.formatted}</div>
        <div>Sender Balance:{d2?.formatted}</div>
        <ol>
          {steps.map((d) => (
            <li>{d}</li>
          ))}
        </ol>
        {connectors.map((connector) => (
          <button key={connector.id} onClick={() => connect({ connector })}>
            {connector.name}
            {isLoading &&
              connector.id === pendingConnector?.id &&
              " (connecting)"}
          </button>
        ))}
        {error && <div>{error.message}</div>}
        {isConnected && <button onClick={disconnect}>Disconnect</button>}
        {isConnected && (
          <button
            // onClick={createv1SmartAccount}
            onClick={createv2SmartAccount}
          >
            Create Smart Account
          </button>
        )}
        <div>------------------</div>
        {biconomyAccount && (
          <Session
            smartAccount={biconomyAccount}
            address={smartAccountAddress}
            provider={walletClientToSigner(walletClient)}
          />
        )}
        {/* <SendTokens /> */}
      </main>
    </>
  );
}
