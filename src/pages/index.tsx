import { MultiChainValidationModule } from "@biconomy/modules";
import { ChainId } from "@biconomy/core-types";
import { IPaymaster, BiconomyPaymaster } from "@biconomy/paymaster";
import { IBundler, Bundler } from "@biconomy/bundler";
import { generatePrivateKey } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

import { providers } from "ethers";

import {
  BiconomySmartAccount,
  BiconomySmartAccountConfig,
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
const bundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${ChainId.POLYGON_MUMBAI}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
});

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl:
    "https://paymaster.biconomy.io/api/v1/80001/pKLSky7Jb.9370f1ef-de34-4a90-afcf-65c962f34ada",
});
export function walletClientToSigner(walletClient) {
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
export default function App() {
  async function generateRandomAccount() {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    // const signer = new WalletClientSigner(walletClient, "json-rpc");
    const multiChainModule = await MultiChainValidationModule.create({
      signer: walletClientToSigner(walletClient),
      moduleAddress: "0x000000824dc138db84FD9109fc154bdad332Aa8E",
    });
    let biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId: ChainId.POLYGON_MUMBAI,
      bundler: bundler,
      paymaster: paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: multiChainModule,
      activeValidationModule: multiChainModule,
    });

    const scw = await biconomySmartAccount.getAccountAddress();

    return [pk, account.address, scw];
  }
  const runTest = async () => {
    console.time("scwtest");
    const totalAddresses = 1;
    for await (const num of Array.from(Array(totalAddresses).keys()).map(
      async (d) => {
        return generateRandomAccount();
      }
    )) {
      console.log(`pk ${num[0]}(${num[1]}) has sw = ${num[2]} `);
    }
    console.timeEnd("scwtest");
  };
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <button onClick={runTest}>Create 1 SW</button>
      <h2>Start editing to see some magic happen!</h2>
    </div>
  );
}
