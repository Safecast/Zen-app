import { ESPLoader } from "https://unpkg.com/esptool-js/bundle.js";

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const flashBtn = document.getElementById('flashBtn');
const firmwareUrlInput = document.getElementById('firmwareUrl');
const firmwareFileInput = document.getElementById('firmwareFile'); // New file input
const logContainer = document.getElementById('log');

let esploader; // Will hold the ESPLoader instance
let device = null; // Will hold the serial port device

// Add log function
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    // Sanitize message to prevent HTML injection if message comes from untrusted source
    const textNode = document.createTextNode(`[${new Date().toLocaleTimeString()}] ${message}`);
    logEntry.appendChild(textNode);
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    console.log(`[${type}]`, message);
}

// Initialize the app once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    addLog('M5Stack Web Flasher UI loaded.');

    if (!navigator.serial) {
        addLog('Web Serial API not supported in this browser.', 'error');
        alert('Web Serial API not supported in this browser. Please use Chrome or Edge version 89 or later.');
        connectButton.disabled = true;
        flashButton.disabled = true;
        return;
    }
    addLog('Web Serial API supported.');

    // ESPLoader is now imported as a module. If the import failed, the script might not run or would have errored earlier.
    addLog('ESPLoader library found.', 'info');
    
    connectBtn.disabled = false;
    flashBtn.disabled = true;
});

