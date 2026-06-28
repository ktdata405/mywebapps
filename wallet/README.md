# Wallet Module

This module stores wallet data in Google Sheets through Google Apps Script.

## Features

- Owner/folder selection:
  - Kalyan
  - Latha
  - Anshika
  - Amma
  - Dad
  - Chinnu
  - Arshika
  - Kartheek
  - Srikanth
  - Common Family
- Save types:
  - Text credentials
  - ID card numbers
  - Card numbers + CVV
- Report page with owner/type/search filters
- No localStorage usage for wallet data

## Files

- `wallet.html`: add wallet records
- `walletreport.html`: view/filter/delete wallet records from sheet
- `wallet_google_apps_script.js`: sample backend Apps Script
- `manifest.json`: PWA manifest

## Setup

1. Open Google Apps Script and paste code from `wallet_google_apps_script.js`.
2. Deploy as web app with access set to users who can access your sheet.
3. Copy the deployed web app URL.
4. Set `CONFIG.GOOGLE_SHEET_URL_WALLET` in `../config.js`.
5. Open `wallet/wallet.html` and `wallet/walletreport.html`.

## Expected API actions

- `action=addWalletEntry`
- `action=listWalletEntries`
- `action=deleteWalletEntry&id=<row-id>`

