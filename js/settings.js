"use strict";

// Get references to the settings page elements.
const settingsForm = document.getElementById("settingsForm");
const exchangeRatesUrlInput =
    document.getElementById("exchangeRatesUrl");
const testUrlButton =
    document.getElementById("testUrlButton");
const resetUrlButton =
    document.getElementById("resetUrlButton");
const settingsMessage =
    document.getElementById("settingsMessage");

// Displays a message to the user.
function showSettingsMessage(message, type) {
    settingsMessage.textContent = message;
    settingsMessage.className = "message " + type;
}

// Loads the currently configured exchange-rate URL.
function loadSettings() {
    exchangeRatesUrlInput.value = getExchangeRatesUrl();
}

// Tests a specific exchange-rate URL.
async function testExchangeRatesUrl(url) {
    if (url.trim() === "") {
        throw new Error("Please enter an exchange-rate URL.");
    }

    try {
        const response = await fetch(url.trim(), {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                "The server returned status " +
                response.status +
                "."
            );
        }

        const exchangeRates = await response.json();

        validateExchangeRates(exchangeRates);

        return exchangeRates;
    } catch (exception) {
        if (exception.message === "Failed to fetch") {
            throw new Error(
                "Unable to retrieve exchange rates. Please check the URL and server."
            );
        }

        throw exception;
    }
}

// Handles saving the exchange-rate URL.
async function saveSettings() {
    const url = exchangeRatesUrlInput.value.trim();

    try {
        showSettingsMessage(
            "Testing exchange-rate URL...",
            ""
        );

        await testExchangeRatesUrl(url);

        saveExchangeRatesUrl(url);

        showSettingsMessage(
            "Exchange-rate URL saved successfully.",
            "success"
        );
    } catch (exception) {
        showSettingsMessage(
            exception.message,
            "error"
        );
    }
}

// Handles testing the URL without saving it.
async function testCurrentUrl() {
    const url = exchangeRatesUrlInput.value.trim();

    try {
        showSettingsMessage(
            "Testing exchange-rate URL...",
            ""
        );

        await testExchangeRatesUrl(url);

        showSettingsMessage(
            "Exchange-rate URL is valid.",
            "success"
        );
    } catch (exception) {
        showSettingsMessage(
            exception.message,
            "error"
        );
    }
}

// Resets the exchange-rate URL to the default server.
function resetSettings() {
    resetExchangeRatesUrl();

    exchangeRatesUrlInput.value =
        getExchangeRatesUrl();

    showSettingsMessage(
        "Exchange-rate URL reset to the default server.",
        "success"
    );
}

// Handle form submission.
settingsForm.addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        saveSettings();
    }
);

// Handle URL testing.
testUrlButton.addEventListener(
    "click",
    function () {
        testCurrentUrl();
    }
);

// Handle resetting the URL.
resetUrlButton.addEventListener(
    "click",
    function () {
        resetSettings();
    }
);

// Load the saved settings when the page opens.
loadSettings();