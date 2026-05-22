import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:image_picker/image_picker.dart';

class ColorInfo {
  const ColorInfo({
    required this.hex,
    required this.englishName,
    required this.arabicName,
  });

  final String hex;
  final String englishName;
  final String arabicName;
}

const _knownColors = <ColorInfo>[
  ColorInfo(hex: '#111827', englishName: 'Black', arabicName: 'أسود'),
  ColorInfo(hex: '#ffffff', englishName: 'White', arabicName: 'أبيض'),
  ColorInfo(hex: '#6b7280', englishName: 'Gray', arabicName: 'رمادي'),
  ColorInfo(hex: '#ef4444', englishName: 'Red', arabicName: 'أحمر'),
  ColorInfo(hex: '#f97316', englishName: 'Orange', arabicName: 'برتقالي'),
  ColorInfo(hex: '#f59e0b', englishName: 'Yellow', arabicName: 'أصفر'),
  ColorInfo(hex: '#22c55e', englishName: 'Green', arabicName: 'أخضر'),
  ColorInfo(hex: '#14b8a6', englishName: 'Teal', arabicName: 'تركواز'),
  ColorInfo(hex: '#3b82f6', englishName: 'Blue', arabicName: 'أزرق'),
  ColorInfo(hex: '#6366f1', englishName: 'Indigo', arabicName: 'نيلي'),
  ColorInfo(hex: '#a855f7', englishName: 'Purple', arabicName: 'بنفسجي'),
  ColorInfo(hex: '#ec4899', englishName: 'Pink', arabicName: 'زهري'),
  ColorInfo(hex: '#7c2d12', englishName: 'Brown', arabicName: 'بني'),
  ColorInfo(hex: '#f5f5dc', englishName: 'Beige', arabicName: 'بيج'),
];

Future<ColorInfo> detectDominantColor(XFile file) async {
  final bytes = await file.readAsBytes();
  final codec = await ui.instantiateImageCodec(bytes, targetWidth: 80);
  final frame = await codec.getNextFrame();
  final image = frame.image;
  final byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
  if (byteData == null) return _knownColors.first;

  var red = 0;
  var green = 0;
  var blue = 0;
  var count = 0;
  final data = byteData.buffer.asUint8List();
  for (var y = 0; y < image.height; y += 3) {
    for (var x = 0; x < image.width; x += 3) {
      final i = (y * image.width + x) * 4;
      final r = data[i];
      final g = data[i + 1];
      final b = data[i + 2];
      final a = data[i + 3];
      if (a < 160) continue;
      if (r > 242 && g > 242 && b > 242) continue;
      red += r;
      green += g;
      blue += b;
      count++;
    }
  }
  if (count == 0) return _knownColors.first;
  final rgb = _Rgb(red ~/ count, green ~/ count, blue ~/ count);
  final nearest = nearestColor(rgb);
  return ColorInfo(
    hex: _rgbToHex(rgb),
    englishName: nearest.englishName,
    arabicName: nearest.arabicName,
  );
}

ColorInfo nearestColorFromHex(String hex) => nearestColor(_hexToRgb(hex));

ColorInfo nearestColor(_Rgb rgb) {
  var best = _knownColors.first;
  var bestDistance = double.infinity;
  for (final color in _knownColors) {
    final c = _hexToRgb(color.hex);
    final distance = math.pow(rgb.red - c.red, 2) + math.pow(rgb.green - c.green, 2) + math.pow(rgb.blue - c.blue, 2);
    if (distance < bestDistance) {
      bestDistance = distance.toDouble();
      best = color;
    }
  }
  return best;
}

ui.Color colorFromHex(String hex) {
  final clean = hex.replaceAll('#', '');
  final value = int.tryParse(clean.length == 6 ? 'ff$clean' : clean, radix: 16) ?? 0xff111827;
  return ui.Color(value);
}

class _Rgb {
  const _Rgb(this.red, this.green, this.blue);

  final int red;
  final int green;
  final int blue;
}

_Rgb _hexToRgb(String hex) {
  final clean = hex.replaceAll('#', '');
  final value = int.tryParse(clean, radix: 16) ?? 0;
  return _Rgb((value >> 16) & 255, (value >> 8) & 255, value & 255);
}

String _rgbToHex(_Rgb rgb) {
  String part(int v) {
    final safe = v.clamp(0, 255).toInt();
    return safe.toRadixString(16).padLeft(2, '0');
  }

  return '#${part(rgb.red)}${part(rgb.green)}${part(rgb.blue)}';
}
