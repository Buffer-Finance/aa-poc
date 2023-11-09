import Head from "next/head";
import styles from "@/styles/Home.module.css";
import { useConnect, useAccount, useDisconnect, useWalletClient } from "wagmi";
import { WalletClientSigner } from "@alchemy/aa-core";
import { ethers } from "ethers";

import {
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

  const createSmartAccount = async () => {
    if (!walletClient) return;
    const { account, chain, transport } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new ethers.providers.Web3Provider(transport, network);
    const signer = provider.getSigner(account.address);

    // const provider = new ethers.providers.Web3Provider(walletClient);
    // const signer = provider.getSigner();
    const ownerShipModule = await ECDSAOwnershipValidationModule.create({
      signer,
      moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
    });

    let biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId: ChainId.POLYGON_MUMBAI,
      bundler: bundler,
      paymaster: paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: ownerShipModule,
      activeValidationModule: ownerShipModule,
    });
    setBiconomyAccount(biconomySmartAccount);
    console.log({ biconomySmartAccount });
    const saAddress = await biconomySmartAccount.getAccountAddress();
    setSmartAccountAddress(saAddress);
  };

  return (
    <>
      <main className={""}>
        <div>Counter Contract POA</div>
        {address && <h2>EOA: {address}</h2>}
        {smartAccountAddress && <h2>Smart Account: {smartAccountAddress}</h2>}
        {biconomyAccount && (
          <Counter smartAccount={biconomyAccount} provider={""} />
        )}
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
          <button onClick={createSmartAccount}>Create Smart Account</button>
        )}
      </main>
    </>
  );
}
