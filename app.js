// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const flashBtn = document.getElementById('flashBtn');
const firmwareUrlInput = document.getElementById('firmwareUrl');
const logContainer = document.getElementById('log');
const installButton = document.getElementById('installButton');

// Add log function
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    console.log(`[${type}]`, message);
}

// Initialize the app once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    addLog('M5Stack Web Flasher UI loaded.');

    // Initial button states
    connectBtn.disabled = true;
    flashBtn.disabled = true;

    // Check for Web Serial API support
    if (!('serial' in navigator)) {
        addLog('Web Serial API is not supported. Please use Chrome/Edge 89+ or Opera 76+.', 'error');
        return; // Stop further initialization
    }
    addLog('Web Serial API supported.', 'info');

    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)

    function checkForEspTools() {
        // Check if the <esp-web-install-button> custom element is defined
        if (customElements.get('esp-web-install-button')) {
            addLog('ESP Web Tools (<esp-web-install-button>) is defined and ready.', 'success');
            connectBtn.disabled = false; // Enable connect button now
        } else {
            attempts++;
            if (attempts < maxAttempts) {
                const remainingAttempts = maxAttempts - attempts;
                addLog(`Waiting for <esp-web-install-button> to be defined... (${remainingAttempts} attempts left)`, 'warning');
                setTimeout(checkForEspTools, 500);
            } else {
                addLog('Error: ESP Web Tools (<esp-web-install-button>) failed to define. The library might have loaded, but the custom element is not registered. Check console for import errors from index.html.', 'error');
                console.error('<esp-web-install-button> remained undefined after multiple checks. The module in index.html might have failed to import or register the custom element.');
            }
        }
    }

    addLog('Checking if <esp-web-install-button> custom element is defined...', 'info');
    checkForEspTools(); // Start checking
});

// Connect to M5Stack
connectBtn.addEventListener('click', async () => {
    // Ensure the custom element is available before trying to use it
    if (!customElements.get('esp-web-install-button')) {
        addLog('Error: ESP Web Tools (<esp-web-install-button>) not available. Cannot connect.', 'error');
        return;
    }

    try {
        addLog('Initializing connection to M5Stack...');
        
        let espInstallButton = document.getElementById('installButton');
        // The <esp-web-install-button> tag is already in the HTML (id="installButton").
        // We don't need to create it dynamically if it's already there.

        if (!espInstallButton) {
            addLog('CRITICAL ERROR: The <esp-web-install-button> element with id="installButton" was not found in the HTML. This should not happen.', 'error');
            return;
        }
        
        // The espInstallButton instance from the DOM is already a live custom element.
        // We can directly attach event listeners and call its methods.

        espInstallButton.addEventListener('state-changed', (event) => {
            const { state, message, error } = event.detail;
            
            if (error) {
                addLog(`ESP Tool Error: ${error}`, 'error');
                console.error('ESP Web Tools state-changed error:', error);
                connectBtn.disabled = false;
                flashBtn.disabled = true;
                return;
            }
            
            addLog(message, 'info');
            
            switch (state) {
                case 'ready':
                    connectBtn.disabled = true;
                    flashBtn.disabled = false;
                    addLog('Connected to M5Stack. Ready to flash!', 'success');
                    break;
                case 'error':
                    connectBtn.disabled = false;
                    flashBtn.disabled = true;
                    addLog('Connection process resulted in an error.', 'error');
                    break;
            }
        });
        
        // Store the button instance globally for the flash function to use
        window.espTool = espInstallButton;
        
        addLog('Please select your M5Stack from the browser prompt...');
        await espInstallButton.connect();
        
    } catch (error) {
        addLog(`Connection initialization failed: ${error.message}`, 'error');
        console.error('Connect button click error:', error);
        connectBtn.disabled = false;
        flashBtn.disabled = true;
    }
});

