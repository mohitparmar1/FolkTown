export function isPhantomInstalled() {
  return (
    typeof window !== "undefined" && window.solana && window.solana.isPhantom
  );
}

export function getCurrentWalletAddress() {
  if (!isPhantomInstalled()) return null;
  return window.solana.publicKey ? window.solana.publicKey.toString() : null;
}

export function isWalletConnected() {
  return getCurrentWalletAddress() !== null;
}

export async function connectWallet() {
  if (!isPhantomInstalled()) throw new Error("Phantom is not installed");

  try {
    const resp = await window.solana.connect();

    return resp.publicKey ? resp.publicKey.toString() : null;
  } catch (err) {
    console.error("Phantom connect error", err);
    throw err;
  }
}

export async function disconnectWallet() {
  if (!isPhantomInstalled()) return;
  try {
    await window.solana.disconnect();
  } catch (err) {
    console.warn("Phantom disconnect error", err);
  }
}

// Small helper to register on connect event
export function onWalletChange(cb) {
  if (!isPhantomInstalled()) return () => {};
  const handler = (publicKey) => cb(publicKey ? publicKey.toString() : null);
  window.solana.on("connect", handler);
  window.solana.on("disconnect", () => cb(null));
  return () => {
    try {
      window.solana.removeListener("connect", handler);
    } catch (e) {}
  };
}
