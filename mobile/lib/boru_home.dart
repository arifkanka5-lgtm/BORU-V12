import 'package:flutter/material.dart';
import 'boru_theme.dart';

class BoruHome extends StatelessWidget {
  final VoidCallback onRooms;
  final VoidCallback onVip;

  const BoruHome({
    super.key,
    required this.onRooms,
    required this.onVip,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        const Center(
          child: Icon(Icons.nights_stay, size: 56, color: BoruTheme.gold),
        ),
        const Center(
          child: Text('BÖRÜ',
            style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold,
              letterSpacing: 6, color: BoruTheme.gold)),
        ),
        const Center(
          child: Text('GLOBAL SESLİ SOHBET',
            style: TextStyle(letterSpacing: 3)),
        ),
        const SizedBox(height: 28),
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: BoruTheme.vipGradient,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.workspace_premium,
                color: Colors.black, size: 34),
              const Text('BÖRÜ VIP DÜNYASI',
                style: TextStyle(color: Colors.black,
                  fontSize: 22, fontWeight: FontWeight.bold)),
              const Text('Özel odalar, ayrıcalıklar ve etkinlikler',
                style: TextStyle(color: Colors.black87)),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: onVip,
                child: const Text('VIP Alanını Keşfet'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 26),
        const Text('POPÜLER SESLİ ODALAR',
          style: TextStyle(fontSize: 18,
            fontWeight: FontWeight.bold, color: BoruTheme.gold)),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.mic, color: BoruTheme.purple),
            title: const Text('Canlı Sesli Sohbet'),
            subtitle: const Text('Odaları keşfet ve sohbete katıl'),
            trailing: const Icon(Icons.chevron_right),
            onTap: onRooms,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: BoruTheme.purpleGradient,
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Row(
            children: [
              Icon(Icons.celebration, color: Colors.white, size: 32),
              SizedBox(width: 12),
              Expanded(
                child: Text('BÖRÜ ETKİNLİKLERİ\nYeni etkinlikler yakında!',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
