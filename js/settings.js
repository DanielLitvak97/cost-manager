'use strict';

// Get references to the settings page elements.
const settingsForm = document.getElementById('settingsForm');
const exchangeRatesUrlInput =
    document.getElementById('exchangeRatesUrl');
const testUrlButton =
    document.getElementById('testUrlButton');
const resetUrlButton =
    document.getElementById('resetUrlButton');
const settingsMessage =
    document.getElementById('settingsMessage');

// Displays a message to the user.
function showSettingsMessage(message, type) {
    settingsMessage.textContent = message;
    settingsMessage.className = `message ${type}`;
}

// Loads the currently configured exchange-rate URL.
function loadSettings() {
    exchangeRatesUrlInput.value =
        getExchangeRatesUrl();
}

// Tests a specific exchange-rate URL.
function testExchangeRatesUrl(url) {
    if (
        typeof url !== 'string' ||
        url.trim() === ''
    ) {
        throw new Error(
            'Please enter an exchange-rate URL.'
        );
    }

    return fetchExchangeRatesFromUrl(
        url.trim()
    );
}

// Saves the exchange-rate URL and updates the cached rates.
async function saveSettings() {
    const url =
        exchangeRatesUrlInput.value.trim();

    try {
        showSettingsMessage(
            'Testing exchange-rate URL...',
            ''
        );

        const exchangeRates =
            await testExchangeRatesUrl(url);

        // Save the URL only after the server response is valid.
        saveExchangeRatesUrl(url);

        // Replace the cached exchange rates immediately.
        db.setExchangeRates(exchangeRates);

        showSettingsMessage(
            'Exchange-rate URL saved successfully.',
            'success'
        );
    } catch (exception) {
        showSettingsMessage(
            exception.message,
            'error'
        );
    }
}

// Tests the URL without saving it.
async function testCurrentUrl() {
    const url =
        exchangeRatesUrlInput.value.trim();

    try {
        showSettingsMessage(
            'Testing exchange-rate URL...',
            ''
        );

        await testExchangeRatesUrl(url);

        showSettingsMessage(
            'Exchange-rate URL is valid.',
            'success'
        );
    } catch (exception) {
        showSettingsMessage(
            exception.message,
            'error'
        );
    }
}

// Resets the URL to the default server
// and refreshes the cached rates.
async function resetSettings() {
    resetExchangeRatesUrl();

    const defaultUrl =
        getExchangeRatesUrl();

    exchangeRatesUrlInput.value =
        defaultUrl;

    try {
        showSettingsMessage(
            'Loading default exchange rates...',
            ''
        );

        const exchangeRates =
            await fetchExchangeRatesFromUrl(
                defaultUrl
            );

        // Replace the cached rates with the default server rates.
        db.setExchangeRates(exchangeRates);

        showSettingsMessage(
            'Exchange-rate URL reset to the default server.',
            'success'
        );
    } catch (exception) {
        showSettingsMessage(
            exception.message,
            'error'
        );
    }
}

// Handle form submission.
settingsForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        await saveSettings();
    }
);

// Handle URL testing.
testUrlButton.addEventListener(
    'click',
    async () => {
        await testCurrentUrl();
    }
);

// Handle resetting the URL.
resetUrlButton.addEventListener(
    'click',
    async () => {
        await resetSettings();
    }
);

// Load the saved settings when the page opens.
loadSettings();