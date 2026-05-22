import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/admin_models.dart';
import '../services/api_client.dart';
import '../services/color_tools.dart';
import '../services/sku_tools.dart';

class QuickAddProductScreen extends StatefulWidget {
  const QuickAddProductScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<QuickAddProductScreen> createState() => _QuickAddProductScreenState();
}

class _QuickAddProductScreenState extends State<QuickAddProductScreen> {
  final _picker = ImagePicker();
  final _title = TextEditingController();
  final _slug = TextEditingController();
  final _description = TextEditingController();
  final List<ColorGroupDraft> _groups = [];

  List<AdminCategory> _categories = const [];
  List<SizeOption> _sizes = const [];
  String? _categoryId;
  bool _active = true;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _title.addListener(() {
      if (_slug.text.trim().isEmpty || _slug.text.startsWith('product-')) {
        _slug.text = slugFromTitle(_title.text);
      }
      for (final group in _groups) {
        group.rebuildSku(_title.text, _sizes);
      }
      if (mounted) setState(() {});
    });
  }

  Future<void> _load() async {
    try {
      final categories = await widget.api.listCategories();
      final sizes = await widget.api.listSizes();
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _sizes = sizes;
        _categoryId = categories.isNotEmpty ? categories.first.id : null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _capturePhoto({bool bulk = false}) async {
    do {
      final photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85, maxWidth: 1800);
      if (photo == null) return;
      final use = await _reviewPhoto(photo);
      if (use == true) await _addPhotoToAutoGroup(photo);
      if (!bulk) return;
    } while (await _askContinueCamera());
  }

  Future<void> _pickPhotos() async {
    final photos = await _picker.pickMultiImage(imageQuality: 85, maxWidth: 1800);
    for (final photo in photos) {
      await _addPhotoToAutoGroup(photo);
    }
  }

  Future<bool?> _reviewPhoto(XFile file) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('مراجعة الصورة'),
        content: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.file(File(file.path), fit: BoxFit.cover),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('تجاهل')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('استخدم الصورة')),
        ],
      ),
    );
  }

  Future<bool> _askContinueCamera() async {
    final again = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تصوير سريع'),
        content: const Text('هل تريد تصوير صورة أخرى لنفس المنتج؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إنهاء')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('صورة أخرى')),
        ],
      ),
    );
    return again == true;
  }

  Future<void> _addPhotoToAutoGroup(XFile photo) async {
    final color = await detectDominantColor(photo);
    final existingIndex = _groups.indexWhere((group) => group.colorEnglish == color.englishName);
    setState(() {
      if (existingIndex >= 0) {
        _groups[existingIndex].images.add(photo);
      } else {
        _groups.add(ColorGroupDraft.fromColor(color, _title.text, _sizes)..images.add(photo));
      }
    });
  }

  void _addManualGroup(ColorInfo color) {
    setState(() => _groups.add(ColorGroupDraft.fromColor(color, _title.text, _sizes)));
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      if (_title.text.trim().isEmpty) throw const ApiException('اسم المنتج مطلوب');
      if (_categoryId == null) throw const ApiException('اختر قسم المنتج');
      if (_groups.isEmpty) throw const ApiException('أضف لون وصورة واحدة على الأقل');
      if (_groups.any((group) => group.sizeIds.isEmpty)) throw const ApiException('كل لون يحتاج حجم واحد على الأقل');

      final product = await widget.api.createProduct(
        title: _title.text.trim(),
        slug: _slug.text.trim().isEmpty ? slugFromTitle(_title.text) : _slug.text.trim(),
        categoryId: _categoryId!,
        isActive: _active,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      );

      final items = <Map<String, dynamic>>[];
      for (final group in _groups) {
        final uploaded = await widget.api.uploadImages(
          group.images,
          folder: 'products',
          tags: ['product', group.colorEnglish.toLowerCase()],
        );
        final selectedSizes = _sizes.where((size) => group.sizeIds.contains(size.id)).toList();
        items.add({
          'colorName': group.colorArabic,
          'colorHex': group.colorHex,
          'skuBase': group.skuBase,
          'isActive': true,
          'images': [
            for (var i = 0; i < uploaded.length; i++)
              {
                'url': uploaded[i].url,
                'alt': '${_title.text.trim()} ${group.colorArabic}',
                'position': i,
                'isPrimary': i == 0,
              },
          ],
          'variants': [
            for (final size in selectedSizes)
              {
                'sizeId': size.id,
                'sku': skuForSize(skuBase: group.skuBase, sizeName: size.name),
                'price': group.priceFor(size.id),
                'stock': group.stockFor(size.id),
                'lowStockThreshold': 2,
              },
          ],
        });
      }

      await widget.api.updateProductFull(stringFromJson(product['id']), {'items': items});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم حفظ المنتج')));
      setState(() {
        _title.clear();
        _slug.clear();
        _description.clear();
        _groups.clear();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  int get _score {
    var score = 0;
    if (_title.text.trim().isNotEmpty) score += 20;
    if (_categoryId != null) score += 15;
    if (_groups.any((group) => group.images.isNotEmpty)) score += 20;
    if (_groups.isNotEmpty && _groups.every((group) => group.sizeIds.isNotEmpty)) score += 20;
    if (_groups.isNotEmpty && _groups.every((group) => group.hasPrices)) score += 15;
    if (_groups.isNotEmpty && _groups.every((group) => group.hasStock)) score += 10;
    return score.clamp(0, 100);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('إضافة منتج سريعة')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer)),
                    ),
                  ),
                _Completeness(score: _score),
                const SizedBox(height: 12),
                TextField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'اسم المنتج', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _slug,
                  textDirection: TextDirection.ltr,
                  decoration: const InputDecoration(labelText: 'Slug', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _categoryId,
                  items: _categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                  onChanged: (value) => setState(() => _categoryId = value),
                  decoration: const InputDecoration(labelText: 'القسم', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _description,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'وصف مختصر', border: OutlineInputBorder()),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _active,
                  onChanged: (value) => setState(() => _active = value),
                  title: const Text('نشر المنتج مباشرة'),
                ),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _capturePhoto(),
                        icon: const Icon(Icons.camera_alt),
                        label: const Text('تصوير'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _capturePhoto(bulk: true),
                        icon: const Icon(Icons.camera),
                        label: const Text('تصوير سريع'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _pickPhotos,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('اختيار صور من المعرض'),
                ),
                const SizedBox(height: 12),
                _ManualColorPicker(onAdd: _addManualGroup),
                const SizedBox(height: 12),
                if (_groups.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('صوّر أول صورة وسيتم إنشاء مجموعة اللون تلقائيا.'),
                    ),
                  )
                else
                  ..._groups.map((group) => _ColorGroupCard(
                        key: ValueKey(group.id),
                        group: group,
                        sizes: _sizes,
                        duplicateCount: _groups.where((g) => g.colorEnglish == group.colorEnglish).length,
                        onChanged: () => setState(() {}),
                        onDelete: () => setState(() => _groups.remove(group)),
                      )),
                const SizedBox(height: 96),
              ],
            ),
      bottomSheet: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0x11000000))),
          ),
          child: FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
            label: const Text('حفظ المنتج'),
          ),
        ),
      ),
    );
  }
}

