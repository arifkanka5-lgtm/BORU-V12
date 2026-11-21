import 'package:flutter/material.dart';

class BoruTheme {
  static const background = Color(0xFF0B0D20);
  static const purple = Color(0xFF7B2FE8);
  static const gold = Color(0xFFE9B653);
  static const panel = Color(0xFF1B1838);
  static const blue = Color(0xFF718CFF);

  static const vipGradient = LinearGradient(
    colors: [Color(0xFFFFD77A), Color(0xFFB97819)],
  );

  static const purpleGradient = LinearGradient(
    colors: [Color(0xFFAA40FF), Color(0xFF5916C8)],
  );

  static final dark = ThemeData.dark().copyWith(
    scaffoldBackgroundColor: background,
    colorScheme: const ColorScheme.dark(
      primary: purple,
      secondary: gold,
      surface: panel,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: background,
      foregroundColor: Colors.white,
      centerTitle: true,
    ),
    cardTheme: const CardThemeData(
      color: panel,
      elevation: 2,
      margin: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: panel,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}
