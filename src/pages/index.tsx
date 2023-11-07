import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { useConnect, useAccount, useDisconnect, useWalletClient } from 'wagmi'
import { WalletClientSigner } from "@alchemy/aa-core";
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE } from "@biconomy/modules";
import { ChainId } from "@biconomy/core-types"
import { IPaymaster, BiconomyPaymaster } from '@biconomy/paymaster'
import { IBundler, Bundler } from '@biconomy/bundler'
import { useState } from 'react';

export default function Home() {
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const [ smartAccountAddress, setSmartAccountAddress ] = useState()
  
  const bundler: IBundler = new Bundler({
    bundlerUrl: "",    
    chainId: ChainId.BASE_GOERLI_TESTNET,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  })


  
  const paymaster: IPaymaster = new BiconomyPaymaster({
    paymasterUrl: ""
  })

  const createSmartAccount = async () => {
    if(!walletClient) return
    const signer = new WalletClientSigner(walletClient,"json-rpc" )
    const ownerShipModule = await ECDSAOwnershipValidationModule.create({
      signer: signer,
      moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
    })

    let biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId: ChainId.BASE_GOERLI_TESTNET,
      bundler: bundler,
      paymaster: paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: ownerShipModule,
      activeValidationModule: ownerShipModule
    })
    console.log({ biconomySmartAccount })
    const saAddress = await biconomySmartAccount.getAccountAddress();
    setSmartAccountAddress(saAddress)
  }

  return (
    <>
      <Head>
        <title>Biconomy x WAGMI</title>
        <meta name="description" content="WAGMI Hooks With Biconomy" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1>Biconomy x WAGMI Example</h1>
        { address && <h2>EOA: {address}</h2>}
        {smartAccountAddress && <h2>Smart Account: {smartAccountAddress}</h2>}
        {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {isLoading &&
            connector.id === pendingConnector?.id &&
            ' (connecting)'}
        </button>
      ))}
 
      {error && <div>{error.message}</div>}
      {isConnected && <button onClick={disconnect}>Disconnect</button>}
      {isConnected && <button onClick={createSmartAccount}>Create Smart Account</button>}
      </main>
    </>
  )
}
