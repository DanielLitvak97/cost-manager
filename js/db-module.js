"use strict";

// Stores the currently opened database.
let currentDatabase = null;

// Stores the exchange rates currently cached in memory.
let currentExchangeRates = null;

// Indicates whether exchange rates have been loaded.
let exchangeRatesLoaded = false;

// Creates a unique localStorage key for a database.
function getStorageKey(databaseName) {
    return "cost-manager-" + databaseName;
}

// Loads the database from localStorage.
function loadDatabase(database) {
    const storageKey = getStorageKey(database.name);
    const storedData = localStorage.getItem(storageKey);

    if (storedData === null) {
        return {
            name: database.name,
            version: database.version,
            costs: []
        };
    }

    try {
        const parsedData = JSON.parse(storedData);

        if (!Array.isArray(parsedData.costs)) {
            parsedData.costs = [];
        }

        return parsedData;
    } catch (exception) {
        // If the stored data is invalid, create an empty database.
        return {
            name: database.name,
            version: database.version,
            costs: []
        };
    }
}

// Saves the database to localStorage.
function saveDatabase(database, data) {
    const storageKey = getStorageKey(database.name);

    localStorage.setItem(
        storageKey,
        JSON.stringify(data)
    );
}

// Validates a cost before it is added.
function validateCost(cost) {
    if (cost === null || typeof cost !== "object") {
        throw new Error("Cost must be an object.");
    }

    if (
        typeof cost.sum !== "number" ||
        !Number.isFinite(cost.sum)
    ) {
        throw new Error("Cost sum must be a finite number.");
    }

    // Costs must be greater than zero.
    if (cost.sum <= 0) {
        throw new Error(
            "Cost sum must be greater than zero."
        );
    }

    // The application supports exactly four currencies.
    const supportedCurrencies = [
        "USD",
        "ILS",
        "GBP",
        "EURO"
    ];

    if (
        typeof cost.currency !== "string" ||
        !supportedCurrencies.includes(cost.currency)
    ) {
        throw new Error(
            "Currency must be USD, ILS, GBP, or EURO."
        );
    }

    if (
        typeof cost.category !== "string" ||
        cost.category.trim() === ""
    ) {
        throw new Error(
            "Cost category must be a non-empty string."
        );
    }

    if (
        typeof cost.description !== "string" ||
        cost.description.trim() === ""
    ) {
        throw new Error(
            "Cost description must be a non-empty string."
        );
    }
}

// Creates the date object stored with every cost.
function createCostDate() {
    const currentDate = new Date();

    return {
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
    };
}

// Validates exchange-rate data.
function validateExchangeRates(exchangeRates) {
    if (
        exchangeRates === null ||
        typeof exchangeRates !== "object" ||
        Array.isArray(exchangeRates)
    ) {
        throw new Error("Invalid exchange-rate data.");
    }

    const supportedCurrencies = [
        "USD",
        "ILS",
        "GBP",
        "EURO"
    ];

    supportedCurrencies.forEach(function (currency) {
        if (
            typeof exchangeRates[currency] !== "number" ||
            !Number.isFinite(exchangeRates[currency]) ||
            exchangeRates[currency] <= 0
        ) {
            throw new Error(
                "Missing or invalid exchange rate for " +
                currency +
                "."
            );
        }
    });
}

// Stores validated exchange rates in memory.
function setExchangeRates(exchangeRates) {
    validateExchangeRates(exchangeRates);

    currentExchangeRates = {
        USD: exchangeRates.USD,
        ILS: exchangeRates.ILS,
        GBP: exchangeRates.GBP,
        EURO: exchangeRates.EURO
    };

    exchangeRatesLoaded = true;
}

// Returns the currently cached exchange rates.
function getExchangeRates() {
    if (!exchangeRatesLoaded) {
        throw new Error(
            "Exchange rates are not loaded yet."
        );
    }

    return {
        USD: currentExchangeRates.USD,
        ILS: currentExchangeRates.ILS,
        GBP: currentExchangeRates.GBP,
        EURO: currentExchangeRates.EURO
    };
}

