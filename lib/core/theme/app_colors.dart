import 'package:flutter/material.dart';

class AppColors {
  // Backgrounds
  static const Color background = Color(0xFF0A0A0F);
  static const Color surface = Color(0xFF12121A);
  static const Color card = Color(0xFF1A1A2E);
  static const Color cardLight = Color(0xFF1E1E30);

  // Brand
  static const Color primary = Color(0xFF6C63FF);
  static const Color primaryLight = Color(0xFF8B83FF);
  static const Color secondary = Color(0xFFA855F7);
  static const Color accent = Color(0xFF00D4FF);
  static const Color accentGreen = Color(0xFF00E676);
  static const Color accentOrange = Color(0xFFFFB300);
  static const Color accentRed = Color(0xFFFF5252);
  static const Color accentPink = Color(0xFFFF4081);

  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0C8);
  static const Color textMuted = Color(0xFF6B6B8A);

  // Borders
  static const Color border = Color(0xFF2A2A3E);
  static const Color borderLight = Color(0xFF3A3A5C);

  // Hub Colors
  static const Color studyColor = Color(0xFF4FC3F7);
  static const Color academicColor = Color(0xFF81C784);
  static const Color codingColor = Color(0xFFFFB74D);
  static const Color placementColor = Color(0xFFCE93D8);
  static const Color wellnessColor = Color(0xFFEF9A9A);
  static const Color financeColor = Color(0xFF80CBC4);
  static const Color aiColor = Color(0xFF6C63FF);

  // Gradients
  static const LinearGradient gradientPrimary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, secondary],
  );

  static const LinearGradient gradientAccent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accent, primary],
  );

  static const LinearGradient gradientDark = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [background, card],
  );

  static LinearGradient hubGradient(Color color) => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [color.withOpacity(0.3), color.withOpacity(0.05)],
  );
}
