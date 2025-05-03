import { app, Menu, nativeImage, Tray } from "electron";
import * as path from "path";
import si from "systeminformation";

let tray: Tray;
let prevRx = 0,
  prevTx = 0,
  prevTime = 0;
let menu: Menu;

function formatSpeed(bytesPerSecond: number) {
  const bitsPerSecond = bytesPerSecond * 8;
  if (bitsPerSecond < 10) return `${Math.round(bitsPerSecond)} b/s`;
  if (bitsPerSecond < 1024) return `${Math.round(bitsPerSecond)} b/s`;
  if (bitsPerSecond < 10 * 1024)
    return `${(bitsPerSecond / 1024).toFixed(1)} Kb/s`;
  if (bitsPerSecond < 1024 * 1024)
    return `${Math.round(bitsPerSecond / 1024)} Kb/s`;
  if (bitsPerSecond < 10 * 1024 * 1024)
    return `${(bitsPerSecond / 1024 / 1024).toFixed(2)} Mb/s`;
  return `${Math.round(bitsPerSecond / 1024 / 1024)} Mb/s`;
}

async function pollNetSpeed() {
  try {
    const netStats = await si.networkStats();
    const stat = netStats[0] || { rx_bytes: 0, tx_bytes: 0 };
    const now = Date.now();
    const elapsed = Math.max(1, (now - prevTime) / 1000);
    let rxSpeed = 0,
      txSpeed = 0;

    if (prevTime !== 0) {
      rxSpeed = Math.max(0, (stat.rx_bytes - prevRx) / elapsed);
      txSpeed = Math.max(0, (stat.tx_bytes - prevTx) / elapsed);
    }

    const downloadLabel = `↓ ${formatSpeed(rxSpeed)}`;
    const uploadLabel = `↑ ${formatSpeed(txSpeed)}`;

    // Set tray title to only show the down arrow and normal download speed
    const trayTitle = `↓ ${formatSpeed(rxSpeed)}`;
    tray.setTitle(trayTitle);

    // Rebuild the menu with updated labels
    menu = Menu.buildFromTemplate([
      { label: downloadLabel, enabled: true },
      { label: uploadLabel, enabled: true },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);

    prevRx = stat.rx_bytes;
    prevTx = stat.tx_bytes;
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
    { label: "↓ --", enabled: true },
    { label: "↑ --", enabled: true },
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
