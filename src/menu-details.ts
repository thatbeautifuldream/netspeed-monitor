import type { Systeminformation } from "systeminformation";

export function buildMenuDetails(
  active: Systeminformation.NetworkInterfacesData | undefined,
  wifiNetworks: Systeminformation.WifiNetworkData[]
): string[] {
  const details: string[] = [];
  if (active && active.type === "wireless") {
    const connectedWifi = wifiNetworks.reduce((best, curr) => {
      if (!curr.ssid) return best;
      if (!best || (curr.quality && curr.quality > (best.quality || 0)))
        return curr;
      return best;
    }, undefined as Systeminformation.WifiNetworkData | undefined);
    if (connectedWifi && connectedWifi.ssid)
      details.push(`SSID: ${connectedWifi.ssid}`);
    if (active.ip4) details.push(`IP Address: ${active.ip4}`);
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
    if (connectedWifi && connectedWifi.signalLevel !== undefined)
      details.push(`RSSI: ${connectedWifi.signalLevel} dBm`);
    if (active.speed) details.push(`Tx Rate: ${active.speed} Mbps`);
    if (connectedWifi && connectedWifi.mode)
      details.push(`PHY Mode: ${connectedWifi.mode}`);
    if (connectedWifi && connectedWifi.quality !== undefined)
      details.push(`Signal: ${connectedWifi.quality}%`);
    details.push(`State: ${active.operstate || "-"}`);
  } else if (active) {
    details.push(`Interface: ${active.iface}`);
    details.push(`Type: ${active.type}`);
    if (active.ip4) details.push(`IPv4: ${active.ip4}`);
    if (active.mac) details.push(`MAC: ${active.mac}`);
    if (active.speed) details.push(`Speed: ${active.speed} Mbps`);
    details.push(`State: ${active.operstate}`);
  } else {
    details.push("No active network interface");
  }
  return details;
}
