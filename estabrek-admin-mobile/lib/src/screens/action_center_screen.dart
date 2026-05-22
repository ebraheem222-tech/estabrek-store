import 'package:flutter/material.dart';

import '../models/admin_models.dart';
import '../services/api_client.dart';

class ActionCenterScreen extends StatefulWidget {
  const ActionCenterScreen({super.key, required this.api, required this.onLogout});

  final ApiClient api;
  final Future<void> Function() onLogout;

  @override
  State<ActionCenterScreen> createState() => _ActionCenterScreenState();
}

class _ActionCenterScreenState extends State<ActionCenterScreen> {
  Map<String, dynamic>? _overview;
  List<LowStockRow> _lowStock = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final overview = await widget.api.getOverview();
      final lowStock = await widget.api.getLowStock();
      if (!mounted) return;
      setState(() {
        _overview = overview;
        _lowStock = lowStock;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final counts = Map<String, dynamic>.from((_overview?['counts'] as Map?) ?? const {});
    return Scaffold(
      appBar: AppBar(
        title: const Text('مركز العمل'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
          IconButton(onPressed: widget.onLogout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const LinearProgressIndicator(),
            if (_error != null) _ErrorBox(error: _error!),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.22,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: [
                _TaskTile(title: 'طلبات جديدة', value: _count(counts, 'ordersNew'), icon: Icons.receipt_long, color: Colors.teal),
                _TaskTile(title: 'مخزون منخفض', value: _lowStock.length, icon: Icons.inventory_2, color: Colors.orange),
                _TaskTile(title: 'رسائل فاشلة', value: _count(counts, 'outboxFailedToday'), icon: Icons.sms_failed, color: Colors.red),
                _TaskTile(title: 'تعليقات', value: _count(counts, 'commentsPending'), icon: Icons.mode_comment_outlined, color: Colors.indigo),
                _TaskTile(title: 'مراجعات', value: _count(counts, 'reviewsPending'), icon: Icons.star_outline, color: Colors.amber),
                _TaskTile(title: 'منتجات ناقصة', value: _count(counts, 'productsDraft'), icon: Icons.warning_amber, color: Colors.blueGrey),
              ],
            ),
            const SizedBox(height: 16),
            Text('تنبيهات المخزون', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (_lowStock.isEmpty)
              const Card(child: ListTile(title: Text('لا يوجد مخزون منخفض الآن')))
            else
              ..._lowStock.map((row) => Card(
                    child: ListTile(
                      leading: CircleAvatar(child: Text('${row.stock}')),
                      title: Text(row.productTitle ?? row.sku),
                      subtitle: Text('${row.colorName ?? '-'} / ${row.size ?? '-'} / ${row.sku}'),
                      trailing: Text('حد ${row.lowStockThreshold}'),
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  int _count(Map<String, dynamic> counts, String key) => intFromJson(counts[key]);
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.title, required this.value, required this.icon, required this.color});

  final String title;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const Spacer(),
            Text('$value', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(error, style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer)),
      ),
    );
  }
}