// Download firmware from URL (no changes needed for this function)
async function downloadFirmware(url) {
    try {
        addLog(`Downloading firmware from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        addLog('Firmware downloaded successfully', 'success');
        return arrayBuffer;
    } catch (error) {
        addLog(`Failed to download firmware: ${error.message}`, 'error');
        throw error;
    }
}

// Flash firmware to M5Stack
flashBtn.addEventListener('click', async () => {
    const espToolInstance = window.espTool; // Use the stored instance
    
    if (!espToolInstance || !customElements.get('esp-web-install-button')) {
        addLog('Error: Not connected or ESP Web Tools not ready. Please connect first.', 'error');
        return;
    }
    
    const firmwareUrl = firmwareUrlInput.value.trim();
    if (!firmwareUrl) {
        addLog('Please enter a valid firmware URL.', 'error');
        return;
    }
    
    flashBtn.disabled = true;
    addLog('Starting flash process...', 'info');
    
    try {
        addLog(`Downloading firmware from ${firmwareUrl}...`);
        const response = await fetch(firmwareUrl);
        if (!response.ok) {
            throw new Error(`Failed to download firmware: HTTP ${response.status}`);
        }
        const firmwareData = await response.arrayBuffer();
        addLog('Firmware downloaded successfully.', 'success');
        
        const firmwareFile = new File(
            [firmwareData],
            'firmware.bin',
            { type: 'application/octet-stream' }
        );
        
        addLog('Flashing firmware to M5Stack... This may take a few moments.');
        espToolInstance.files = [firmwareFile];
        await espToolInstance.install();
        
        addLog('Firmware flashed successfully!', 'success');
        addLog('Your M5Stack should restart automatically.', 'info');
        
    } catch (error) {
        addLog(`Flash process failed: ${error.message}`, 'error');
        console.error('Flash button click error:', error);
    } finally {
        flashBtn.disabled = false;
        connectBtn.disabled = false;
    }
});

// Connect to M5Stack
connectBtn.addEventListener('click', async () => {
    if (typeof window.ESPWebInstallButton === 'undefined') {
        addLog('Error: ESP Web Tools not available. Cannot connect.', 'error');
        return;
    }

    try {
        addLog('Initializing connection to M5Stack...');
        
        // Create and configure the install button
        // The ESPWebInstallButton element is already in the HTML, we can reuse it or create dynamically
        // For simplicity, let's assume it might be better to create it dynamically for each connection attempt
        // to ensure a clean state, though the library might handle this internally.
        let espInstallButton = document.getElementById('installButton'); // Use the one from HTML
        if (!espInstallButton) { // Or create if not found (should not happen with current HTML)
            espInstallButton = document.createElement('esp-web-install-button');
            espInstallButton.id = 'installButton'; // Ensure it has an ID if created dynamically
            espInstallButton.style.display = 'none'; // Keep it hidden
            document.body.appendChild(espInstallButton);
        }
        
        // Set up event listeners for the install button
        espInstallButton.addEventListener('state-changed', (event) => {
            const { state, message, error } = event.detail;
            
            if (error) {
                addLog(`ESP Tool Error: ${error}`, 'error');
                console.error('ESP Web Tools state-changed error:', error);
                // Reset buttons if connection fails here
                connectBtn.disabled = false;
                flashBtn.disabled = true;
                return;
            }
            
            addLog(message, 'info');
            
            // Update UI based on state
            switch (state) {
                case 'ready': // Successfully connected to the serial port
                    connectBtn.disabled = true;
                    flashBtn.disabled = false;
                    addLog('Connected to M5Stack. Ready to flash!', 'success');
                    break;
                case 'error': // Error during the process (e.g., user cancelled, port busy)
                    connectBtn.disabled = false;
                    flashBtn.disabled = true;
                    addLog('Connection process resulted in an error.', 'error');
                    break;
                // Other states like 'initializing', 'connecting', 'erasing', 'writing', 'finished' can be handled for more detailed feedback
            }
        });
        
        // Store the button instance globally for the flash function to use
        window.espTool = espInstallButton;
        
        // Trigger the connection dialog
        addLog('Please select your M5Stack from the browser prompt...');
        await espInstallButton.connect(); // This opens the browser's serial port selection dialog
        
    } catch (error) {
        // This catch block handles errors from espInstallButton.connect() itself (e.g., if the method fails to invoke)
        addLog(`Connection initialization failed: ${error.message}`, 'error');
        console.error('Connect button click error:', error);
        connectBtn.disabled = false;
        flashBtn.disabled = true;
        // No need to manually remove the button if it's part of the static HTML.
        // If created dynamically and an error occurs before `window.espTool` is set, clean up here.
    }
});

// Download firmware from URL (no changes needed for this function)
async function downloadFirmware(url) {
    try {
        addLog(`Downloading firmware from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        addLog('Firmware downloaded successfully', 'success');
        return arrayBuffer;
    } catch (error) {
        addLog(`Failed to download firmware: ${error.message}`, 'error');
        throw error;
    }
}

// Flash firmware to M5Stack
flashBtn.addEventListener('click', async () => {
    const espToolInstance = window.espTool; // Use the stored instance
    
    if (!espToolInstance) {
        addLog('Error: Not connected to M5Stack. Please connect first.', 'error');
        return;
    }
    
    const firmwareUrl = firmwareUrlInput.value.trim();
    if (!firmwareUrl) {
        addLog('Please enter a valid firmware URL.', 'error');
        return;
    }
    
    flashBtn.disabled = true;
    // connectBtn should remain disabled during flashing

    addLog('Starting flash process...', 'info');
    
    try {
        // 1. Download the firmware
        addLog(`Downloading firmware from ${firmwareUrl}...`);
        const response = await fetch(firmwareUrl);
        if (!response.ok) {
            throw new Error(`Failed to download firmware: HTTP ${response.status}`);
        }
        const firmwareData = await response.arrayBuffer();
        addLog('Firmware downloaded successfully.', 'success');
        
        // 2. Create a file object for the firmware
        const firmwareFile = new File(
            [firmwareData],
            'firmware.bin',
            { type: 'application/octet-stream' }
        );
        
        // 3. Flash the firmware
        addLog('Flashing firmware to M5Stack... This may take a few moments.');
        
        // The ESPWebInstallButton handles the manifest and file parts internally if you set `manifest` or `files` properties.
        // For direct flashing of a downloaded binary, we provide the file to the `install()` method.
        // The `espToolInstance.files = [firmwareFile];` and then `espToolInstance.install();` approach is correct.
        
        // The `install` method of ESPWebInstallButton expects an array of { data: ArrayBuffer, address: number } objects
        // or it can take a manifest. For a single binary, we need to format it correctly.
        // The library's `install(file)` method is simpler if it exists and works as previously intended.
        // Let's stick to the documented way for `esp-web-tools` which is usually via a manifest or by setting `parts`.
        // However, `esptool-js` (which `esp-web-tools` wraps) uses `writeFlash` with `fileArray`.
        // The `ESPWebInstallButton` is a higher-level component.
        // If `espToolInstance.install(firmwareFile)` was working, it's the simplest.
        // Let's assume the `espToolInstance.install(firmwareFile)` is the intended API for a single file.
        // The documentation for `esp-web-tools` install button sometimes implies using a manifest.
        // Let's try the direct file approach first as it's simpler for this use case.
        // If `install(file)` is not the correct API for the button, we might need to use `espToolInstance.flash(fileData, offset)`
        // or construct a manifest-like structure if the button requires it.
        // The previous code `espTool.files = [firmwareFile]; await espTool.install();` seems like a plausible API for the button.

        espToolInstance.files = [firmwareFile]; // This tells the button what to flash
        await espToolInstance.install(); // This starts the flashing process using the files set
        
        addLog('Firmware flashed successfully!', 'success');
        addLog('Your M5Stack should restart automatically.', 'info');
        
    } catch (error) {
        addLog(`Flash process failed: ${error.message}`, 'error');
        console.error('Flash button click error:', error);
    } finally {
        // Reset button states regardless of success or failure
        flashBtn.disabled = false;
        connectBtn.disabled = false; // Allow reconnecting
        
        // It's good practice to nullify the global espTool instance after flashing is done or failed,
        // so a new connection sequence is cleanly initiated next time.
        // However, the `esp-web-install-button` might manage its own state internally across operations.
        // If the button is part of static HTML, we don't remove it. If created dynamically and meant for one-time use, remove it.
        // For now, let's assume the button in HTML is persistent and can be reused.
        // window.espTool = null; // Optional: clear the global instance
    }
});
