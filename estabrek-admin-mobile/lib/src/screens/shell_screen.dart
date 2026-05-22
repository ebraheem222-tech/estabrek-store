import 'package:flutter/material.dart';

import '../services/api_client.dart';
import 'action_center_screen.dart';
import 'orders_screen.dart';
import 'quick_add_product_screen.dart';
import 'stock_scan_screen.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key, required this.api, required this.onLogout});

  final ApiClient api;
  final Future<void> Function() onLogout;

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      ActionCenterScreen(api: widget.api, onLogout: widget.onLogout),
      QuickAddProductScreen(api: widget.api),
      OrdersScreen(api: widget.api),
      StockScanScreen(api: widget.api),
    ];

    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'المركز'),
          NavigationDestination(icon: Icon(Icons.add_a_photo_outlined), selectedIcon: Icon(Icons.add_a_photo), label: 'منتج'),
          NavigationDestination(icon: Icon(Icons.local_shipping_outlined), selectedIcon: Icon(Icons.local_shipping), label: 'طلبات'),
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'مخزون'),
        ],
      ),
    );
  }
}
