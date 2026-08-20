"use strict";

// Open the application's database.
const reportDatabase = db.openCostsDB("costsdb", 1);

// Get references to the report form elements.
const reportForm = document.getElementById("reportForm");
const reportYear = document.getElementById("reportYear");
const reportMonth = document.getElementById("reportMonth");
const reportCurrency = document.getElementById("reportCurrency");

// Get references to the report result elements.
const reportMessage = document.getElementById("reportMessage");
const reportPeriod = document.getElementById("reportPeriod");
const reportTotal = document.getElementById("reportTotal");
const reportTableBody = document.getElementById("reportTableBody");
const noReportCosts = document.getElementById("noReportCosts");

// Get today's date.
const currentDate = new Date();

// Set the current year as the default report year.
reportYear.value = currentDate.getFullYear();

// Set the current month as the default report month.
reportMonth.value = currentDate.getMonth() + 1;

// Displays a message to the user.
function showReportMessage(message, type) {
    reportMessage.textContent = message;
    reportMessage.className = "message " + type;
}

// Returns the name of a month.
function getMonthName(monthNumber) {
    const monthNames = [
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

    return monthNames[monthNumber - 1];
}

// Creates a table row for one report cost.
function createReportRow(cost) {
    const row = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = String(cost.date.day).padStart(2, "0");

    const sumCell = document.createElement("td");
    sumCell.textContent = cost.sum.toFixed(2);

    const currencyCell = document.createElement("td");
    currencyCell.textContent = cost.currency;

    const categoryCell = document.createElement("td");
    categoryCell.textContent = cost.category;

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = cost.description;

    row.appendChild(dayCell);
    row.appendChild(sumCell);
    row.appendChild(currencyCell);
    row.appendChild(categoryCell);
    row.appendChild(descriptionCell);

    return row;
}

// Gets all costs through the database library.
function getStoredCosts() {
    return reportDatabase.getAllCosts();
}

// Creates the report using the latest exchange rates.
function createCurrencyReport(currency, year, month, exchangeRates) {
    const storedCosts = getStoredCosts();

    const reportCosts = [];
    let total = 0;

    storedCosts.forEach(function (cost) {
        if (
            cost.date.year === year &&
            cost.date.month === month
        ) {
            reportCosts.push({
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: {
                    day: cost.date.day
                }
            });

            total += convertCurrency(
                cost.sum,
                cost.currency,
                currency,
                exchangeRates
            );
        }
    });

    return {
        year: year,
        month: month,
        costs: reportCosts,
        total: {
            currency: currency,
            sum: total
        }
    };
}

// Displays the report returned by the application.
function displayReport(report) {
    reportTableBody.innerHTML = "";

    reportPeriod.textContent =
        getMonthName(report.month) +
        " " +
        report.year;

    reportTotal.textContent =
        report.total.sum.toFixed(2) +
        " " +
        report.total.currency;

    if (report.costs.length === 0) {
        noReportCosts.style.display = "block";
        return;
    }

    noReportCosts.style.display = "none";

    report.costs.forEach(function (cost) {
        const row = createReportRow(cost);

        reportTableBody.appendChild(row);
    });
}

// Gets the report requested by the user.
async function getReport() {
    const year = Number(reportYear.value);
    const month = Number(reportMonth.value);
    const currency = reportCurrency.value;

    // Validate that the year is a positive four-digit-or-fewer whole number.
    if (
        !Number.isInteger(year) ||
        year < 1 ||
        year > 9999
    ) {
        showReportMessage(
            "Year must be a whole number between 1 and 9999.",
            "error"
        );

        reportYear.focus();
        return;
    }

    try {
        showReportMessage(
            "Loading exchange rates...",
            ""
        );

        // Retrieve the latest rates from the server.
        const exchangeRates = await fetchExchangeRates();

        const report = createCurrencyReport(
            currency,
            year,
            month,
            exchangeRates
        );

        displayReport(report);

        showReportMessage(
            "Report generated successfully.",
            "success"
        );
    } catch (exception) {
        showReportMessage(
            exception.message,
            "error"
        );
    }
}

// Handle report form submission.
reportForm.addEventListener("submit", function (event) {
    event.preventDefault();

    getReport();
});

// Generate the current month's report when the page loads.
getReport();