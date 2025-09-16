QR Code Scanner Prototype
Overview
This is a React-based web application for scanning and decrypting QR codes, designed to verify equipment details. It supports QR code scanning via camera or image upload, decrypts the data, displays the result temporarily, and maintains a history of scans. The app uses Material-UI for styling and stores scan history in localStorage.
Features

Camera Scanning: Scans QR codes using the device’s rear camera (via qr-scanner).
File Upload: Uploads images containing QR codes for decoding.
Decryption: Decrypts QR code data using a provided decryptQRData function.
Result Display: Shows decrypted results in a Material-UI Paper for 5 seconds.
Scan History: Displays the latest scan by default, with a "Ver más" button to toggle all scans.
Persistent Storage: Saves scan history in localStorage.
Responsive UI: Built with Material-UI for a clean, user-friendly interface.
Error Handling: Displays errors for camera permissions, invalid QR codes, or decryption failures.

Prerequisites

Node.js: Version 14 or higher.
npm: Version 6 or higher.
Modern Browser: Chrome, Firefox, or Safari (HTTPS required for camera access).
Python: For generating test QR codes (optional, for testing).

Installation

Clone the Repository:
git clone <repository-url>
cd qr-code-scanner


Install Dependencies:
npm install

Key dependencies:

react, react-dom: Core React libraries.
qr-scanner@1.4.2: For QR code scanning (camera and image).
@mui/material: For UI components.
Custom decryptQR.js and cryptoShim.js for decryption.


Run the Development Server:
npm start

The app will be available at http://localhost:3000 (use HTTPS for camera access, e.g., via a tunnel like ngrok or a local HTTPS setup).

Build for Production:
npm run build

Serve the build folder using a static server (e.g., serve -s build).


Usage

Access the App:

Open https://localhost:3000 (or your deployed URL) in a browser.
Ensure HTTPS is used for camera permissions.
