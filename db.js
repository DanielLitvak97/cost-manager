(function () {
    "use strict";

    // The main object that will be exposed globally as "db".
    const db = {};

    // The currently opened database.
    let currentDatabase = null;

    // Creates a unique localStorage key for the selected database.
    function getStorageKey(databaseName) {
        return "cost-manager-" + databaseName;
    }

    // Returns the stored database object.
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
            // If the stored data is invalid, start with an empty database.
            return {
                name: database.name,
                version: database.version,
                costs: []
            };
        }
    }

    // Saves the database object into localStorage.
    function saveDatabase(database, data) {
        const storageKey = getStorageKey(database.name);
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    // Validates a cost object before adding it to the database.
    function validateCost(cost) {
        if (cost === null || typeof cost !== "object") {
            throw new Error("Cost must be an object.");
        }

        if (typeof cost.sum !== "number" || !Number.isFinite(cost.sum)) {
            throw new Error("Cost sum must be a number.");
        }

        if (typeof cost.currency !== "string" || cost.currency.trim() === "") {
            throw new Error("Cost currency must be a non-empty string.");
        }

        if (typeof cost.category !== "string" || cost.category.trim() === "") {
            throw new Error("Cost category must be a non-empty string.");
        }

        if (typeof cost.description !== "string") {
            throw new Error("Cost description must be a string.");
        }
    }

    // Returns the current date in the format required by the application.
    function createCostDate() {
        const currentDate = new Date();

        return {
            day: currentDate.getDate(),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        };
    }

    // Converts a stored date object into a JavaScript Date object.
    function createJavaScriptDate(dateObject) {
        return new Date(
            dateObject.year,
            dateObject.month - 1,
            dateObject.day
        );
    }

    // Converts a cost from its original currency into the requested currency.
    function convertCost(sum, originalCurrency, requestedCurrency, exchangeRates) {
        if (originalCurrency === requestedCurrency) {
            return sum;
        }

        if (
            !Object.prototype.hasOwnProperty.call(exchangeRates, originalCurrency) ||
            !Object.prototype.hasOwnProperty.call(exchangeRates, requestedCurrency)
        ) {
            throw new Error("Missing exchange rate for one of the currencies.");
        }

        // The exchange-rate JSON defines how many units of each currency equal one USD.
        // Therefore, we first convert the original currency to USD.
        const sumInUSD = sum / exchangeRates[originalCurrency];

        // Then we convert USD to the requested currency.
        return sumInUSD * exchangeRates[requestedCurrency];
    }

    // Returns the default exchange rates used by the database library.
    // The complete application will retrieve these rates from a server.
    function getDefaultExchangeRates() {
        return {
            USD: 1,
            GBP: 0.6,
            EURO: 0.7,
            ILS: 3.4
        };
    }

    // Creates the detailed monthly report.
    function createReport(currency, year, month) {
        const databaseData = loadDatabase(currentDatabase);

        const currentDate = new Date();

        // If year or month was not supplied, use the current year/month.
        const requestedYear =
            typeof year === "number"
                ? year
                : currentDate.getFullYear();

        const requestedMonth =
            typeof month === "number"
                ? month
                : currentDate.getMonth() + 1;

        const requestedCurrency =
            typeof currency === "string" && currency.trim() !== ""
                ? currency
                : "USD";

        const exchangeRates = getDefaultExchangeRates();

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

                const reportCost = {
                    sum: cost.sum,
                    currency: cost.currency,
                    category: cost.category,
                    description: cost.description,
                    date: {
                        day: cost.date.day
                    }
                };

                reportCosts.push(reportCost);
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

    /*
     * Opens a cost database.
     *
     * The database itself is represented by an object stored in localStorage.
     */
    db.openCostsDB = function (databaseName, databaseVersion) {
        if (typeof databaseName !== "string" || databaseName.trim() === "") {
            throw new Error("Database name must be a non-empty string.");
        }

        if (
            typeof databaseVersion !== "number" ||
            !Number.isFinite(databaseVersion)
        ) {
            throw new Error("Database version must be a number.");
        }

        currentDatabase = {
            name: databaseName,
            version: databaseVersion
        };

        const databaseData = loadDatabase(currentDatabase);

        // Update the stored version if a newer version is supplied.
        if (databaseData.version !== databaseVersion) {
            databaseData.version = databaseVersion;
            saveDatabase(currentDatabase, databaseData);
        } else if (localStorage.getItem(getStorageKey(databaseName)) === null) {
            saveDatabase(currentDatabase, databaseData);
        }

        // This object represents the opened database.
        const databaseObject = {};

        /*
         * Adds a new cost item to the currently opened database.
         */
        databaseObject.addCost = function (cost) {
            if (currentDatabase === null) {
                throw new Error("No database is currently open.");
            }

            validateCost(cost);

            const databaseData = loadDatabase(currentDatabase);

            const newCost = {
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: createCostDate()
            };

            databaseData.costs.push(newCost);

            saveDatabase(currentDatabase, databaseData);

            // Return the object requested by the specification.
            return {
                sum: newCost.sum,
                currency: newCost.currency,
                category: newCost.category,
                description: newCost.description
            };
        };

        /*
         * Allows getReport() to also be called through the opened database object.
         */
        databaseObject.getReport = function (currency, year, month) {
            return createReport(currency, year, month);
        };

        return databaseObject;
    };

    /*
     * Adds a cost directly through the currently opened database.
     *
     * The assignment's main example uses:
     * const ob = db.openCostsDB(...);
     * ob.addCost(...);
     *
     * This additional function makes the library more flexible.
     */
    db.addCost = function (cost) {
        if (currentDatabase === null) {
            throw new Error("No database is currently open.");
        }

        validateCost(cost);

        const databaseData = loadDatabase(currentDatabase);

        const newCost = {
            sum: cost.sum,
            currency: cost.currency,
            category: cost.category,
            description: cost.description,
            date: createCostDate()
        };

        databaseData.costs.push(newCost);

        saveDatabase(currentDatabase, databaseData);

        return {
            sum: newCost.sum,
            currency: newCost.currency,
            category: newCost.category,
            description: newCost.description
        };
    };

    /*
     * Returns a detailed report for a specific month and year.
     *
     * If year and month are omitted, the current month and year are used.
     */
    db.getReport = function (currency, year, month) {
        if (currentDatabase === null) {
            throw new Error("No database is currently open.");
        }

        return createReport(currency, year, month);
    };

    /*
     * Expose the database library globally.
     *
     * This allows an HTML file to use:
     * db.openCostsDB(...)
     */
    window.db = db;
})();