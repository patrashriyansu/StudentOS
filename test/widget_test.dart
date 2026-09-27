import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_os/app.dart';

void main() {
  testWidgets('StudentOS smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: StudentOSApp()),
    );
    expect(find.byType(StudentOSApp), findsOneWidget);
  });
}
