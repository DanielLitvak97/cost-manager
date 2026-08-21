'use strict';

// The currencies supported by the Cost Manager application.
const SUPPORTED_CURRENCIES = [
    'USD',
    'ILS',
    'GBP',
    'EURO'
];

// The default exchange-rate URL.
const DEFAULT_EXCHANGE_RATES_URL =
    'https://cost-manager-rates.onrender.com/exchange-rates.json';

// The localStorage key used to store the user's custom URL.
const EXCHANGE_RATES_URL_KEY =
    'cost-manager-exchange-rates-url';

// How often the application checks for updated exchange rates.
const EXCHANGE_RATES_REFRESH_INTERVAL =
    15 * 60 * 1000;

// Maximum time to wait for the initial default-rate load.
const INITIAL_RATES_TIMEOUT =
    10000;

// Returns the exchange-rate URL selected by the user.
// If no custom URL exists, the default URL is returned.
function getExchangeRatesUrl() {
    const savedUrl = localStorage.getItem(
        EXCHANGE_RATES_URL_KEY
    );

    if (
        savedUrl !== null &&
        savedUrl.trim() !== ''
    ) {
        return savedUrl.trim();
    }

    return DEFAULT_EXCHANGE_RATES_URL;
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
            EXCHANGE_RATES_URL_KEY
        );

        return;
    }

    localStorage.setItem(
        EXCHANGE_RATES_URL_KEY,
        cleanedUrl
    );
}

// Removes the custom exchange-rate URL.
function resetExchangeRatesUrl() {
    localStorage.removeItem(
        EXCHANGE_RATES_URL_KEY
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

    SUPPORTED_CURRENCIES.forEach((currency) => {
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

// Fetches exchange rates from the currently configured URL
// and updates the in-memory rates in db.js.
async function refreshExchangeRates() {
    const url = getExchangeRatesUrl();

    const exchangeRates =
        await fetchExchangeRatesFromUrl(url);

    db.setExchangeRates(exchangeRates);

    return exchangeRates;
}

// Waits for db.js to finish loading the default rates.
async function waitForDefaultExchangeRates() {
    const startTime = Date.now();

    while (!db.areExchangeRatesLoaded()) {
        if (
            Date.now() - startTime >=
            INITIAL_RATES_TIMEOUT
        ) {
            throw new Error(
                'Unable to load the default exchange rates.'
            );
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
    }
}

// Initializes the exchange-rate system.
async function initializeExchangeRates() {
    const savedUrl = localStorage.getItem(
        EXCHANGE_RATES_URL_KEY
    );

    // A custom URL must be loaded immediately.
    if (
        savedUrl !== null &&
        savedUrl.trim() !== ''
    ) {
        await refreshExchangeRates();
        return;
    }

    // db.js handles the default URL when no custom URL exists.
    await waitForDefaultExchangeRates();
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
        EXCHANGE_RATES_REFRESH_INTERVAL
    );
}

// Converts an amount from one currency to another.
function convertCurrency(
    amount,
    originalCurrency,
    targetCurrency,
    exchangeRates
) {
    if (
        !SUPPORTED_CURRENCIES.includes(originalCurrency) ||
        !SUPPORTED_CURRENCIES.includes(targetCurrency)
    ) {
        throw new Error(
            'Unsupported currency.'
        );
    }

    if (
        typeof amount !== 'number' ||
        !Number.isFinite(amount)
    ) {
        throw new Error(
            'Amount must be a valid number.'
        );
    }

    if (originalCurrency === targetCurrency) {
        return amount;
    }

    // Convert the original currency to USD.
    const amountInUSD =
        amount /
        exchangeRates[originalCurrency];

    // Convert USD to the requested currency.
    return (
        amountInUSD *
        exchangeRates[targetCurrency]
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