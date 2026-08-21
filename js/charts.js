"use strict";

// Get the current date for the initial chart selections.
const currentDate = new Date();

// Store the current year.
const currentYear = currentDate.getFullYear();

// Store the current month using the application's 1-12 format.
const currentMonth = currentDate.getMonth() + 1;

// Open the application's database.
const chartsDatabase = db.openCostsDB("costsdb", 1);

// Store references to the pie chart form elements.
const pieChartForm = document.getElementById("pieChartForm");
const pieYearInput = document.getElementById("pieYear");
const pieMonthInput = document.getElementById("pieMonth");
const pieCurrencyInput = document.getElementById("pieCurrency");
const pieChartMessage = document.getElementById("pieChartMessage");

// Store references to the bar chart form elements.
const barChartForm = document.getElementById("barChartForm");
const barYearInput = document.getElementById("barYear");
const barCurrencyInput = document.getElementById("barCurrency");
const barChartMessage = document.getElementById("barChartMessage");

// Store the currently displayed charts.
let pieChart = null;
let barChart = null;

// Set the initial values for the forms.
pieYearInput.value = currentYear;
pieMonthInput.value = currentMonth;
barYearInput.value = currentYear;

// Display a message for the pie chart.
function showPieChartMessage(message, type) {
    pieChartMessage.textContent = message;
    pieChartMessage.className = "message " + type;
}

// Display a message for the bar chart.
function showBarChartMessage(message, type) {
    barChartMessage.textContent = message;
    barChartMessage.className = "message " + type;
}

// Validates a year entered by the user.
function validateYear(year) {
    return (
        Number.isInteger(year) &&
        year >= 1 &&
        year <= 9999
    );
}

// Get all stored costs through the database library.
function getAllStoredCosts() {
    return chartsDatabase.getAllCosts();
}

// Returns costs belonging to the requested month and year.
function getCostsForMonth(costs, year, month) {
    return costs.filter(function (cost) {
        return (
            cost.date.year === year &&
            cost.date.month === month
        );
    });
}

// Returns costs belonging to the requested year.
function getCostsForYear(costs, year) {
    return costs.filter(function (cost) {
        return cost.date.year === year;
    });
}

// Converts a cost into the requested currency using cached rates.
function convertCost(cost, targetCurrency, exchangeRates) {
    if (
        !SUPPORTED_CURRENCIES.includes(cost.currency) ||
        !SUPPORTED_CURRENCIES.includes(targetCurrency)
    ) {
        throw new Error("Unsupported currency.");
    }

    if (
        typeof cost.sum !== "number" ||
        !Number.isFinite(cost.sum)
    ) {
        throw new Error("Cost sum must be a valid number.");
    }

    // Convert the original currency to USD.
    const costInUsd =
        cost.sum / exchangeRates[cost.currency];

    // Convert USD to the requested currency.
    return costInUsd * exchangeRates[targetCurrency];
}

// Creates converted totals grouped by category.
function createCategoryTotals(
    costs,
    targetCurrency,
    exchangeRates
) {
    const categoryTotals = Object.create(null);

    costs.forEach(function (cost) {
        const convertedAmount = convertCost(
            cost,
            targetCurrency,
            exchangeRates
        );

        if (categoryTotals[cost.category] === undefined) {
            categoryTotals[cost.category] = 0;
        }

        categoryTotals[cost.category] += convertedAmount;
    });

    return categoryTotals;
}

// Creates totals for each month of a specific year.
function createMonthlyTotals(
    costs,
    year,
    targetCurrency,
    exchangeRates
) {
    const monthlyTotals = Array(12).fill(0);

    costs.forEach(function (cost) {
        if (cost.date.year !== year) {
            return;
        }

        const monthIndex = cost.date.month - 1;

        monthlyTotals[monthIndex] += convertCost(
            cost,
            targetCurrency,
            exchangeRates
        );
    });

    return monthlyTotals;
}

