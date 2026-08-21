(function () {
    'use strict';

    // The main object exposed globally as "db".
    const db = {};

    // The currently opened database.
    let currentDatabase = null;

    // The exchange rates currently stored in memory.
    let currentExchangeRates = null;

    // Indicates whether exchange-rate loading has completed.
    let exchangeRatesLoaded = false;

    // The default exchange-rate URL used by the standalone Vanilla library.
    const DEFAULT_EXCHANGE_RATES_URL =
        'https://cost-manager-rates.onrender.com/exchange-rates.json';

    // The currencies supported by the application.
    const SUPPORTED_CURRENCIES = [
        'USD',
        'ILS',
        'GBP',
        'EURO'
    ];

    // Creates a unique localStorage key for the selected database.
    function getStorageKey(databaseName) {
        return `cost-manager-${databaseName}`;
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

        localStorage.setItem(
            storageKey,
            JSON.stringify(data)
        );
    }

    // Validates a cost object before adding it to the database.
    function validateCost(cost) {
        if (cost === null || typeof cost !== 'object') {
            throw new Error('Cost must be an object.');
        }

        if (
            typeof cost.sum !== 'number' ||
            !Number.isFinite(cost.sum)
        ) {
            throw new Error(
                'Cost sum must be a finite number.'
            );
        }

        // Costs must be greater than zero.
        if (cost.sum <= 0) {
            throw new Error(
                'Cost sum must be greater than zero.'
            );
        }

        if (
            typeof cost.currency !== 'string' ||
            !SUPPORTED_CURRENCIES.includes(cost.currency)
        ) {
            throw new Error(
                'Currency must be USD, ILS, GBP, or EURO.'
            );
        }

        if (
            typeof cost.category !== 'string' ||
            cost.category.trim() === ''
        ) {
            throw new Error(
                'Cost category must be a non-empty string.'
            );
        }

        if (
            typeof cost.description !== 'string' ||
            cost.description.trim() === ''
        ) {
            throw new Error(
                'Cost description must be a non-empty string.'
            );
        }
    }

    // Creates the date stored with every cost.
    function createCostDate() {
        const currentDate = new Date();

        return {
            day: currentDate.getDate(),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        };
    }

    // Validates exchange-rate data received from the server.
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

    // Loads the default exchange rates asynchronously.
    async function loadDefaultExchangeRates() {
        try {
            const response = await fetch(
                DEFAULT_EXCHANGE_RATES_URL,
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

            setExchangeRates(exchangeRates);
        } catch (exception) {
            // Leave exchangeRatesLoaded as false.
            console.error(
                'Unable to load default exchange rates:',
                exception.message
            );
        }
    }

    // Returns the exchange rates currently stored in memory.
    function getExchangeRates() {
        if (!exchangeRatesLoaded) {
            throw new Error(
                'Exchange rates are not loaded yet.'
            );
        }

        return {
            USD: currentExchangeRates.USD,
            ILS: currentExchangeRates.ILS,
            GBP: currentExchangeRates.GBP,
            EURO: currentExchangeRates.EURO
        };
    }

    // Converts a cost into the requested currency.
    function convertCost(
        sum,
        originalCurrency,
        requestedCurrency,
        exchangeRates
    ) {
        if (
            !SUPPORTED_CURRENCIES.includes(originalCurrency) ||
            !SUPPORTED_CURRENCIES.includes(requestedCurrency)
        ) {
            throw new Error(
                'Unsupported currency.'
            );
        }

        if (originalCurrency === requestedCurrency) {
            return sum;
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

    // Creates the detailed monthly report synchronously.
    function createReport(currency, year, month) {
        const databaseData =
            loadDatabase(currentDatabase);

        const currentDate = new Date();

        const requestedYear =
            typeof year === 'number'
                ? year
                : currentDate.getFullYear();

        const requestedMonth =
            typeof month === 'number'
                ? month
                : currentDate.getMonth() + 1;

        const requestedCurrency =
            typeof currency === 'string' &&
            currency.trim() !== ''
                ? currency
                : 'USD';

        // Validate the report currency.
        if (!SUPPORTED_CURRENCIES.includes(requestedCurrency)) {
            throw new Error(
                'Currency must be USD, ILS, GBP, or EURO.'
            );
        }

        // getReport() remains synchronous.
        const exchangeRates = getExchangeRates();

        const reportCosts = [];
        let total = 0;

        databaseData.costs.forEach((cost) => {
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
     * Opens a cost database and returns an object representing it.
     *
     * The returned object exposes addCost(), getReport(), and getAllCosts().
     */
    db.openCostsDB = function (
        databaseName,
        databaseVersion
    ) {
        if (
            typeof databaseName !== 'string' ||
            databaseName.trim() === ''
        ) {
            throw new Error(
                'Database name must be a non-empty string.'
            );
        }

        if (
            typeof databaseVersion !== 'number' ||
            !Number.isFinite(databaseVersion)
        ) {
            throw new Error(
                'Database version must be a number.'
            );
        }

        currentDatabase = {
            name: databaseName,
            version: databaseVersion
        };

        const databaseData =
            loadDatabase(currentDatabase);

        // Update the stored database version when necessary.
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

        // Creates the addCost method for the opened database.
        const addCostToDatabase = (cost) => {
            validateCost(cost);

            const databaseData =
                loadDatabase(currentDatabase);

            const newCost = {
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: createCostDate()
            };

            databaseData.costs.push(newCost);

            saveDatabase(
                currentDatabase,
                databaseData
            );

            return {
                sum: newCost.sum,
                currency: newCost.currency,
                category: newCost.category,
                description: newCost.description
            };
        };

        // Creates the synchronous getReport method for the opened database.
        const getDatabaseReport = (
            currency,
            year,
            month
        ) => {
            return createReport(
                currency,
                year,
                month
            );
        };

        // Creates the getAllCosts method for the opened database.
        const getAllCosts = () => {
            const databaseData =
                loadDatabase(currentDatabase);

            return databaseData.costs;
        };

        // Return an object representing the opened database.
        return {
            addCost: addCostToDatabase,
            getReport: getDatabaseReport,
            getAllCosts
        };
    };

    /*
     * Adds a cost through the currently opened database.
     *
     * This is an additional compatibility function.
     */
    db.addCost = function (cost) {
        if (currentDatabase === null) {
            throw new Error(
                'No database is currently open.'
            );
        }

        return db.openCostsDB(
            currentDatabase.name,
            currentDatabase.version
        ).addCost(cost);
    };

    /*
     * Returns a detailed report synchronously.
     *
     * The required API is ob.getReport().
     * This function is kept as an additional compatibility function.
     */
    db.getReport = function (
        currency,
        year,
        month
    ) {
        if (currentDatabase === null) {
            throw new Error(
                'No database is currently open.'
            );
        }

        return createReport(
            currency,
            year,
            month
        );
    };

    /*
     * Replaces the exchange rates stored in memory.
     *
     * The production application uses this function when
     * currency.js retrieves rates from its configured URL.
     */
    db.setExchangeRates = function (exchangeRates) {
        setExchangeRates(exchangeRates);
    };

    /*
     * Returns the currently cached exchange rates.
     */
    db.getExchangeRates = function () {
        return getExchangeRates();
    };

    /*
     * Indicates whether exchange rates have finished loading.
     */
    db.areExchangeRatesLoaded = function () {
        return exchangeRatesLoaded;
    };

    /*
     * Start loading the default exchange rates only when
     * no custom exchange-rate URL has been configured.
     *
     * The production application uses currency.js to load
     * a custom URL when one is configured.
     */
    const savedExchangeRatesUrl = localStorage.getItem(
        'cost-manager-exchange-rates-url'
    );

    if (
        savedExchangeRatesUrl === null ||
        savedExchangeRatesUrl.trim() === ''
    ) {
        loadDefaultExchangeRates();
    }

    // Expose the database library globally as required by the assignment.
    window.db = db;
})();