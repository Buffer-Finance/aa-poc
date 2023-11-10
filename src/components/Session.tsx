import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  SessionKeyManagerModule,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
} from "@biconomy/modules";
import { BiconomySmartAccount } from "@biconomy/account";
import { defaultAbiCoder } from "ethers/lib/utils";
const Session: React.FC<{
  smartAccount: BiconomySmartAccount;
  address: string;
}> = ({ smartAccount, address }) => {
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] =
    useState<boolean>(false);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      if (!address || !smartAccount) {
        setIsSessionKeyModuleEnabled(false);
        return;
      }
      try {
        // ATTENTION, isModuleEnabled  - a very important function is not available on smartAccount
        const isEnabled = await smartAccount.isModuleEnabled(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );
        console.log("isSessionKeyModuleEnabled", isEnabled);
        setIsSessionKeyModuleEnabled(isEnabled);
        return;
      } catch (err: any) {
        console.error(err);
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    };
    checkSessionModuleEnabled();
  }, [isSessionKeyModuleEnabled, address, smartAccount]);

  return (
    <div>
      <div>
        This is the session demonstration, txn should happpen automatically
      </div>
    </div>
  );
};

export default Session;