// Converts a cost between currencies.
function convertCost(
    sum,
    originalCurrency,
    requestedCurrency,
    exchangeRates
) {
    if (originalCurrency === requestedCurrency) {
        return sum;
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            exchangeRates,
            originalCurrency
        ) ||
        !Object.prototype.hasOwnProperty.call(
            exchangeRates,
            requestedCurrency
        )
    ) {
        throw new Error(
            "Missing exchange rate for one of the currencies."
        );
    }

    // Convert the original currency to USD.
    const sumInUSD =
        sum / exchangeRates[originalCurrency];

    // Convert USD to the requested currency.
    return (
        sumInUSD *
        exchangeRates[requestedCurrency]
    );
}

// Creates a monthly report synchronously.
function createReport(currency, year, month) {
    const databaseData = loadDatabase(currentDatabase);

    const currentDate = new Date();

    // Use the current year if no year was supplied.
    const requestedYear =
        typeof year === "number"
            ? year
            : currentDate.getFullYear();

    // Use the current month if no month was supplied.
    const requestedMonth =
        typeof month === "number"
            ? month
            : currentDate.getMonth() + 1;

    // Use USD when no currency was supplied.
    const requestedCurrency =
        typeof currency === "string" &&
        currency.trim() !== ""
            ? currency
            : "USD";

    // getReport() remains synchronous.
    const exchangeRates = getExchangeRates();

    const reportCosts = [];
    let total = 0;

    databaseData.costs.forEach(function (cost) {
        if (
            cost.date.year === requestedYear &&
            cost.date.month === requestedMonth
        ) {
            const convertedSum = convertCost(
                cost.sum,
                cost.currency,
                requestedCurrency,
                exchangeRates
            );

            reportCosts.push({
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: {
                    day: cost.date.day
                }
            });

            total += convertedSum;
        }
    });

    return {
        year: requestedYear,
        month: requestedMonth,
        costs: reportCosts,
        total: {
            currency: requestedCurrency,
            sum: total
        }
    };
}

// Opens a cost database.
function openCostsDB(
    databaseName,
    databaseVersion
) {
    if (
        typeof databaseName !== "string" ||
        databaseName.trim() === ""
    ) {
        throw new Error(
            "Database name must be a non-empty string."
        );
    }

    if (
        typeof databaseVersion !== "number" ||
        !Number.isFinite(databaseVersion)
    ) {
        throw new Error(
            "Database version must be a number."
        );
    }

    currentDatabase = {
        name: databaseName,
        version: databaseVersion
    };

    const databaseData =
        loadDatabase(currentDatabase);

    // Update the database version when necessary.
    if (
        databaseData.version !== databaseVersion
    ) {
        databaseData.version =
            databaseVersion;

        saveDatabase(
            currentDatabase,
            databaseData
        );
    } else if (
        localStorage.getItem(
            getStorageKey(databaseName)
        ) === null
    ) {
        saveDatabase(
            currentDatabase,
            databaseData
        );
    }

    // Return an object representing the opened database.
    return {
        addCost: function (cost) {
            validateCost(cost);

            const data =
                loadDatabase(currentDatabase);

            const newCost = {
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: createCostDate()
            };

            data.costs.push(newCost);

            saveDatabase(
                currentDatabase,
                data
            );

            return {
                sum: newCost.sum,
                currency: newCost.currency,
                category: newCost.category,
                description: newCost.description
            };
        },

        getReport: function (
            currency,
            year,
            month
        ) {
            return createReport(
                currency,
                year,
                month
            );
        },

        getAllCosts: function () {
            const data =
                loadDatabase(currentDatabase);

            return data.costs;
        }
    };
}

// Adds a cost using the currently opened database.
function addCost(cost) {
    if (currentDatabase === null) {
        throw new Error(
            "No database is currently open."
        );
    }

    return openCostsDB(
        currentDatabase.name,
        currentDatabase.version
    ).addCost(cost);
}

// Gets a report from the currently opened database.
function getReport(
    currency,
    year,
    month
) {
    if (currentDatabase === null) {
        throw new Error(
            "No database is currently open."
        );
    }

    return createReport(
        currency,
        year,
        month
    );
}

// Exports the database functions for module usage.
export {
    openCostsDB,
    addCost,
    getReport,
    setExchangeRates,
    getExchangeRates
};