# Loan Management Application

This folder contains the source code for a simple Loan Management web application that uses Google Sheets as a backend database.

## Files

*   `loan.html`: The main entry form for adding new loans.
*   `loanreport.html`: A report page to view all existing loans.
*   `style.css`: CSS styles for both pages.
*   `script.js`: JavaScript logic to handle form submissions and data fetching.
*   `Code.gs`: Google Apps Script code to be deployed as a Web App.

## Setup Instructions

1.  **Create a Google Sheet:**
    *   Go to Google Sheets and create a new spreadsheet.
    *   Name it "Loan Database" (or any name you prefer).

2.  **Open Apps Script:**
    *   In the spreadsheet, go to **Extensions** > **Apps Script**.

3.  **Paste the Code:**
    *   Delete any existing code in the `Code.gs` file.
    *   Copy the contents of `Code.gs` from this folder and paste it into the script editor.

4.  **Save and Deploy:**
    *   Click the **Save** icon (floppy disk).
    *   Click **Deploy** > **New deployment**.
    *   **Select type:** Click the gear icon and select **Web app**.
    *   **Description:** Enter "Loan App v1".
    *   **Execute as:** Select **Me** (your email address).
    *   **Who has access:** Select **Anyone** (or "Anyone with Google account" if you want to restrict access). *Note: "Anyone" is easiest for testing without authentication issues.*
    *   Click **Deploy**.

5.  **Authorize Access:**
    *   You will be prompted to authorize the script to access your Google Sheet. Follow the prompts to allow access.

6.  **Get the Web App URL:**
    *   After deployment is successful, copy the **Web App URL**.

7.  **Update `script.js`:**
    *   Open `script.js` in this folder.
    *   Find the line `const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';`.
    *   Replace `'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'` with the URL you copied in the previous step.

8.  **Run the App:**
    *   Open `loan.html` in your web browser to add loans.
    *   Open `loanreport.html` to view the list of loans.

## Google Sheet Structure

The script will automatically create a sheet named "Loans" if it doesn't exist. The columns will be:

1.  **Date**: The date of the loan transaction.
2.  **Name**: The name of the person involved (Borrower/Lender).
3.  **Amount**: The loan amount.
4.  **Interest Rate**: The interest rate percentage.
5.  **Type**: "Given" (you lent money) or "Taken" (you borrowed money).
6.  **Remarks**: Optional notes about the loan.
7.  **Timestamp**: The exact time the record was added.

## Parameters for Google Sheet

When sending data to the Google Sheet via the Web App, the following parameters are expected in the JSON payload (for POST requests) or query parameters (for GET requests):

### POST (Adding a Loan)
*   `action`: Must be set to `'addLoan'`.
*   `date`: Date string (YYYY-MM-DD).
*   `name`: String.
*   `amount`: Number.
*   `interestRate`: Number.
*   `type`: String ("Given" or "Taken").
*   `remarks`: String (optional).

### GET (Fetching Loans)
*   `action`: Must be set to `'getLoans'`.
