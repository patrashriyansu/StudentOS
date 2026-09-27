import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class ExpenseTrackerScreen extends StatefulWidget {
  const ExpenseTrackerScreen({super.key});

  @override
  State<ExpenseTrackerScreen> createState() => _ExpenseTrackerScreenState();
}

class _ExpenseTrackerScreenState extends State<ExpenseTrackerScreen> {
  final List<Map<String, dynamic>> _transactions = [
    {'icon': '🍽️', 'desc': 'Mess Fee', 'category': 'Mess', 'date': 'Jun 15', 'amount': -1600, 'color': Color(0xFF81C784)},
    {'icon': '🚕', 'desc': 'Ola Cab', 'category': 'Transport', 'date': 'Jun 14', 'amount': -150, 'color': Color(0xFF4FC3F7)},
    {'icon': '🍕', 'desc': 'Pizza with friends', 'category': 'Food', 'date': 'Jun 14', 'amount': -380, 'color': Color(0xFFFFB74D)},
    {'icon': '🛒', 'desc': 'Grocery', 'category': 'Food', 'date': 'Jun 13', 'amount': -420, 'color': Color(0xFFFFB74D)},
    {'icon': '📚', 'desc': 'Textbook', 'category': 'Education', 'date': 'Jun 12', 'amount': -350, 'color': Color(0xFF6C63FF)},
    {'icon': '🚌', 'desc': 'Bus Pass', 'category': 'Transport', 'date': 'Jun 11', 'amount': -200, 'color': Color(0xFF4FC3F7)},
    {'icon': '☕', 'desc': 'Canteen Coffee', 'category': 'Food', 'date': 'Jun 11', 'amount': -60, 'color': Color(0xFFFFB74D)},
    {'icon': '🛍️', 'desc': 'T-Shirt', 'category': 'Shopping', 'date': 'Jun 10', 'amount': -499, 'color': Color(0xFFCE93D8)},
  ];

  bool _showAddSheet = false;
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _selectedCat = 'Food';

  final List<String> _categories = ['Food', 'Mess', 'Transport', 'Shopping', 'Education', 'Other'];

  @override
  Widget build(BuildContext context) {
    final total = _transactions.fold<int>(0, (s, t) => s + (t['amount'] as int).abs());

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Expense Tracker', showBack: true),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddExpense(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text('Add Expense', style: AppTextStyles.label.copyWith(color: Colors.white)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GlassCard(
              child: Column(
                children: [
                  Text('Total Spent This Month', style: AppTextStyles.body),
                  const SizedBox(height: 8),
                  Text('₹${total.toString()}', style: AppTextStyles.displayLarge.copyWith(color: AppColors.accentRed)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI insight
            GlassCard(
              borderColor: AppColors.accentOrange.withOpacity(0.4),
              child: Row(
                children: [
                  const Text('🤖', style: TextStyle(fontSize: 24)),
                  const SizedBox(width: 10),
                  Expanded(child: Text('You spent ₹2,500 extra on food this month. Try cooking in hostel!', style: AppTextStyles.bodySmall)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            Text('Recent Transactions', style: AppTextStyles.headingSmall),
            const SizedBox(height: 10),
            ..._transactions.map((t) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                child: Row(
                  children: [
                    Text(t['icon'], style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t['desc'], style: AppTextStyles.titleMedium),
                          Text('${t['category']} • ${t['date']}', style: AppTextStyles.caption),
                        ],
                      ),
                    ),
                    Text(
                      '₹${t['amount']}',
                      style: AppTextStyles.titleMedium.copyWith(color: AppColors.accentRed),
                    ),
                  ],
                ),
              ),
            )),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _showAddExpense(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(left: 16, right: 16, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add Expense', style: AppTextStyles.headingSmall),
              const SizedBox(height: 16),
              TextField(controller: _amountCtrl, keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(hintText: 'Amount (₹)', prefixIcon: Icon(Icons.currency_rupee, color: AppColors.accentGreen))),
              const SizedBox(height: 12),
              TextField(controller: _descCtrl, style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(hintText: 'Description', prefixIcon: Icon(Icons.notes, color: AppColors.accent))),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: _categories.map((c) => GestureDetector(
                  onTap: () => setS(() => _selectedCat = c),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _selectedCat == c ? AppColors.primary.withOpacity(0.2) : AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _selectedCat == c ? AppColors.primary : AppColors.border),
                    ),
                    child: Text(c, style: AppTextStyles.caption.copyWith(color: _selectedCat == c ? AppColors.primary : AppColors.textMuted)),
                  ),
                )).toList(),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_amountCtrl.text.isNotEmpty) {
                      setState(() => _transactions.insert(0, {
                        'icon': '💳',
                        'desc': _descCtrl.text.isEmpty ? 'Expense' : _descCtrl.text,
                        'category': _selectedCat,
                        'date': 'Jun 22',
                        'amount': -int.parse(_amountCtrl.text),
                        'color': AppColors.primary,
                      }));
                      _amountCtrl.clear();
                      _descCtrl.clear();
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: Text('Save Expense', style: AppTextStyles.button),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
