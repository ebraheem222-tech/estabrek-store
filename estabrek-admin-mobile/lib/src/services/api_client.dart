import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import '../models/admin_models.dart';
import 'session_store.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._sessionStore);

  final SessionStore _sessionStore;
  final http.Client _client = http.Client();

  Future<String> get baseUrl async => (await _sessionStore.read()).baseUrl;

  Future<void> login({
    required String baseUrl,
    required String email,
    required String password,
  }) async {
    await _sessionStore.setBaseUrl(baseUrl);
    final data = await _json('POST', '/auth/login', body: {
      'email': email,
      'password': password,
    }, useAuth: false);

    if (data is Map<String, dynamic> && data['mfaRequired'] == true) {
      throw const ApiException('هذا الحساب يحتاج MFA. استخدم لوحة الويب حاليا لإكمال الدخول.');
    }

    await _sessionStore.setTokens(
      accessToken: stringFromJson(data['accessToken']),
      refreshToken: stringFromJson(data['refreshToken']),
    );
  }

  Future<void> logout() async {
    final session = await _sessionStore.read();
    final refreshToken = session.refreshToken;
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await _json('POST', '/auth/logout', body: {'refreshToken': refreshToken});
      } catch (_) {
        // Token may already be expired; local logout still matters.
      }
    }
    await _sessionStore.clearTokens();
  }

  Future<Map<String, dynamic>> getOverview() async {
    final data = await _json('GET', '/admin/overview');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<LowStockRow>> getLowStock({bool onlyBelow = true, int take = 8}) async {
    final data = await _json('GET', '/admin/inventory/low-stock', query: {
      'onlyBelow': onlyBelow ? '1' : '0',
      'take': '$take',
      'skip': '0',
    });
    final rows = (data['rows'] as List? ?? const []);
    return rows.map((row) => LowStockRow.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  Future<List<OrderSummary>> listOrders({String? status, int page = 1, int pageSize = 30}) async {
    final data = await _json('GET', '/admin/orders', query: {
      if (status != null && status != 'ALL') 'status': status,
      'page': '$page',
      'pageSize': '$pageSize',
    });
    final rows = (data['data'] as List? ?? const []);
    return rows.map((row) => OrderSummary.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  Future<void> updateOrderStatus(String id, String toStatus) async {
    await _json('PATCH', '/admin/orders/$id/status', body: {'toStatus': toStatus});
  }

  Future<List<AdminCategory>> listCategories() async {
    final data = await _json('GET', '/admin/catalog/categories');
    return (data as List).map((row) => AdminCategory.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  Future<List<SizeOption>> listSizes() async {
    final data = await _json('GET', '/admin/catalog/sizes');
    final sizes = (data as List).map((row) => SizeOption.fromJson(Map<String, dynamic>.from(row as Map))).toList();
    sizes.sort((a, b) => a.order.compareTo(b.order));
    return sizes;
  }

  Future<Map<String, dynamic>> createProduct({
    required String title,
    required String slug,
    required String categoryId,
    required bool isActive,
    String? description,
  }) async {
    final data = await _json('POST', '/admin/catalog/products', body: {
      'title': title,
      'slug': slug,
      'categoryId': categoryId,
      'isActive': isActive,
      'description': description,
    });
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> updateProductFull(String id, Map<String, dynamic> body) async {
    final data = await _json('PUT', '/admin/catalog/products/$id/full', body: body);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<UploadedMedia>> uploadImages(List<XFile> files, {String? folder, List<String> tags = const []}) async {
    if (files.isEmpty) return const [];

    final session = await _sessionStore.read();
    final uri = Uri.parse('${session.baseUrl}/admin/uploads/images');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(await _authHeaders());
    for (final file in files) {
      request.files.add(await http.MultipartFile.fromPath('files', file.path));
    }
    if (folder != null && folder.isNotEmpty) request.fields['folder'] = folder;
    if (tags.isNotEmpty) request.fields['tags'] = jsonEncode(tags);

    var response = await request.send();
    if (response.statusCode == 401 && await _refreshTokens()) {
      final retry = http.MultipartRequest('POST', uri);
      retry.headers.addAll(await _authHeaders());
      for (final file in files) {
        retry.files.add(await http.MultipartFile.fromPath('files', file.path));
      }
      if (folder != null && folder.isNotEmpty) retry.fields['folder'] = folder;
      if (tags.isNotEmpty) retry.fields['tags'] = jsonEncode(tags);
      response = await retry.send();
    }

    final body = await response.stream.bytesToString();
    final decoded = body.isEmpty ? <String, dynamic>{} : jsonDecode(body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_errorMessage(decoded), statusCode: response.statusCode);
    }
    final rows = (decoded['files'] as List? ?? const []);
    return rows.map((row) => UploadedMedia.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  Future<VariantLookup> lookupVariantBySku(String sku) async {
    final data = await _json('GET', '/admin/inventory/variants/lookup', query: {'sku': sku});
    return VariantLookup.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<VariantLookup> adjustVariant({
    required String variantId,
    required String mode,
    required int value,
    required String reason,
  }) async {
    final data = await _json('POST', '/admin/inventory/variants/$variantId/adjust', body: {
      'mode': mode,
      'value': value,
      'reason': reason,
    });
    final variant = Map<String, dynamic>.from(data['variant'] as Map);
    return VariantLookup.fromJson({
      'variantId': variant['id'],
      'sku': variant['sku'],
      'stock': variant['stock'],
      'lowStockThreshold': variant['lowStockThreshold'],
      'size': (variant['size'] as Map?)?['name'],
      'colorName': ((variant['item'] as Map?)?['colorName']),
      'colorHex': ((variant['item'] as Map?)?['colorHex']),
      'productTitle': (((variant['item'] as Map?)?['product'] as Map?)?['title']),
    });
  }

  Future<dynamic> _json(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    bool useAuth = true,
    bool retry = true,
  }) async {
    final session = await _sessionStore.read();
    var uri = Uri.parse('${session.baseUrl}$path');
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(queryParameters: query);
    }

    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (useAuth) ...await _authHeaders(),
    };

    final encoded = body == null ? null : jsonEncode(body);
    final response = switch (method) {
      'GET' => await _client.get(uri, headers: headers),
      'POST' => await _client.post(uri, headers: headers, body: encoded),
      'PATCH' => await _client.patch(uri, headers: headers, body: encoded),
      'PUT' => await _client.put(uri, headers: headers, body: encoded),
      _ => throw ApiException('Unsupported HTTP method: $method'),
    };

    if (response.statusCode == 401 && useAuth && retry && await _refreshTokens()) {
      return _json(method, path, body: body, query: query, useAuth: useAuth, retry: false);
    }

    final decoded = response.bodyBytes.isEmpty ? null : jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401) await _sessionStore.clearTokens();
      throw ApiException(_errorMessage(decoded), statusCode: response.statusCode);
    }
    return decoded;
  }

  Future<Map<String, String>> _authHeaders() async {
    final token = (await _sessionStore.read()).accessToken;
    return token == null || token.isEmpty ? const {} : {'Authorization': 'Bearer $token'};
  }

  Future<bool> _refreshTokens() async {
    final session = await _sessionStore.read();
    final refreshToken = session.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;

    final uri = Uri.parse('${session.baseUrl}/auth/refresh');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      await _sessionStore.clearTokens();
      return false;
    }
    final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    await _sessionStore.setTokens(
      accessToken: stringFromJson(data['accessToken']),
      refreshToken: stringFromJson(data['refreshToken']),
    );
    return true;
  }

  String _errorMessage(Object? decoded) {
    if (decoded is Map) {
      final message = decoded['message'] ?? decoded['error'];
      if (message != null) return message.toString();
    }
    return 'فشل الاتصال بالخادم';
  }
}