class ColorGroupDraft {
  ColorGroupDraft({
    required this.colorEnglish,
    required this.colorArabic,
    required this.colorHex,
    required this.skuBase,
  });

  factory ColorGroupDraft.fromColor(ColorInfo color, String productTitle, List<SizeOption> sizes) {
    final group = ColorGroupDraft(
      colorEnglish: color.englishName,
      colorArabic: color.arabicName,
      colorHex: color.hex,
      skuBase: skuBaseForColor(title: productTitle, colorEnglish: color.englishName),
    );
    group.applyTemplate('Clothes S-XL', sizes);
    return group;
  }

  final String id = DateTime.now().microsecondsSinceEpoch.toString();
  final String colorEnglish;
  final String colorArabic;
  final String colorHex;
  String skuBase;
  String priceMode = 'default';
  String stockMode = 'default';
  double defaultPrice = 0;
  int defaultStock = 0;
  final Set<String> sizeIds = {};
  final Map<String, double> priceBySize = {};
  final Map<String, int> stockBySize = {};
  final List<XFile> images = [];

  bool get hasPrices {
    if (priceMode == 'default') return defaultPrice > 0;
    return sizeIds.every((id) => (priceBySize[id] ?? 0) > 0);
  }

  bool get hasStock {
    if (stockMode == 'default') return defaultStock >= 0;
    return sizeIds.every((id) => stockBySize.containsKey(id));
  }

