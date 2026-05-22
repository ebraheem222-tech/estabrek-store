import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'screens/login_screen.dart';
import 'screens/shell_screen.dart';
import 'services/api_client.dart';
import 'services/session_store.dart';

class EstabrekAdminMobileApp extends StatefulWidget {
  const EstabrekAdminMobileApp({super.key});

  @override
  State<EstabrekAdminMobileApp> createState() => _EstabrekAdminMobileAppState();
}

class _EstabrekAdminMobileAppState extends State<EstabrekAdminMobileApp> {
  final SessionStore _sessionStore = SessionStore();
  late final ApiClient _api = ApiClient(_sessionStore);
  SessionState? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final session = await _sessionStore.read();
    if (!mounted) return;
    setState(() {
      _session = session;
      _loading = false;
    });
  }

  Future<void> _logout() async {
    await _api.logout();
    await _loadSession();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Estabrek Admin',
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff0f766e),
          brightness: Brightness.light,
        ),
        fontFamily: 'Arial',
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xfff6f7f9),
        cardTheme: const CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: Color(0x11000000)),
          ),
        ),
      ),
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: _loading
            ? const Scaffold(body: Center(child: CircularProgressIndicator()))
            : (_session?.isSignedIn == true)
                ? AdminShell(api: _api, onLogout: _logout)
                : LoginScreen(api: _api, onLoggedIn: _loadSession),
      ),
    );
  }
}
