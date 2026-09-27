import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  static TextStyle get displayLarge => GoogleFonts.outfit(
    fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.textPrimary);

  static TextStyle get displayMedium => GoogleFonts.outfit(
    fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.textPrimary);

  static TextStyle get headingLarge => GoogleFonts.outfit(
    fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary);

  static TextStyle get headingMedium => GoogleFonts.outfit(
    fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary);

  static TextStyle get headingSmall => GoogleFonts.outfit(
    fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary);

  static TextStyle get titleLarge => GoogleFonts.outfit(
    fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary);

  static TextStyle get titleMedium => GoogleFonts.outfit(
    fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary);

  static TextStyle get body => GoogleFonts.outfit(
    fontSize: 14, fontWeight: FontWeight.normal, color: AppColors.textSecondary);

  static TextStyle get bodySmall => GoogleFonts.outfit(
    fontSize: 12, fontWeight: FontWeight.normal, color: AppColors.textSecondary);

  static TextStyle get caption => GoogleFonts.outfit(
    fontSize: 11, fontWeight: FontWeight.normal, color: AppColors.textMuted);

  static TextStyle get label => GoogleFonts.outfit(
    fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary);

  static TextStyle get button => GoogleFonts.outfit(
    fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
    letterSpacing: 0.5);

  // ── Aliases used by generated / older widgets ──────────────────────────────
  /// Alias for [headingLarge] (24 px bold).
  static TextStyle get heading1 => headingLarge;

  /// Alias for [headingMedium] (20 px semi-bold).
  static TextStyle get heading2 => headingMedium;

  /// Alias for [headingSmall] (18 px semi-bold).
  static TextStyle get heading3 => headingSmall;

  /// Alias for [body] (14 px normal).
  static TextStyle get bodyMedium => body;

  /// Alias for [titleMedium] (14 px semi-bold).
  static TextStyle get labelMedium => titleMedium;
}
