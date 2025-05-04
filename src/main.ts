import { app, Menu, nativeImage, Tray } from "electron";
import * as path from "path";
import si from "systeminformation";
import { formatMenuTitle } from "./menu-title";
import { buildMenuDetails } from "./menu-details";
import type { Systeminformation } from "systeminformation";

let tray: Tray;
let prevRx = 0,
  prevTx = 0,
  prevTime = 0;
let menu: Menu;

const EXCLUDED_PREFIXES = ["lo", "vir", "vbox", "docker", "br-"];

async function pollNetSpeed() {
  try {
    const netStats = await si.networkStats();
    // Filter and aggregate
    let rxBytes = 0,
      txBytes = 0;
    for (const stat of netStats) {
      if (EXCLUDED_PREFIXES.some((prefix) => stat.iface.startsWith(prefix)))
        continue;
      rxBytes += stat.rx_bytes;
      txBytes += stat.tx_bytes;
    }
    const now = Date.now();
    const elapsed = Math.max(1, (now - prevTime) / 1000);
    let rxSpeed = 0,
      txSpeed = 0;

    if (prevTime !== 0) {
      rxSpeed = Math.max(0, (rxBytes - prevRx) / elapsed);
      txSpeed = Math.max(0, (txBytes - prevTx) / elapsed);
    }

    // Set tray title using imported function
    tray.setTitle(formatMenuTitle(rxSpeed, txSpeed));

    // Get network interface details
    const interfaces = await si.networkInterfaces();
    const wifiNetworks = await si.wifiNetworks();
    const interfacesArr: Systeminformation.NetworkInterfacesData[] =
      Array.isArray(interfaces) ? interfaces : [interfaces];
    const wifiNetworksArr: Systeminformation.WifiNetworkData[] = Array.isArray(
      wifiNetworks
    )
      ? wifiNetworks
      : [wifiNetworks];
    // Find the default (active) interface
    const active = interfacesArr.find(
      (iface) => iface.default && !iface.internal && iface.operstate === "up"
    );

    // Build menu details using imported function
    const details = buildMenuDetails(active, wifiNetworksArr);

    // Rebuild the menu with network details
    menu = Menu.buildFromTemplate([
      ...details.map((label) => ({ label, enabled: false })),
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);

    prevRx = rxBytes;
    prevTx = txBytes;
    prevTime = now;
  } catch (error) {
    console.error("Error in pollNetSpeed:", error);
  }
}

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, "assets", "icon.png");
  try {
    tray = new Tray(
      nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    );
  } catch (error) {
    console.error("Failed to load icon, using default. Error:", error);
    tray = new Tray(nativeImage.createEmpty());
  }

  // Initial menu with placeholder
  menu = Menu.buildFromTemplate([
    { label: "Network details loading...", enabled: false },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);

  tray.setTitle("↓↑");
  setInterval(pollNetSpeed, 1000);
  pollNetSpeed();
});

// Hide the dock on macOS
if (process.platform === "darwin") {
  app.dock.hide();
}
