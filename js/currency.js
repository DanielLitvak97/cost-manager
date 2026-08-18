"use strict";

// The currencies supported by the Cost Manager application.
const SUPPORTED_CURRENCIES = [
    "USD",
    "ILS",
    "GBP",
    "EURO"
];

// Default exchange-rate URL.
// We will replace this with the final deployed JSON URL later.
const DEFAULT_EXCHANGE_RATES_URL = "https://cost-manager-rates.onrender.com/exchange-rates.json";

// The localStorage key used to store the user's custom URL.
const EXCHANGE_RATES_URL_KEY = "cost-manager-exchange-rates-url";

// Returns the exchange-rate URL selected by the user.
// If no custom URL exists, the default URL is returned.
function getExchangeRatesUrl() {
    const savedUrl = localStorage.getItem(EXCHANGE_RATES_URL_KEY);

    if (savedUrl !== null && savedUrl.trim() !== "") {
        return savedUrl.trim();
    }

    return DEFAULT_EXCHANGE_RATES_URL;
}

// Saves a custom exchange-rate URL.
function saveExchangeRatesUrl(url) {
    if (typeof url !== "string") {
        throw new Error("Exchange-rate URL must be a string.");
    }

    const cleanedUrl = url.trim();

    if (cleanedUrl === "") {
        localStorage.removeItem(EXCHANGE_RATES_URL_KEY);
        return;
    }

    localStorage.setItem(EXCHANGE_RATES_URL_KEY, cleanedUrl);
}

// Removes the custom exchange-rate URL.
function resetExchangeRatesUrl() {
    localStorage.removeItem(EXCHANGE_RATES_URL_KEY);
}

// Validates the exchange-rate object received from the server.
function validateExchangeRates(exchangeRates) {
    if (
        exchangeRates === null ||
        typeof exchangeRates !== "object" ||
        Array.isArray(exchangeRates)
    ) {
        throw new Error("Invalid exchange-rate data.");
    }

    SUPPORTED_CURRENCIES.forEach(function (currency) {
        if (
            typeof exchangeRates[currency] !== "number" ||
            !Number.isFinite(exchangeRates[currency]) ||
            exchangeRates[currency] <= 0
        ) {
            throw new Error(
                "Missing or invalid exchange rate for " + currency + "."
            );
        }
    });
}

// Retrieves exchange rates from the configured server.
async function fetchExchangeRates() {
    const url = getExchangeRatesUrl();

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            "Unable to retrieve exchange rates. Server returned " +
            response.status +
            "."
        );
    }

    const exchangeRates = await response.json();

    validateExchangeRates(exchangeRates);

    return exchangeRates;
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
        throw new Error("Unsupported currency.");
    }

    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount)
    ) {
        throw new Error("Amount must be a valid number.");
    }

    if (originalCurrency === targetCurrency) {
        return amount;
    }

    // The server defines each rate as the amount of that currency
    // equivalent to one USD.
    const amountInUSD =
        amount / exchangeRates[originalCurrency];

    // Convert the USD amount into the requested currency.
    return amountInUSD * exchangeRates[targetCurrency];
}