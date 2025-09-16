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


Log In:

Use demo credentials (handled by AuthContext).


Scan a QR Code:

Camera: Click "Iniciar Escaneo", grant camera permissions, and point the rear camera at a QR code.
File Upload: Click "Subir Imagen", select a QR code image (PNG/JPEG).
The decrypted result (e.g., {"tipo":"Smartphone","marca":"Apple",...}) appears in a Paper for 5 seconds.


View History:

The ScanHistory component shows the latest scan by default (e.g., Fecha: 10/08/2025, Tipo: Smartphone).
Click "Ver más" to show all scans; click "Ver menos" to revert to the latest.
History persists in localStorage.


Log Out:

Click "Cerrar Sesión" to exit.



File Structure
qr-code-scanner/
├── src/
│   ├── QrScanner.jsx       # Main component for scanning and uploading
│   ├── ScanHistory.jsx     # Displays scan history with toggle
│   ├── AuthContext.jsx     # Authentication context (assumed)
│   ├── decryptQR.js        # QR code decryption logic
│   ├── cryptoShim.js       # Cryptography utilities
│   ├── index.js            # App entry point
├── public/
│   ├── index.html          # HTML template
├── package.json            # Dependencies and scripts
├── README.md               # This file

Generating Test QR Codes
To test the app, generate QR codes using the following Python script:
from Crypto.Cipher import AES
from Crypto.Hash import HMAC, SHA256
from Crypto.Util.Padding import pad
import base64
import json

CLAVE_SECRETA_BASE64 = "jLYmfwqoInnIJGoEk5JKH/Hm1QudN/atoPicX82Xk94="
clave_secreta = base64.urlsafe_b64decode(CLAVE_SECRETA_BASE64)

def encrypt_qr_data(data):
    data_json = json.dumps(data).encode('utf-8')
    cipher = AES.new(clave_secreta, AES.MODE_CBC)
    iv = cipher.iv
    datos_cifrados = cipher.encrypt(pad(data_json, AES.block_size))
    hmac_calculador = HMAC.new(clave_secreta, digestmod=SHA256)
    hmac_calculador.update(iv + datos_cifrados)
    hmac = hmac_calculador.digest()
    return base64.urlsafe_b64encode(iv + datos_cifrados + hmac).decode('utf-8')

data = {
    "tipo": "Smartphone",
    "marca": "Apple",
    "modelo": "iPhone 14",
    "serie": "333333333",
    "codigo": "ORTUY7NHTL",
    "fecha": "2025-08-10T17:32:01.992760",
    "url": "http://127.0.0.1:5000/verificar-equipo/ORTUY7NHTL"
}
print(encrypt_qr_data(data))


Generate a QR code image from the Base64 output using a QR code generator (e.g., online tool or Python library like qrcode).
Create multiple QR codes with different codigo or fecha for history testing.

Testing

Setup:

Replace src/QrScanner.jsx and src/ScanHistory.jsx with the latest versions.
Run npm start and access via HTTPS.


Test Camera Scanning:

Click "Iniciar Escaneo", scan a QR code, and verify:
Result appears in Paper for 5 seconds, then clears.
Latest scan appears in ScanHistory (e.g., Fecha: 10/08/2025).
Console logs show localIsScanning (e.g., Estado de localIsScanning tras play: true).
Camera stops with "Detener Escaneo" (no black screen).




Test File Upload:

Click "Subir Imagen", upload a QR code image, and verify:
Result appears in Paper for 5 seconds, then clears.
Latest scan appears in ScanHistory.
Re-upload the same image works (input resets).
Invalid image shows an error Alert.




Test History:

Perform multiple scans (camera and file).
Confirm ScanHistory shows only the latest scan initially.
Click "Ver más" to show all scans; click "Ver menos" to revert.
Verify localStorage:console.log(JSON.parse(localStorage.getItem('qrHistory')));




Debugging:

Decryption Issues: Share the Base64 string from console ("Código QR detectado: <base64>") and test with:from lector_qr import descifrar_codigo_qr
print(descifrar_codigo_qr("<base64_from_console>"))


History Issues: Check console for errors in ScanHistory.jsx.
UI Issues: Share a screenshot of the app.



Notes

HTTPS Requirement: Camera access requires HTTPS. Use a local tunnel (e.g., ngrok) or deploy to a secure server.
Browser Compatibility: Tested on Chrome and Firefox. Safari may require additional permissions.
ScanHistory Customization: If your ScanHistory.jsx differs, adapt the latestScan, displayedHistory, and "Ver más" button logic to your implementation.

Future Improvements

Add loading indicators for camera initialization and file processing.
Implement pagination for large scan histories.
Add a clear history button (with confirmation).
