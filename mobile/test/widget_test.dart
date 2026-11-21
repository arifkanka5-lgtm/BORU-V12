import 'package:flutter_test/flutter_test.dart';
import 'package:boru_mobile/main.dart';

void main() {
  testWidgets('BÖRÜ giriş ekranı açılıyor', (tester) async {
    await tester.pumpWidget(const BoruApp());

    expect(find.text('BÖRÜ'), findsOneWidget);
    expect(find.text('Giriş Yap'), findsOneWidget);
    expect(find.text('Yeni hesap oluştur'), findsOneWidget);
  });
}
