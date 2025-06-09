// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const flashBtn = document.getElementById('flashBtn');
const firmwareUrlInput = document.getElementById('firmwareUrl');
const logContainer = document.getElementById('log');

let port = null;
let espLoader = null;

// Add log function
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    console.log(`[${type}]`, message);
}

// Initialize ESP Loader
async function initESPLoader() {
    try {
        addLog('Initializing ESP Loader...');
        const ESPTool = await espLoader.ESP.getStubBinary();
        espLoader = new ESPTool.ESPLoader({
            transport: {
                device: port,
                baudrate: 115200,
            },
            log: addLog,
        });
        addLog('ESP Loader initialized successfully', 'success');
        return true;
    } catch (error) {
        addLog(`Failed to initialize ESP Loader: ${error.message}`, 'error');
        return false;
    }
}

// Connect to ESP32
connectBtn.addEventListener('click', async () => {
    try {
        addLog('Requesting serial port...');
        port = await navigator.serial.requestPort();
        
        addLog('Opening port...');
        await port.open({ baudRate: 115200 });
        
        addLog('Port opened successfully', 'success');
        connectBtn.disabled = true;
        flashBtn.disabled = false;
        
        // Initialize ESP Loader after successful connection
        const initialized = await initESPLoader();
        if (!initialized) {
            connectBtn.disabled = false;
            flashBtn.disabled = true;
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
    }
});

// Download firmware from URL
async function downloadFirmware(url) {
    try {
        addLog(`Downloading firmware from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        addLog('Firmware downloaded successfully', 'success');
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        addLog(`Failed to download firmware: ${error.message}`, 'error');
        throw error;
    }
}

// Flash firmware to ESP32
flashBtn.addEventListener('click', async () => {
    if (!port) {
        addLog('Please connect to ESP32 first', 'error');
        return;
    }
    
    const firmwareUrl = firmwareUrlInput.value.trim();
    if (!firmwareUrl) {
        addLog('Please enter a valid firmware URL', 'error');
        return;
    }
    
    flashBtn.disabled = true;
    addLog('Starting flash process...', 'info');
    
    try {
        // Download the firmware
        const firmwareData = await downloadFirmware(firmwareUrl);
        
        // Connect to the chip
        addLog('Connecting to ESP32...');
        await espLoader.connect();
        
        // Get chip info
        const chip = await espLoader.main_fn();
        addLog(`Connected to ${chip.CHIP_NAME} (Chip ID: ${chip.CHIP_NAME})`, 'success');
        
        // Flash the firmware
        addLog('Flashing firmware...');
        await espLoader.write_flash({
            fileArray: [
                { data: firmwareData, address: 0x10000 } // Adjust address as needed
            ],
            flash_freq: '40m',
            flash_mode: 'dio',
            eraseAll: true
        });
        
        addLog('Firmware flashed successfully!', 'success');
        addLog('Please reset your device', 'info');
        
    } catch (error) {
        addLog(`Flash failed: ${error.message}`, 'error');
    } finally {
        flashBtn.disabled = false;
        
        // Close the port
        if (port) {
            try {
                await port.close();
                addLog('Serial port closed');
            } catch (error) {
                console.error('Error closing port:', error);
            }
            port = null;
        }
        
        connectBtn.disabled = false;
    }
});

// Check for Web Serial API support
if (!('serial' in navigator)) {
    addLog('Web Serial API is not supported in this browser. Please use Chrome/Edge 89+ or Opera 76+', 'error');
    connectBtn.disabled = true;
}

// Load ESP Web Tools
window.addEventListener('load', () => {
    addLog('ESP Web Tools loaded. Click "Connect to ESP32" to begin.', 'info');
});