// Creates or updates the pie chart.
function createPieChart(categoryTotals, currency) {
    const labels = Object.keys(categoryTotals);

    const values = labels.map(function (category) {
        return categoryTotals[category];
    });

    const canvas = document.getElementById("pieChart");

    if (pieChart !== null) {
        pieChart.destroy();
    }

    pieChart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Costs",
                    data: values
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                },
                title: {
                    display: true,
                    text: "Costs by Category (" + currency + ")"
                }
            }
        }
    });
}

// Creates or updates the bar chart.
function createBarChart(
    monthlyTotals,
    currency,
    year
) {
    const labels = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    const canvas = document.getElementById("barChart");

    if (barChart !== null) {
        barChart.destroy();
    }

    barChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: currency,
                    data: monthlyTotals
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text:
                        "Monthly Costs for " +
                        year +
                        " (" +
                        currency +
                        ")"
                }
            }
        }
    });
}

// Generates the pie chart using the cached exchange rates.
function generatePieChart() {
    const year = Number(pieYearInput.value);
    const month = Number(pieMonthInput.value);
    const currency = pieCurrencyInput.value;

    // Validate the selected year.
    if (!validateYear(year)) {
        showPieChartMessage(
            "Year must be a whole number between 1 and 9999.",
            "error"
        );

        pieYearInput.focus();
        return;
    }

    try {
        // Get the exchange rates already loaded into memory.
        const exchangeRates =
            db.getExchangeRates();

        const costs = getAllStoredCosts();

        const monthlyCosts = getCostsForMonth(
            costs,
            year,
            month
        );

        if (monthlyCosts.length === 0) {
            showPieChartMessage(
                "There are no costs for the selected month.",
                "error"
            );

            if (pieChart !== null) {
                pieChart.destroy();
                pieChart = null;
            }

            return;
        }

        const categoryTotals =
            createCategoryTotals(
                monthlyCosts,
                currency,
                exchangeRates
            );

        createPieChart(
            categoryTotals,
            currency
        );

        showPieChartMessage(
            "Pie chart generated successfully.",
            "success"
        );
    } catch (exception) {
        showPieChartMessage(
            exception.message,
            "error"
        );
    }
}

// Generates the bar chart using the cached exchange rates.
function generateBarChart() {
    const year = Number(barYearInput.value);
    const currency = barCurrencyInput.value;

    // Validate the selected year.
    if (!validateYear(year)) {
        showBarChartMessage(
            "Year must be a whole number between 1 and 9999.",
            "error"
        );

        barYearInput.focus();
        return;
    }

    try {
        // Get the exchange rates already loaded into memory.
        const exchangeRates =
            db.getExchangeRates();

        const costs = getAllStoredCosts();

        const yearlyCosts = getCostsForYear(
            costs,
            year
        );

        if (yearlyCosts.length === 0) {
            showBarChartMessage(
                "There are no costs for the selected year.",
                "error"
            );

            if (barChart !== null) {
                barChart.destroy();
                barChart = null;
            }

            return;
        }

        const monthlyTotals =
            createMonthlyTotals(
                yearlyCosts,
                year,
                currency,
                exchangeRates
            );

        createBarChart(
            monthlyTotals,
            currency,
            year
        );

        showBarChartMessage(
            "Bar chart generated successfully.",
            "success"
        );
    } catch (exception) {
        showBarChartMessage(
            exception.message,
            "error"
        );
    }
}

// Handle the pie chart form.
pieChartForm.addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        // Wait for the initial exchange-rate loading.
        exchangeRatesReady
            .then(function () {
                generatePieChart();
            })
            .catch(function (exception) {
                showPieChartMessage(
                    "Unable to load exchange rates: " +
                    exception.message,
                    "error"
                );
            });
    }
);

// Handle the bar chart form.
barChartForm.addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        // Wait for the initial exchange-rate loading.
        exchangeRatesReady
            .then(function () {
                generateBarChart();
            })
            .catch(function (exception) {
                showBarChartMessage(
                    "Unable to load exchange rates: " +
                    exception.message,
                    "error"
                );
            });
    }
);