  double priceFor(String sizeId) => priceMode == 'default' ? defaultPrice : (priceBySize[sizeId] ?? defaultPrice);

  int stockFor(String sizeId) => stockMode == 'default' ? defaultStock : (stockBySize[sizeId] ?? defaultStock);

  void rebuildSku(String productTitle, List<SizeOption> sizes) {
    skuBase = skuBaseForColor(title: productTitle, colorEnglish: colorEnglish);
  }

  void applyTemplate(String template, List<SizeOption> sizes) {
    final names = switch (template) {
      'One Size' => {'one size', 'os', 'free', 'free size'},
      'Shoes 36-42' => {'36', '37', '38', '39', '40', '41', '42'},
      _ => {'s', 'm', 'l', 'xl'},
    };
    sizeIds
      ..clear()
      ..addAll(sizes.where((size) => names.contains(size.name.trim().toLowerCase())).map((size) => size.id));
    if (sizeIds.isEmpty && sizes.isNotEmpty) sizeIds.add(sizes.first.id);
  }
}

class _Completeness extends StatelessWidget {
  const _Completeness({required this.score});

  final int score;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text('جاهزية المنتج', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800))),
                Text('$score%'),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: score / 100),
          ],
        ),
      ),
    );
  }
}

class _ManualColorPicker extends StatelessWidget {
  const _ManualColorPicker({required this.onAdd});

  final void Function(ColorInfo color) onAdd;

