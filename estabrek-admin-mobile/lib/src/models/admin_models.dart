double moneyToDouble(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int intFromJson(Object? value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

String stringFromJson(Object? value) => value?.toString() ?? '';

class AdminCategory {
  const AdminCategory({required this.id, required this.name, required this.slug});

  final String id;
  final String name;
  final String slug;

  factory AdminCategory.fromJson(Map<String, dynamic> json) => AdminCategory(
        id: stringFromJson(json['id']),
        name: stringFromJson(json['name']),
        slug: stringFromJson(json['slug']),
      );
}

class SizeOption {
  const SizeOption({required this.id, required this.name, this.order = 0});

  final String id;
  final String name;
  final int order;

  factory SizeOption.fromJson(Map<String, dynamic> json) => SizeOption(
        id: stringFromJson(json['id']),
        name: stringFromJson(json['name']),
        order: intFromJson(json['order']),
      );
}

class UploadedMedia {
  const UploadedMedia({
    required this.id,
    required this.url,
    required this.path,
    this.dominantColorHex,
    this.palette = const [],
  });

  final String id;
  final String url;
  final String path;
  final String? dominantColorHex;
  final List<String> palette;

  factory UploadedMedia.fromJson(Map<String, dynamic> json) => UploadedMedia(
        id: stringFromJson(json['id']),
        url: stringFromJson(json['url']),
        path: stringFromJson(json['path']),
        dominantColorHex: json['dominantColorHex'] as String?,
        palette: (json['palette'] is List) ? List<String>.from(json['palette'] as List) : const [],
      );
}

class LowStockRow {
  const LowStockRow({
    required this.variantId,
    required this.sku,
    required this.stock,
    required this.lowStockThreshold,
    this.productTitle,
    this.colorName,
    this.colorHex,
    this.size,
  });

  final String variantId;
  final String sku;
  final int stock;
  final int lowStockThreshold;
  final String? productTitle;
  final String? colorName;
  final String? colorHex;
  final String? size;

  factory LowStockRow.fromJson(Map<String, dynamic> json) => LowStockRow(
        variantId: stringFromJson(json['variantId']),
        sku: stringFromJson(json['sku']),
        stock: intFromJson(json['stock']),
        lowStockThreshold: intFromJson(json['lowStockThreshold']),
        productTitle: json['productTitle'] as String?,
        colorName: json['colorName'] as String?,
        colorHex: json['colorHex'] as String?,
        size: json['size'] as String?,
      );
}

class VariantLookup {
  const VariantLookup({
    required this.variantId,
    required this.sku,
    required this.stock,
    required this.lowStockThreshold,
    this.productTitle,
    this.colorName,
    this.colorHex,
    this.size,
  });

  final String variantId;
  final String sku;
  final int stock;
  final int lowStockThreshold;
  final String? productTitle;
  final String? colorName;
  final String? colorHex;
  final String? size;

  factory VariantLookup.fromJson(Map<String, dynamic> json) => VariantLookup(
        variantId: stringFromJson(json['variantId']),
        sku: stringFromJson(json['sku']),
        stock: intFromJson(json['stock']),
        lowStockThreshold: intFromJson(json['lowStockThreshold']),
        productTitle: json['productTitle'] as String?,
        colorName: json['colorName'] as String?,
        colorHex: json['colorHex'] as String?,
        size: json['size'] as String?,
      );
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.status,
    required this.customerName,
    required this.phone,
    required this.createdAt,
    required this.total,
    required this.items,
  });

  final String id;
  final String status;
  final String customerName;
  final String phone;
  final String createdAt;
  final double total;
  final List<Map<String, dynamic>> items;

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        id: stringFromJson(json['id']),
        status: stringFromJson(json['status']),
        customerName: stringFromJson(json['customerName']),
        phone: stringFromJson(json['phone']),
        createdAt: stringFromJson(json['createdAt']),
        total: moneyToDouble(json['total']),
        items: (json['items'] is List) ? List<Map<String, dynamic>>.from(json['items'] as List) : const [],
      );
}
