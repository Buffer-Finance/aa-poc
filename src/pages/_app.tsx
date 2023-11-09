import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { polygonMumbai } from "@wagmi/core/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { createPublicClient, http } from "viem";

const { chains, webSocketPublicClient } = configureChains(
  [polygonMumbai],
  [
    alchemyProvider({ apiKey: "uIuh2nC5sbcVeiaKneo31wT4pzczMhL8" }),
    publicProvider(),
  ]
);

const config = createConfig({
  autoConnect: false,
  publicClient: createPublicClient({
    chain: polygonMumbai,
    transport: http(),
  }),
  connectors: [new MetaMaskConnector({ chains })],
  webSocketPublicClient,
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <WagmiConfig config={config}>
        <Component {...pageProps} />
      </WagmiConfig>
    </>
  );
}
