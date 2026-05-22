String slugFromTitle(String title) {
  final normalized = title
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
  return normalized.isEmpty ? 'product-${DateTime.now().millisecondsSinceEpoch}' : normalized;
}

String skuBaseForColor({required String title, required String colorEnglish}) {
  final productCode = _asciiCode(title, fallback: 'PRD', max: 10);
  final colorCode = _asciiCode(colorEnglish, fallback: 'COL', max: 6);
  return '$productCode-$colorCode';
}

String skuForSize({required String skuBase, required String sizeName}) {
  final sizeCode = _asciiCode(sizeName, fallback: 'SIZE', max: 6);
  return '$skuBase-$sizeCode';
}

String _asciiCode(String value, {required String fallback, required int max}) {
  final words = value
      .toUpperCase()
      .replaceAll(RegExp(r'[^A-Z0-9]+'), ' ')
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();
  if (words.isEmpty) return fallback;
  final joined = words.length == 1 ? words.first : words.map((w) => w.substring(0, w.length < 3 ? w.length : 3)).join();
  return joined.length > max ? joined.substring(0, max) : joined;
}
