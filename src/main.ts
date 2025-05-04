import { app, Menu, nativeImage, Tray, shell } from "electron";
import * as path from "path";
import si from "systeminformation";
import { formatMenuTitle, SpeedDisplayMode } from "./menu-title";
import { buildMenuDetails } from "./menu-details";
import type { Systeminformation } from "systeminformation";

let tray: Tray;
let prevRx = 0,
  prevTx = 0,
  prevTime = 0;
let menu: Menu;
let displayMode: SpeedDisplayMode = "both";
let globeAnimationInterval: NodeJS.Timeout | null = null;
let globeFrame = 0;
const globeFrames = ["🌍", "🌎", "🌏"];
let loading = true;
let hasPolled = false;
let lastRxSpeed = 0,
  lastTxSpeed = 0;
let lastMenuDetails: string[] = ["Network details loading..."];

const EXCLUDED_PREFIXES = ["lo", "vir", "vbox", "docker", "br-"];

function startGlobeAnimation() {
  if (globeAnimationInterval) return;
  globeAnimationInterval = setInterval(() => {
    globeFrame = (globeFrame + 1) % globeFrames.length;
    tray.setTitle(globeFrames[globeFrame]);
    // Update menu with animated globe
    menu = buildTrayMenu([
      `${globeFrames[globeFrame]}  Loading network details...`,
    ]);
    tray.setContextMenu(menu);
  }, 200);
}

function stopGlobeAnimation() {
  if (globeAnimationInterval) {
    clearInterval(globeAnimationInterval);
    globeAnimationInterval = null;
  }
}

function buildTrayMenu(details: string[]): Menu {
  return Menu.buildFromTemplate([
    { label: "Network Speed Monitor", enabled: false },
    {
      label: "Show Both (Up & Down)",
      type: "radio",
      checked: displayMode === "both",
      click: () => setDisplayMode("both"),
    },
    {
      label: "Show Only Download",
      type: "radio",
      checked: displayMode === "down",
      click: () => setDisplayMode("down"),
    },
    {
      label: "Show Only Upload",
      type: "radio",
      checked: displayMode === "up",
      click: () => setDisplayMode("up"),
    },
    { type: "separator" },
    ...details.map((label) => ({ label, enabled: false })),
    { type: "separator" },
    { label: "open sourced", enabled: false },
    {
      label: "netspeed-monitor",
      click: () => {
        shell.openExternal(
          "https://github.com/thatbeautifuldream/netspeed-monitor"
        );
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
}

function setDisplayMode(mode: SpeedDisplayMode) {
  displayMode = mode;
  if (hasPolled) {
    // Instantly update tray and menu using cached data
    tray.setTitle(formatMenuTitle(lastRxSpeed, lastTxSpeed, displayMode));
    menu = buildTrayMenu(lastMenuDetails);
    tray.setContextMenu(menu);
  } else {
    loading = true;
    startGlobeAnimation();
    if (menu) {
      // Try to extract details from the current menu, fallback to empty
      const details = menu.items
        .filter(
          (item) =>
            item.enabled === false &&
            item.label &&
            item.label !== "Network Speed Monitor"
        )
        .map((item) => item.label as string);
      menu = buildTrayMenu(details);
      tray.setContextMenu(menu);
    }
  }
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

    // Cache the latest speeds
    lastRxSpeed = rxSpeed;
    lastTxSpeed = txSpeed;

    // Only show real data if not loading
    if (!loading) {
      tray.setTitle(formatMenuTitle(rxSpeed, txSpeed, displayMode));
    }

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
    lastMenuDetails = details;

    // Only update the menu if details have changed and not loading
    const currentDetails =
      menu &&
      menu.items
        .filter(
          (item) =>
            item.enabled === false &&
            item.label &&
            item.label !== "Network Speed Monitor"
        )
        .map((item) => item.label as string);
    const detailsChanged =
      !currentDetails ||
      details.length !== currentDetails.length ||
      details.some((d, i) => d !== currentDetails[i]);
    if (detailsChanged && !loading) {
      menu = buildTrayMenu(details);
      tray.setContextMenu(menu);
    }

    prevRx = rxBytes;
    prevTx = txBytes;
    prevTime = now;

    // Stop globe animation and mark loading as false on first successful poll
    if (loading) {
      stopGlobeAnimation();
      loading = false;
      hasPolled = true;
      // Now show real data immediately
      tray.setTitle(formatMenuTitle(rxSpeed, txSpeed, displayMode));
      menu = buildTrayMenu(details);
      tray.setContextMenu(menu);
    } else {
      hasPolled = true;
    }
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

  // Start globe animation for loading state
  loading = true;
  startGlobeAnimation();

  // Initial menu with placeholder and toggles
  menu = buildTrayMenu(["Network details loading..."]);
  tray.setContextMenu(menu);

  tray.setTitle("🌍");
  setInterval(pollNetSpeed, 1000);
  pollNetSpeed();
});

// Hide the dock on macOS
if (process.platform === "darwin") {
  app.dock.hide();
}
