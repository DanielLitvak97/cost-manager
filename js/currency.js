'use strict';

// The currencies supported by the Cost Manager application.
const supportedCurrencies = [
    'USD',
    'ILS',
    'GBP',
    'EURO'
];

// The default exchange-rate URL.
const defaultExchangeRatesUrl =
    'https://cost-manager-rates.onrender.com/exchange-rates.json';

// The localStorage key used to store the user's custom URL.
const exchangeRatesUrlKey =
    'cost-manager-exchange-rates-url';

// How often the application checks for updated exchange rates.
const exchangeRatesRefreshInterval =
    15 * 60 * 1000;

// Returns the exchange-rate URL selected by the user. If no custom URL exists, the default URL is returned.
function getExchangeRatesUrl() {
    const savedUrl = localStorage.getItem(
        exchangeRatesUrlKey
    );

    if (
        savedUrl !== null &&
        savedUrl.trim() !== ''
    ) {
        return savedUrl.trim();
    }

    return defaultExchangeRatesUrl;
}

// Saves a custom exchange-rate URL.
function saveExchangeRatesUrl(url) {
    if (typeof url !== 'string') {
        throw new Error(
            'Exchange-rate URL must be a string.'
        );
    }

    const cleanedUrl = url.trim();

    if (cleanedUrl === '') {
        localStorage.removeItem(
            exchangeRatesUrlKey
        );

        return;
    }

    localStorage.setItem(
        exchangeRatesUrlKey,
        cleanedUrl
    );
}

// Removes the custom exchange-rate URL.
function resetExchangeRatesUrl() {
    localStorage.removeItem(
        exchangeRatesUrlKey
    );
}

// Validates the exchange-rate object received from the server.
function validateExchangeRates(exchangeRates) {
    if (
        exchangeRates === null ||
        typeof exchangeRates !== 'object' ||
        Array.isArray(exchangeRates)
    ) {
        throw new Error(
            'Invalid exchange-rate data.'
        );
    }

    supportedCurrencies.forEach((currency) => {
        if (
            typeof exchangeRates[currency] !== 'number' ||
            !Number.isFinite(exchangeRates[currency]) ||
            exchangeRates[currency] <= 0
        ) {
            throw new Error(
                `Missing or invalid exchange rate for ${currency}.`
            );
        }
    });
}

// Retrieves exchange rates from a specific URL.
async function fetchExchangeRatesFromUrl(url) {
    if (
        typeof url !== 'string' ||
        url.trim() === ''
    ) {
        throw new Error(
            'Exchange-rate URL must not be empty.'
        );
    }

    try {
        const response = await fetch(
            url.trim(),
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(
                `Unable to retrieve exchange rates. Server returned ${response.status}.`
            );
        }

        const exchangeRates =
            await response.json();

        validateExchangeRates(exchangeRates);

        return exchangeRates;
    } catch (exception) {
        if (
            exception.message ===
            'Failed to fetch'
        ) {
            throw new Error(
                'Unable to retrieve exchange rates. Please check the URL and server.'
            );
        }

        throw exception;
    }
}

// Fetches exchange rates from the currently configured URL and updates the in-memory rates in db.js.
async function refreshExchangeRates() {
    const url = getExchangeRatesUrl();

    const exchangeRates =
        await fetchExchangeRatesFromUrl(url);

    db.setExchangeRates(exchangeRates);

    return exchangeRates;
}

// Initializes the exchange-rate system.
async function initializeExchangeRates() {
    await refreshExchangeRates();
}

// Starts periodic exchange-rate updates.
function startExchangeRatesRefresh() {
    setInterval(
        async () => {
            try {
                await refreshExchangeRates();

                console.log(
                    'Exchange rates updated successfully.'
                );
            } catch (exception) {
                console.error(
                    'Unable to update exchange rates:',
                    exception.message
                );
            }
        },
        exchangeRatesRefreshInterval
    );
}

// Initialize the exchange-rate system and start periodic refreshes.
async function initializeCurrencySystem() {
    try {
        await initializeExchangeRates();
    } finally {
        startExchangeRatesRefresh();
    }
}

// Start the asynchronous exchange-rate initialization.
const exchangeRatesReady =
    initializeCurrencySystem();