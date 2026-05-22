# Estabrek Admin Mobile

Flutter companion app for fast phone workflows:

- Quick Add Product with camera photos, auto color grouping, SKU generation, size templates, per-size price, and per-size stock.
- Action Center for orders, low stock, reviews/comments, messages, and incomplete product signals.
- Orders operations with fast status changes.
- Barcode/SKU stock lookup and stock adjustment.

This app is intended as a mobile companion, not a full replacement for the web admin CMS/settings tools.

## Local Setup

Flutter is not installed on this machine right now, so native runners were not generated here.

After installing Flutter, run this from this folder:

```bash
flutter create --platforms=ios,android .
flutter pub get
flutter run
```

For a physical phone, use the backend LAN URL in the login screen, for example:

```text
http://192.168.0.25:4000/v1
```

## iOS Notes

After generating the iOS runner, add these keys to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera is used to add product photos and scan stock barcodes.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library is used to attach product photos.</string>
```

Then open `ios/Runner.xcworkspace` in Xcode for signing/TestFlight/App Store work.
