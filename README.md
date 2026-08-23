# Cost Manager

Cost Manager is a client-side web application for managing personal costs, generating monthly reports, and displaying cost charts.

## Features

* Add and store cost items.
* View all saved costs.
* Generate detailed monthly reports.
* Generate pie charts by category.
* Generate yearly bar charts by month.
* Select the currency used for reports and charts.
* Configure a custom exchange-rate URL through the Settings page.
* Automatically refresh exchange rates periodically.
* Store costs and the configured exchange-rate URL in `localStorage`.

## Supported Currencies

The application supports:

* USD
* ILS
* GBP
* EURO

The original currency of every cost is preserved when the cost is stored.

## Exchange Rates

The application retrieves exchange rates asynchronously using the Fetch API.

The default exchange-rate source is:

`https://cost-manager-rates.onrender.com/exchange-rates.json`

The default exchange-rate JSON has the following structure:

```json
{
    "USD": 1,
    "GBP": 0.6,
    "EURO": 0.7,
    "ILS": 3.4
}
```

The rates represent the number of units of each currency equivalent to 1 USD.

For example:

* 3.4 ILS = 1 USD
* 0.7 EURO = 1 USD
* 0.6 GBP = 1 USD
* 1 USD = 1 USD

The user can configure a different exchange-rate URL through the Settings page. The configured URL is saved in `localStorage` so it remains available after refreshing or reopening the application.

Exchange rates are fetched immediately when the application initializes and are refreshed periodically.

## Database Library

The project contains two versions of the database library.

### Vanilla version

The root-level `db.js` is the Vanilla JavaScript version.

It exposes the global `db` object and provides:

* `db.openCostsDB()`
* `addCost()`
* `getReport()`
* `getAllCosts()`

The Vanilla version loads the default exchange rates asynchronously. If `getReport()` is called before the exchange rates have finished loading, an exception may be thrown.

### Module version

`js/db-module.js` is the ES module-compatible version of the database library.

It exports the database functions for use in module-based applications.

## Local Storage

The application stores its data in `localStorage`.

The main database key is:

`cost-manager-costsdb`

The configured exchange-rate URL is stored separately under:

`cost-manager-exchange-rates-url`

## Project Structure

```text
db.js
exchange-rates.json
index.html
report.html
charts.html
settings.html

css/
    style.css

js/
    app.js
    charts.js
    currency.js
    db-module.js
    report.js
    settings.js
```

## Running the Application

The application is a client-side web application.

Open `index.html` through a web server or the deployed application.

The application uses the deployed exchange-rate JSON file by default, so the user does not need to configure an exchange-rate URL.

## Reports

`getReport()` remains synchronous and uses exchange rates that have already been loaded and cached in memory.

The report contains:

* Year
* Month
* Costs
* Original currency of each cost
* Category
* Description
* Converted total in the requested currency

## Testing the Vanilla Library

The Vanilla `db.js` library can be tested using a simple HTML page that loads `db.js` and calls `db.openCostsDB()`.

The database stores costs in `localStorage` as JSON, including each cost's original currency and date.
