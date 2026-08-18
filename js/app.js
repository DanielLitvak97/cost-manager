"use strict";

// Open the application's database.
const costsDatabase = db.openCostsDB("costsdb", 1);

// Get references to the HTML elements used by the application.
const costForm = document.getElementById("costForm");
const messageElement = document.getElementById("message");
const costsTableBody = document.getElementById("costsTableBody");
const noCostsMessage = document.getElementById("noCostsMessage");
const refreshButton = document.getElementById("refreshButton");

// Displays a message to the user.
function showMessage(message, type) {
    messageElement.textContent = message;
    messageElement.className = "message " + type;
}

// Formats a date object for displaying in the table.
function formatDate(date) {
    return (
        String(date.day).padStart(2, "0") +
        "/" +
        String(date.month).padStart(2, "0") +
        "/" +
        date.year
    );
}

// Creates one table row for a cost.
function createCostTableRow(cost) {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(cost.date);

    const sumCell = document.createElement("td");
    sumCell.textContent = cost.sum;

    const currencyCell = document.createElement("td");
    currencyCell.textContent = cost.currency;

    const categoryCell = document.createElement("td");
    categoryCell.textContent = cost.category;

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = cost.description;

    row.appendChild(dateCell);
    row.appendChild(sumCell);
    row.appendChild(currencyCell);
    row.appendChild(categoryCell);
    row.appendChild(descriptionCell);

    return row;
}

// Loads all saved costs from localStorage.
function loadCosts() {
    costsTableBody.innerHTML = "";

    const storageKey = "cost-manager-costsdb";
    const storedData = localStorage.getItem(storageKey);

    if (storedData === null) {
        noCostsMessage.style.display = "block";
        return;
    }

    let databaseData;

    try {
        databaseData = JSON.parse(storedData);
    } catch (exception) {
        noCostsMessage.style.display = "block";
        return;
    }

    if (
        !databaseData ||
        !Array.isArray(databaseData.costs) ||
        databaseData.costs.length === 0
    ) {
        noCostsMessage.style.display = "block";
        return;
    }

    noCostsMessage.style.display = "none";

    // Display newest costs first.
    const costs = [...databaseData.costs].reverse();

    costs.forEach(function (cost) {
        const row = createCostTableRow(cost);
        costsTableBody.appendChild(row);
    });
}

// Handles submission of the Add Cost form.
function handleCostSubmit(event) {
    event.preventDefault();

    const sumInput = document.getElementById("sum");
    const currencyInput = document.getElementById("currency");
    const categoryInput = document.getElementById("category");
    const descriptionInput = document.getElementById("description");

    const sumText = sumInput.value.trim();
    const sum = Number(sumText);
    const currency = currencyInput.value;
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();

    // Make sure a sum was entered.
    if (sumText === "") {
        showMessage("Please enter a cost amount.", "error");
        sumInput.focus();
        return;
    }

    // Make sure the sum is a valid number.
    if (!Number.isFinite(sum)) {
        showMessage("The cost amount must be a valid number.", "error");
        sumInput.focus();
        return;
    }

    // Costs cannot be zero or negative.
    if (sum <= 0) {
        showMessage("The cost amount must be greater than zero.", "error");
        sumInput.focus();
        return;
    }

    // Prevent unrealistically large cost values.
    if (sum > 1000000000) {
        showMessage(
            "The cost amount cannot be greater than 1,000,000,000.",
            "error"
        );
        sumInput.focus();
        return;
    }

    // Make sure the currency is one of the supported currencies.
    const supportedCurrencies = [
        "USD",
        "ILS",
        "GBP",
        "EURO"
    ];

    if (!supportedCurrencies.includes(currency)) {
        showMessage("Please select a supported currency.", "error");
        currencyInput.focus();
        return;
    }

    // Make sure a category was entered.
    if (category === "") {
        showMessage("Please enter a category.", "error");
        categoryInput.focus();
        return;
    }

    // Categories may contain letters, numbers, spaces, hyphens and ampersands.
    const categoryPattern = /^[A-Za-z0-9]+(?:[ &-][A-Za-z0-9]+)*$/;

    if (!categoryPattern.test(category)) {
        showMessage(
            "Category may contain letters, numbers, spaces, hyphens and &.",
            "error"
        );
        categoryInput.focus();
        return;
    }

    // Make sure a description was entered.
    if (description === "") {
        showMessage("Please enter a description.", "error");
        descriptionInput.focus();
        return;
    }

    try {
        costsDatabase.addCost({
            sum: sum,
            currency: currency,
            category: category,
            description: description
        });

        showMessage("Cost added successfully.", "success");

        costForm.reset();

        // Restore USD as the default currency after resetting the form.
        currencyInput.value = "USD";

        loadCosts();
    } catch (exception) {
        showMessage(exception.message, "error");
    }
}

// Handle the Add Cost form.
costForm.addEventListener("submit", handleCostSubmit);

// Reload the costs when the refresh button is clicked.
refreshButton.addEventListener("click", loadCosts);

// Load existing costs when the page starts.
loadCosts();