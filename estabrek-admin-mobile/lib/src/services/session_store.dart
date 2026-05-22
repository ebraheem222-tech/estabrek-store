import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const defaultApiBaseUrl = 'http://127.0.0.1:4000/v1';

class SessionState {
  const SessionState({
    required this.baseUrl,
    this.accessToken,
    this.refreshToken,
  });

  final String baseUrl;
  final String? accessToken;
  final String? refreshToken;

  bool get isSignedIn => (accessToken?.isNotEmpty ?? false) && (refreshToken?.isNotEmpty ?? false);
}

class SessionStore {
  static const _baseUrlKey = 'api_base_url';
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<SessionState> read() async {
    final baseUrl = await _storage.read(key: _baseUrlKey) ?? defaultApiBaseUrl;
    return SessionState(
      baseUrl: _normalizeBaseUrl(baseUrl),
      accessToken: await _storage.read(key: _accessKey),
      refreshToken: await _storage.read(key: _refreshKey),
    );
  }

  Future<void> setBaseUrl(String baseUrl) async {
    await _storage.write(key: _baseUrlKey, value: _normalizeBaseUrl(baseUrl));
  }

  Future<void> setTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }

  String _normalizeBaseUrl(String value) {
    var out = value.trim();
    while (out.endsWith('/')) {
      out = out.substring(0, out.length - 1);
    }
    if (!out.endsWith('/v1')) out = '$out/v1';
    return out;
  }
}
