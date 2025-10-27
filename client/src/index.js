import Phaser from "phaser";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import {
  isPhantomInstalled,
  connectWallet,
  disconnectWallet,
  onWalletChange,
} from "./wallet";

// Get full screen dimensions
const getGameSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight - 48, // Subtract top UI height
  };
};

const Config = {
  type: Phaser.AUTO,
  width: getGameSize().width,
  height: getGameSize().height,
  parent: "game-container",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: [Scene1, Scene2],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export default new Phaser.Game(Config);

// Wire minimal DOM wallet UI (index.html provides the elements)
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("connect-wallet");
    const addr = document.getElementById("wallet-address");

    function updateUi(address) {
      if (!btn || !addr) return;
      if (address) {
        btn.textContent = "Disconnect";
        addr.textContent = address;
      } else {
        btn.textContent = isPhantomInstalled()
          ? "Connect Phantom"
          : "Install Phantom";
        addr.textContent = isPhantomInstalled()
          ? "Not connected"
          : "Phantom not found";
      }
    }

    if (!btn || !addr) return;

    // initial state
    updateUi(null);

    btn.addEventListener("click", async () => {
      if (!isPhantomInstalled()) {
        window.open("https://phantom.app/", "_blank");
        return;
      }

      if (btn.textContent === "Disconnect") {
        await disconnectWallet();
        updateUi(null);
        return;
      }

      try {
        const address = await connectWallet();
        updateUi(address);
      } catch (err) {
        console.error("Wallet connect failed", err);
      }
    });
    onWalletChange((address) => updateUi(address));
  });
}
