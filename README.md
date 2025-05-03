# netspeed-monitor

A simple, lightweight menu bar application for monitoring your network speed in real time. Built with Electron, it displays your current download and upload speeds directly in your system tray or menu bar.

## Features

- **Live Network Speed**: See your current download (↓) and upload (↑) speeds, updated every second.
- **Minimal UI**: Network speed is shown as text in the menu bar/tray, with a simple dropdown for more details.
- **Cross-platform**: Works on macOS and Linux.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [pnpm](https://pnpm.io/) (or use npm/yarn)
- [Electron](https://www.electronjs.org/)

### Clone and Install

```sh
git clone https://github.com/yourusername/netspeed-monitor.git
cd netspeed-monitor
pnpm install
```

### Run in Development

```sh
pnpm start
```

### Build for Production

```sh
pnpm make
```

The packaged app will be available in the `out/` directory.

## Usage

- On launch, the app adds a small icon and your current download speed to the menu bar (macOS) or system tray (Windows/Linux).
- Click the icon to see both download and upload speeds.
- Select "Quit" from the menu to exit the app.

## How it Works

- Uses the `systeminformation` Node.js package to fetch network statistics.
- Updates the tray title every second with the current download speed.
- The context menu shows both download and upload speeds, refreshed every second.

## Customization

- The tray icon can be changed by replacing `src/assets/icon.png`.
- Update the polling interval by changing the value in `setInterval(pollNetSpeed, 1000);` in `src/main.ts`.

## License

MIT © Milind Mishra