  static const colors = [
    ColorInfo(hex: '#111827', englishName: 'Black', arabicName: 'أسود'),
    ColorInfo(hex: '#ffffff', englishName: 'White', arabicName: 'أبيض'),
    ColorInfo(hex: '#ef4444', englishName: 'Red', arabicName: 'أحمر'),
    ColorInfo(hex: '#3b82f6', englishName: 'Blue', arabicName: 'أزرق'),
    ColorInfo(hex: '#22c55e', englishName: 'Green', arabicName: 'أخضر'),
    ColorInfo(hex: '#f5f5dc', englishName: 'Beige', arabicName: 'بيج'),
  ];

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('إضافة لون بدون صورة'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: colors
                  .map((color) => ActionChip(
                        avatar: CircleAvatar(backgroundColor: colorFromHex(color.hex)),
                        label: Text(color.arabicName),
                        onPressed: () => onAdd(color),
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _ColorGroupCard extends StatelessWidget {
  const _ColorGroupCard({
    super.key,
    required this.group,
    required this.sizes,
    required this.duplicateCount,
    required this.onChanged,
    required this.onDelete,
  });

  final ColorGroupDraft group;
  final List<SizeOption> sizes;
  final int duplicateCount;
  final VoidCallback onChanged;
  final VoidCallback onDelete;

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
                CircleAvatar(backgroundColor: colorFromHex(group.colorHex)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${group.colorArabic} / ${group.colorEnglish}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text(group.skuBase, textDirection: TextDirection.ltr),
                    ],
                  ),
                ),
                IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline)),
              ],
            ),
            if (duplicateCount > 1)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('تحذير: يوجد لون مكرر. استخدم نفس المجموعة أو أضف تسمية علبة واضحة.', style: TextStyle(color: Colors.orange)),
              ),
            if (group.images.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (context, index) => ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(File(group.images[index].path), width: 72, height: 72, fit: BoxFit.cover),
                  ),
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemCount: group.images.length,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                ActionChip(label: const Text('ملابس S-XL'), onPressed: () => _template('Clothes S-XL')),
                ActionChip(label: const Text('مقاس واحد'), onPressed: () => _template('One Size')),
                ActionChip(label: const Text('أحذية 36-42'), onPressed: () => _template('Shoes 36-42')),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: sizes
                  .map((size) => FilterChip(
                        label: Text(size.name),
                        selected: group.sizeIds.contains(size.id),
                        onSelected: (selected) {
                          selected ? group.sizeIds.add(size.id) : group.sizeIds.remove(size.id);
                          onChanged();
                        },
                      ))
                  .toList(),
            ),
            const SizedBox(height: 10),
            _ModeRow(
              title: 'السعر',
              value: group.priceMode,
              onChanged: (value) {
                group.priceMode = value;
                onChanged();
              },
            ),
            TextFormField(
              initialValue: group.defaultPrice == 0 ? '' : group.defaultPrice.toStringAsFixed(0),
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'السعر الافتراضي'),
              onChanged: (value) {
                group.defaultPrice = double.tryParse(value) ?? 0;
              },
            ),
            if (group.priceMode == 'manual') _ManualNumberInputs(group: group, sizes: sizes, kind: 'price', onChanged: onChanged),
            const SizedBox(height: 10),
            _ModeRow(
              title: 'المخزون',
              value: group.stockMode,
              onChanged: (value) {
                group.stockMode = value;
                onChanged();
              },
            ),
            TextFormField(
              initialValue: group.defaultStock == 0 ? '' : group.defaultStock.toString(),
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'المخزون الافتراضي'),
              onChanged: (value) {
                group.defaultStock = int.tryParse(value) ?? 0;
              },
            ),
            if (group.stockMode == 'manual') _ManualNumberInputs(group: group, sizes: sizes, kind: 'stock', onChanged: onChanged),
          ],
        ),
      ),
    );
  }

  void _template(String name) {
    group.applyTemplate(name, sizes);
    onChanged();
  }
}

class _ModeRow extends StatelessWidget {
  const _ModeRow({required this.title, required this.value, required this.onChanged});

  final String title;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 72, child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700))),
        ChoiceChip(label: const Text('للكل'), selected: value == 'default', onSelected: (_) => onChanged('default')),
        const SizedBox(width: 6),
        ChoiceChip(label: const Text('يدوي'), selected: value == 'manual', onSelected: (_) => onChanged('manual')),
      ],
    );
  }
}

class _ManualNumberInputs extends StatelessWidget {
  const _ManualNumberInputs({required this.group, required this.sizes, required this.kind, required this.onChanged});

  final ColorGroupDraft group;
  final List<SizeOption> sizes;
  final String kind;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = sizes.where((size) => group.sizeIds.contains(size.id));
    return Column(
      children: selected
          .map((size) => TextFormField(
                key: ValueKey('${group.id}-${kind}-${size.id}'),
                initialValue: kind == 'price'
                    ? (group.priceBySize[size.id]?.toStringAsFixed(0) ?? '')
                    : (group.stockBySize[size.id]?.toString() ?? ''),
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: '${kind == 'price' ? 'سعر' : 'مخزون'} ${size.name}'),
                onChanged: (value) {
                  if (kind == 'price') {
                    group.priceBySize[size.id] = double.tryParse(value) ?? group.defaultPrice;
                  } else {
                    group.stockBySize[size.id] = int.tryParse(value) ?? group.defaultStock;
                  }
                  onChanged();
                },
              ))
          .toList(),
    );
  }
}
