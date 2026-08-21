'use strict';

// Open the application's database.
const reportDatabase = db.openCostsDB('costsdb', 1);

// Get references to the report form elements.
const reportForm = document.getElementById('reportForm');
const reportYear = document.getElementById('reportYear');
const reportMonth = document.getElementById('reportMonth');
const reportCurrency = document.getElementById('reportCurrency');

// Get references to the report result elements.
const reportMessage = document.getElementById('reportMessage');
const reportPeriod = document.getElementById('reportPeriod');
const reportTotal = document.getElementById('reportTotal');
const reportTableBody = document.getElementById('reportTableBody');
const noReportCosts = document.getElementById('noReportCosts');

// Get today's date.
const currentDate = new Date();

// Set the current year as the default report year.
reportYear.value = currentDate.getFullYear();

// Set the current month as the default report month.
reportMonth.value = currentDate.getMonth() + 1;

// Displays a message to the user.
function showReportMessage(message, type) {
    reportMessage.textContent = message;
    reportMessage.className = 'message ' + type;
}

// Returns the name of a month.
function getMonthName(monthNumber) {
    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    return monthNames[monthNumber - 1];
}

// Creates a table row for one report cost.
function createReportRow(cost) {
    const row = document.createElement('tr');

    const dayCell = document.createElement('td');
    dayCell.textContent =
        String(cost.date.day).padStart(2, '0');

    const sumCell = document.createElement('td');
    sumCell.textContent = cost.sum;

    const currencyCell = document.createElement('td');
    currencyCell.textContent = cost.currency;

    const categoryCell = document.createElement('td');
    categoryCell.textContent = cost.category;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = cost.description;

    row.appendChild(dayCell);
    row.appendChild(sumCell);
    row.appendChild(currencyCell);
    row.appendChild(categoryCell);
    row.appendChild(descriptionCell);

    return row;
}

// Displays the report returned by the database library.
function displayReport(report) {
    reportTableBody.innerHTML = '';

    reportPeriod.textContent =
        `${getMonthName(report.month)} ${report.year}`;

    reportTotal.textContent =
        `${report.total.sum.toFixed(2)} ${report.total.currency}`;

    if (report.costs.length === 0) {
        noReportCosts.style.display = 'block';
        return;
    }

    noReportCosts.style.display = 'none';

    report.costs.forEach((cost) => {
        const row = createReportRow(cost);
        reportTableBody.appendChild(row);
    });
}

// Validates the selected year.
function validateReportYear(year) {
    return (
        Number.isInteger(year) &&
        year >= 1 &&
        year <= 9999
    );
}

// Gets the report using the synchronous db.getReport().
function getReport() {
    const year = Number(reportYear.value);
    const month = Number(reportMonth.value);
    const currency = reportCurrency.value;

    // Validate the selected year.
    if (!validateReportYear(year)) {
        showReportMessage(
            'Year must be a whole number between 1 and 9999.',
            'error'
        );

        reportYear.focus();
        return;
    }

    try {
        // getReport() is intentionally synchronous.
        const report = reportDatabase.getReport(
            currency,
            year,
            month
        );

        displayReport(report);

        showReportMessage(
            'Report generated successfully.',
            'success'
        );
    } catch (exception) {
        showReportMessage(
            exception.message,
            'error'
        );
    }
}

// Handle report form submission.
reportForm.addEventListener(
    'submit',
    (event) => {
        event.preventDefault();

        getReport();
    }
);

// Wait for the initial exchange-rate loading.
async function initializeReport() {
    try {
        await exchangeRatesReady;

        getReport();
    } catch (exception) {
        showReportMessage(
            'Unable to load exchange rates: ' +
            exception.message,
            'error'
        );
    }
}

// Generate the current month's report after exchange rates are ready.
initializeReport();