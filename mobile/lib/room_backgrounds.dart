import 'package:flutter/material.dart';

class RoomBackgrounds {
  static const files = [
    'wolf_vip.png',
    'gold_lounge.png',
    'purple_lounge.png',
    'classic_dark.png',
  ];

  static const names = [
    'Kurt VIP',
    'Gold Lounge',
    'Purple Lounge',
    'Classic Dark',
  ];

  static String path(int index) =>
      'assets/images/${files[index]}';
}

class RoomBackgroundPicker extends StatefulWidget {
  final ValueChanged<int> onSelected;
  final int initialIndex;

  const RoomBackgroundPicker({
    super.key,
    required this.onSelected,
    this.initialIndex = 0,
  });

  @override
  State<RoomBackgroundPicker> createState() =>
      _RoomBackgroundPickerState();
}

class _RoomBackgroundPickerState
    extends State<RoomBackgroundPicker> {
  late int selected;

  @override
  void initState() {
    super.initState();
    selected = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate:
          const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.8,
      ),
      itemCount: RoomBackgrounds.files.length,
      itemBuilder: (context, index) {
        final active = selected == index;

        return InkWell(
          onTap: () {
            setState(() => selected = index);
            widget.onSelected(index);
          },
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: active
                    ? const Color(0xFFE9B653)
                    : Colors.white24,
                width: active ? 3 : 1,
              ),
              image: DecorationImage(
                image: AssetImage(
                  RoomBackgrounds.path(index),
                ),
                fit: BoxFit.cover,
              ),
            ),
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              color: Colors.black87,
              child: Text(
                RoomBackgrounds.names[index],
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
