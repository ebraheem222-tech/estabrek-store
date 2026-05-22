import 'package:flutter/material.dart';

import '../models/admin_models.dart';
import '../services/api_client.dart';

const _statuses = ['ALL', 'NEW', 'CONTACTED', 'ACCEPTED', 'SHIPPED', 'CLOSED', 'CANCELED', 'REJECTED', 'REFUNDED'];

const _statusLabels = {
  'ALL': 'الكل',
  'NEW': 'جديد',
  'CONTACTED': 'تم التواصل',
  'ACCEPTED': 'مقبول',
  'SHIPPED': 'تم الشحن',
  'CLOSED': 'مغلق',
  'CANCELED': 'ملغي',
  'REJECTED': 'مرفوض',
  'REFUNDED': 'مسترجع',
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _status = 'NEW';
  String _query = '';
  List<OrderSummary> _orders = const [];
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
      final orders = await widget.api.listOrders(status: _status);
      if (!mounted) return;
      setState(() => _orders = orders);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(OrderSummary order, String status) async {
    try {
      await widget.api.updateOrderStatus(order.id, status);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم تحديث الطلب')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _orders.where((order) {
      final q = _query.trim().toLowerCase();
      if (q.isEmpty) return true;
      final haystack = [
        order.id,
        order.customerName,
        order.phone,
        ...order.items.expand((item) => [item['sku'], item['productTitle'], item['sizeName'], item['colorName']]),
      ].whereType<Object>().join(' ').toLowerCase();
      return haystack.contains(q);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('عمليات الطلبات'),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh))],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const LinearProgressIndicator(),
            if (_error != null)
              Card(
                color: Theme.of(context).colorScheme.errorContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer)),
                ),
              ),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemBuilder: (context, index) {
                  final status = _statuses[index];
                  return ChoiceChip(
                    label: Text(_statusLabels[status] ?? status),
                    selected: _status == status,
                    onSelected: (_) {
                      setState(() => _status = status);
                      _load();
                    },
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemCount: _statuses.length,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              onChanged: (value) => setState(() => _query = value),
              decoration: const InputDecoration(
                labelText: 'بحث باسم/هاتف/SKU',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            if (visible.isEmpty && !_loading)
              const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('لا توجد طلبات')))
            else
              ...visible.map((order) => _OrderCard(order: order, onSetStatus: (status) => _setStatus(order, status))),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onSetStatus});

  final OrderSummary order;
  final ValueChanged<String> onSetStatus;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(order.customerName.isEmpty ? order.phone : order.customerName, style: const TextStyle(fontWeight: FontWeight.w900)),
                ),
                Chip(label: Text(_statusLabels[order.status] ?? order.status)),
              ],
            ),
            const SizedBox(height: 4),
            Text(order.phone, textDirection: TextDirection.ltr),
            if (order.total > 0) Text('المجموع: ${order.total.toStringAsFixed(2)}'),
            const SizedBox(height: 8),
            ...order.items.map((item) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  value: false,
                  onChanged: (_) {},
                  title: Text(stringFromJson(item['productTitle'])),
                  subtitle: Text('${item['colorName'] ?? '-'} / ${item['sizeName'] ?? '-'} / ${item['sku'] ?? '-'}'),
                  controlAffinity: ListTileControlAffinity.leading,
                )),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () => onSetStatus('CONTACTED'),
                  icon: const Icon(Icons.phone),
                  label: const Text('تم التواصل'),
                ),
                FilledButton.icon(
                  onPressed: () => onSetStatus('ACCEPTED'),
                  icon: const Icon(Icons.check),
                  label: const Text('قبول'),
                ),
                OutlinedButton.icon(
                  onPressed: () => onSetStatus('SHIPPED'),
                  icon: const Icon(Icons.local_shipping),
                  label: const Text('شحن'),
                ),
                OutlinedButton.icon(
                  onPressed: () => onSetStatus('CANCELED'),
                  icon: const Icon(Icons.close),
                  label: const Text('إلغاء'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
