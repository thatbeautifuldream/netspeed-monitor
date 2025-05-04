import { app, Menu, nativeImage, Tray } from "electron";
import * as path from "path";
import si from "systeminformation";

let tray: Tray;
let prevRx = 0,
  prevTx = 0,
  prevTime = 0;
let menu: Menu;

const EXCLUDED_PREFIXES = ["lo", "vir", "vbox", "docker", "br-"];

function formatSpeed(bytesPerSecond: number) {
  if (bytesPerSecond <= 0) return "-";
  const bitsPerSecond = bytesPerSecond * 8;
  if (bitsPerSecond < 1024) return `${Math.round(bitsPerSecond)} b/s`;
  if (bitsPerSecond < 1024 * 1024)
    return `${(bitsPerSecond / 1024).toFixed(1)} Kb/s`;
  if (bitsPerSecond < 1024 * 1024 * 1024)
    return `${(bitsPerSecond / 1024 / 1024).toFixed(2)} Mb/s`;
  return `${(bitsPerSecond / 1024 / 1024 / 1024).toFixed(2)} Gb/s`;
}

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

    // Set tray title to show both download and upload speeds
    const trayTitle = `↓ ${formatSpeed(rxSpeed)} ↑ ${formatSpeed(txSpeed)}`;
    tray.setTitle(trayTitle);

    // Get network interface details
    const interfaces = await si.networkInterfaces();
    const wifiNetworks = await si.wifiNetworks();
    const interfacesArr = Array.isArray(interfaces) ? interfaces : [interfaces];
    const wifiNetworksArr = Array.isArray(wifiNetworks)
      ? wifiNetworks
      : [wifiNetworks];
    // Find the default (active) interface
    const active = interfacesArr.find(
      (iface: any) =>
        iface.default && !iface.internal && iface.operstate === "up"
    );
    const details: string[] = [];
    if (active && active.type === "wireless") {
      // Show only available Wi-Fi details for the connected network
      const connectedWifi = wifiNetworksArr.reduce((best: any, curr: any) => {
        if (!curr.ssid) return best;
        if (!best || (curr.quality && curr.quality > (best.quality || 0)))
          return curr;
        return best;
      }, null);
      if (connectedWifi && connectedWifi.ssid)
        details.push(`SSID: ${connectedWifi.ssid}`);
      if (active.ip4) details.push(`IP Address: ${active.ip4}`);
      if (connectedWifi && connectedWifi.gateway)
        details.push(`Router: ${connectedWifi.gateway}`);
      if (active.mac) details.push(`MAC Address: ${active.mac}`);
      if (
        connectedWifi &&
        connectedWifi.security &&
        connectedWifi.security.length > 0
      )
        details.push(`Security: ${connectedWifi.security.join(", ")}`);
      if (connectedWifi && connectedWifi.bssid)
        details.push(`BSSID: ${connectedWifi.bssid}`);
      if (connectedWifi && connectedWifi.channel)
        details.push(`Channel: ${connectedWifi.channel}`);
      if (connectedWifi && connectedWifi.countryCode)
        details.push(`Country Code: ${connectedWifi.countryCode}`);
      if (connectedWifi && connectedWifi.signalLevel)
        details.push(`RSSI: ${connectedWifi.signalLevel} dBm`);
      if (active.speed) details.push(`Tx Rate: ${active.speed} Mbps`);
      if (connectedWifi && connectedWifi.mode)
        details.push(`PHY Mode: ${connectedWifi.mode}`);
      if (connectedWifi && connectedWifi.quality)
        details.push(`Signal: ${connectedWifi.quality}%`);
      details.push(`State: ${active.operstate || "-"}`);
    } else if (active) {
      // For non-wireless, show basic details
      details.push(`Interface: ${active.iface}`);
      details.push(`Type: ${active.type}`);
      if (active.ip4) details.push(`IPv4: ${active.ip4}`);
      if (active.mac) details.push(`MAC: ${active.mac}`);
      if (active.speed) details.push(`Speed: ${active.speed} Mbps`);
      details.push(`State: ${active.operstate}`);
    } else {
      details.push("No active network interface");
    }

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
