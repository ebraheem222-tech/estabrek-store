import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../models/admin_models.dart';
import '../services/api_client.dart';

class StockScanScreen extends StatefulWidget {
  const StockScanScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<StockScanScreen> createState() => _StockScanScreenState();
}

class _StockScanScreenState extends State<StockScanScreen> {
  final _sku = TextEditingController();
  final _setStock = TextEditingController();
  VariantLookup? _variant;
  bool _loading = false;
  String? _error;

  Future<void> _lookup([String? sku]) async {
    final value = (sku ?? _sku.text).trim();
    if (value.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final variant = await widget.api.lookupVariantBySku(value);
      if (!mounted) return;
      setState(() {
        _variant = variant;
        _sku.text = variant.sku;
        _setStock.text = variant.stock.toString();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _adjust(String mode, int value) async {
    final variant = _variant;
    if (variant == null) return;
    setState(() => _loading = true);
    try {
      final updated = await widget.api.adjustVariant(
        variantId: variant.variantId,
        mode: mode,
        value: value,
        reason: mode == 'set' ? 'Mobile stock count' : 'Mobile quick stock adjust',
      );
      if (!mounted) return;
      setState(() {
        _variant = updated;
        _setStock.text = updated.stock.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم تحديث المخزون')));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openScanner() async {
    final sku = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const _ScannerPage()),
    );
    if (sku != null && sku.isNotEmpty) {
      await _lookup(sku);
    }
  }

  @override
  Widget build(BuildContext context) {
    final variant = _variant;
    return Scaffold(
      appBar: AppBar(title: const Text('عد المخزون')),
      body: ListView(
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
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _sku,
                  textDirection: TextDirection.ltr,
                  decoration: const InputDecoration(labelText: 'SKU / Barcode', border: OutlineInputBorder()),
                  onSubmitted: _lookup,
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(onPressed: _openScanner, icon: const Icon(Icons.qr_code_scanner)),
            ],
          ),
          const SizedBox(height: 10),
          FilledButton.icon(onPressed: () => _lookup(), icon: const Icon(Icons.search), label: const Text('بحث')),
          const SizedBox(height: 16),
          if (variant == null)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('امسح SKU أو اكتبه لتحديث مخزون المقاس مباشرة.')))
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(variant.productTitle ?? variant.sku, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text('${variant.colorName ?? '-'} / ${variant.size ?? '-'}'),
                    Text(variant.sku, textDirection: TextDirection.ltr),
                    const Divider(height: 24),
                    Row(
                      children: [
                        Expanded(child: Text('المخزون الحالي', style: Theme.of(context).textTheme.titleSmall)),
                        Text('${variant.stock}', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: OutlinedButton(onPressed: () => _adjust('delta', -1), child: const Text('-1'))),
                        const SizedBox(width: 8),
                        Expanded(child: OutlinedButton(onPressed: () => _adjust('delta', 1), child: const Text('+1'))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _setStock,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'تثبيت المخزون لهذا المقاس', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () => _adjust('set', int.tryParse(_setStock.text) ?? variant.stock),
                      icon: const Icon(Icons.inventory),
                      label: const Text('حفظ المخزون'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ScannerPage extends StatefulWidget {
  const _ScannerPage();

  @override
  State<_ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<_ScannerPage> {
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('مسح الباركود')),
      body: MobileScanner(
        onDetect: (capture) {
          if (_done) return;
          final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
          if (raw == null || raw.isEmpty) return;
          _done = true;
          Navigator.pop(context, raw);
        },
      ),
    );
  }
}
