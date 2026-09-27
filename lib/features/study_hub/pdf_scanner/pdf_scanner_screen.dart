import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class PdfScannerScreen extends StatefulWidget {
  const PdfScannerScreen({super.key});

  @override
  State<PdfScannerScreen> createState() => _PdfScannerScreenState();
}

class _PdfScannerScreenState extends State<PdfScannerScreen>
    with SingleTickerProviderStateMixin {
  bool _scanned = false;
  bool _scanning = false;
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  void _simulateScan() async {
    setState(() => _scanning = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _scanning = false;
      _scanned = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'PDF Scanner', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!_scanned) ...[
              // Camera viewfinder
              GestureDetector(
                onTap: _scanning ? null : _simulateScan,
                child: Container(
                  width: double.infinity,
                  height: 280,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D0D1A),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withOpacity(0.6), width: 2),
                  ),
                  child: _scanning
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedBuilder(
                              animation: _pulseCtrl,
                              builder: (_, __) => Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.primary.withOpacity(0.15 + 0.15 * _pulseCtrl.value),
                                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3 * _pulseCtrl.value), blurRadius: 24, spreadRadius: 8)],
                                ),
                                child: const Icon(Icons.document_scanner, color: AppColors.primary, size: 36),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text('Scanning document...', style: AppTextStyles.titleMedium),
                            const SizedBox(height: 8),
                            const SizedBox(width: 200, child: LinearProgressIndicator(valueColor: AlwaysStoppedAnimation(AppColors.primary))),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Corner markers
                            Stack(
                              children: [
                                Container(width: 160, height: 140, decoration: BoxDecoration(border: Border.all(color: AppColors.primary, width: 2), borderRadius: BorderRadius.circular(8))),
                                Positioned(top: -1, left: -1, child: Container(width: 24, height: 24, decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.accent, width: 4), left: BorderSide(color: AppColors.accent, width: 4))))),
                                Positioned(top: -1, right: -1, child: Container(width: 24, height: 24, decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.accent, width: 4), right: BorderSide(color: AppColors.accent, width: 4))))),
                                Positioned(bottom: -1, left: -1, child: Container(width: 24, height: 24, decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accent, width: 4), left: BorderSide(color: AppColors.accent, width: 4))))),
                                Positioned(bottom: -1, right: -1, child: Container(width: 24, height: 24, decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accent, width: 4), right: BorderSide(color: AppColors.accent, width: 4))))),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text('Tap to scan document', style: AppTextStyles.body),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: GlassCard(
                      child: Column(
                        children: [
                          const Icon(Icons.camera_alt, color: AppColors.primary, size: 28),
                          const SizedBox(height: 6),
                          Text('Camera', style: AppTextStyles.label),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GlassCard(
                      child: Column(
                        children: [
                          const Icon(Icons.upload_file, color: AppColors.secondary, size: 28),
                          const SizedBox(height: 6),
                          Text('Upload PDF', style: AppTextStyles.label),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GlassCard(
                      child: Column(
                        children: [
                          const Icon(Icons.image, color: AppColors.accent, size: 28),
                          const SizedBox(height: 6),
                          Text('Gallery', style: AppTextStyles.label),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              // Scanned result
              GlassCard(
                borderColor: AppColors.accentGreen.withOpacity(0.4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.accentGreen),
                        const SizedBox(width: 8),
                        Text('Scan Complete!', style: AppTextStyles.titleMedium.copyWith(color: AppColors.accentGreen)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                          child: Text('Auto Title: OS Notes', style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
                      child: Text(
                        'Process scheduling is a core component of the OS. The scheduler decides which process runs on the CPU. Common algorithms include:\n\n1. First Come First Served (FCFS)\n2. Shortest Job First (SJF)\n3. Round Robin (RR)\n4. Priority Scheduling\n\nContext switching occurs when the CPU switches from one process to another, saving and restoring state via PCB...',
                        style: AppTextStyles.body,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Detected Info', style: AppTextStyles.titleMedium),
                    const SizedBox(height: 10),
                    Row(children: [
                      const Icon(Icons.subject, color: AppColors.accent, size: 16),
                      const SizedBox(width: 8),
                      Text('Subject: Operating Systems', style: AppTextStyles.body),
                    ]),
                    const SizedBox(height: 6),
                    Row(children: [
                      const Icon(Icons.tag, color: AppColors.primary, size: 16),
                      const SizedBox(width: 8),
                      Wrap(spacing: 6, children: ['Process', 'Scheduling', 'CPU', 'FCFS', 'Round Robin'].map((t) =>
                        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(6)), child: Text(t, style: AppTextStyles.caption.copyWith(color: AppColors.primary)))).toList()),
                    ]),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: GradientButton(text: '✨ Summarize with AI', onTap: () {})),
                  const SizedBox(width: 10),
                  Expanded(child: GradientButton(
                    text: '💾 Save Note',
                    gradient: LinearGradient(colors: [AppColors.accentGreen, AppColors.accent]),
                    onTap: () {},
                  )),
                ],
              ),
              const SizedBox(height: 10),
              GradientButton(text: '📝 Generate MCQs', gradient: LinearGradient(colors: [AppColors.secondary, AppColors.primary]), onTap: () {}),
            ],
          ],
        ),
      ),
    );
  }
}