// Connect to M5Stack
connectBtn.addEventListener('click', async () => {
    if (esploader && esploader.connected()) {
        try {
            // If esploader.disconnect() is not available or causes issues,
            // direct port closing might be enough if the library handles internal state.
            if (esploader.disconnect) { // Check if disconnect method exists
                 await esploader.disconnect();
            }
            if (esploader.port && esploader.port.readable) { // Check if port is open
                await esploader.port.close();
            }
            addLog('Disconnected from device.', 'info');
        } catch (e) {
            addLog(`Error during disconnect: ${e.message}`, 'error');
            console.error("Disconnect error:", e);
        }
        esploader = null;
        device = null;
        connectBtn.textContent = 'Connect to M5Stack';
        flashBtn.disabled = true;
        connectBtn.disabled = false;
        firmwareFileInput.value = ''; // Clear file input on disconnect
        return;
    }

    // ESPLoader is imported as a module. If it's not available, an error would have occurred at import.
    connectBtn.disabled = true;
    addLog('Requesting serial port...');

    const terminal = {
        clean: () => { /* logContainer.innerHTML = ''; // Optional: clear log on new connection */ },
        writeLine: (data) => addLog(data, 'terminal'),
        write: (data) => { 
            const lastLog = logContainer.lastElementChild;
            // Check if the last log entry is a terminal message and append to it
            if (lastLog && lastLog.classList.contains('log-terminal') && !lastLog.textContent.endsWith('\n')) {
                lastLog.textContent += data;
            } else { // Otherwise, create a new log entry
                addLog(data, 'terminal');
            }
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    try {
        // Standard USB VIDs for common ESP32 dev boards. Add more if needed.
        // ESP32-S2/S3 built-in USB JTAG/Serial: 0x303A
        // CP210x: 0x10C4
        // CH340: 0x1A86
        const portFilters = [
            { usbVendorId: 0x303A }, // Espressif
            { usbVendorId: 0x10C4 }, // Silicon Labs CP210x
            { usbVendorId: 0x1A86 }  // CH340
        ];
        device = await navigator.serial.requestPort({ filters: portFilters }); 
        if (!device) {
            addLog('No serial port selected.', 'warning');
            connectBtn.disabled = false;
            return;
        }
        
        addLog('Serial port selected. Initializing ESPLoader...', 'info');
        // Baudrate is often set by esploader.connect() or can be passed as an option
        esploader = new ESPLoader(device, terminal, 115200); // Pass baudrate if needed, or let connect handle
        
        addLog('Connecting to ESP device...', 'info');
        await esploader.connect(); // Default baudrate is 115200
        addLog(`Connected to ${esploader.chipName}.`, 'success');
        addLog(`MAC Address: ${esploader.macAddr()}`, 'info');

        flashBtn.disabled = false;
        connectBtn.textContent = 'Disconnect';
        connectBtn.disabled = false;

    } catch (error) {
        addLog(`Error connecting: ${error.message || error}`, 'error');
        console.error("Connection error:", error);
        if (device && device.readable) { 
             try { await device.close(); } catch (e) { /* ignore */ }
        }
        esploader = null;
        device = null;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect to M5Stack';
        flashBtn.disabled = true;
    }
});

// Flash firmware to M5Stack
flashBtn.addEventListener('click', async () => {
    if (!esploader || !esploader.connected()) {
        addLog('Not connected to an ESP device. Please connect first.', 'error');
        return;
    }

    let firmwareData;
    let firmwareName = 'firmware.bin';

    if (firmwareFileInput.files.length > 0) {
        const file = firmwareFileInput.files[0];
        firmwareName = file.name;
        addLog(`Reading local file: ${firmwareName}...`, 'info');
        try {
            firmwareData = await file.arrayBuffer();
        } catch (e) {
            addLog(`Error reading file: ${e.message}`, 'error');
            return;
        }
    } else if (firmwareUrlInput.value.trim() !== '') {
        const url = firmwareUrlInput.value.trim();
        addLog(`Downloading firmware from ${url}...`, 'info');
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download firmware: HTTP ${response.status} ${response.statusText}`);
            }
            firmwareData = await response.arrayBuffer();
        } catch (e) {
            addLog(`Error downloading firmware: ${e.message}`, 'error');
            return;
        }
    } else {
        addLog('No firmware source selected. Please select a local file or provide a URL.', 'error');
        return;
    }

    if (!firmwareData || firmwareData.byteLength === 0) {
        addLog('Firmware data is empty or could not be loaded.', 'error');
        return;
    }
    addLog(`Firmware "${firmwareName}" loaded, size: ${firmwareData.byteLength} bytes.`, 'success');

    flashBtn.disabled = true;
    connectBtn.disabled = true; // Disable disconnect/reconnect during flash
    addLog('Starting flash process...', 'info');

    try {
        const flashOptions = {
            fileArray: [{ data: firmwareData, address: 0x1000 }], // Common offset for ESP32 applications
            flashSize: 'keep', 
            flashMode: 'keep', 
            flashFreq: 'keep', 
            eraseAll: true,    
            compress: true,    
        };
        
        // The manifest.json showed offset 0, which is unusual for ESP32 user applications.
        // Standard bootloader is at 0x1000, partition table at 0x8000, ota_data at 0xd000, app at 0x10000.
        // If "firmware.bin" is a combined image (bootloader + partition table + app), then 0x0 is okay.
        // If it's just the application binary, it should usually be 0x10000.
        // For M5Stack factory test, it might be a full image starting at 0x0 or 0x1000.
        // The original manifest.json had "offset": 0. 
        // The esp-web-tools manifest has `offset: 0` for `firmware.bin`.
        // Let's use 0x0000 as per the original manifest.json.
        flashOptions.fileArray[0].address = 0x0000;

        addLog(`Flashing ${firmwareName} to address 0x${flashOptions.fileArray[0].address.toString(16)}. Erasing chip first...`);
        
        await esploader.write_flash(
            flashOptions.fileArray,
            flashOptions.flashSize,
            flashOptions.flashMode,
            flashOptions.flashFreq,
            flashOptions.eraseAll,
            false, // noStub = false
            (fileIndex, written, total) => { 
                 const progress = Math.round((written / total) * 100);
                 // Update a single log line for progress if possible, or create new ones.
                 // For simplicity, creating new log lines for each update.
                 addLog(`Flashing part ${fileIndex + 1}: ${progress}% (${written}/${total} bytes)`);
            }
        );

        addLog('Firmware flashed successfully!', 'success');
        addLog('Device should restart. If not, please reset it manually.', 'info');
        
        try {
            await esploader.hard_reset();
            addLog('Hard reset command sent.', 'info');
        } catch (e) {
            addLog(`Could not send hard_reset: ${e.message}. Please reset manually.`, 'warning');
        }

    } catch (error) {
        addLog(`Flash process failed: ${error.message || error}`, 'error');
        console.error("Flashing error:", error);
    } finally {
        flashBtn.disabled = false;
        connectBtn.disabled = false; 
        firmwareFileInput.value = ''; // Clear file input after attempt
    }
});
