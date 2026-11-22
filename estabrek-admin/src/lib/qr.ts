/** Whether this browser can read a QR code with its camera (components/QrScanner.tsx); elsewhere the code is typed. */
export const canScanQr = () => typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia);
