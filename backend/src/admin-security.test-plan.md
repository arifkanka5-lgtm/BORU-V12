# V10 MFA security test cases
- Unauthorized admin request => 401.
- Admin without enrolled MFA => 403.
- Valid TOTP => succeeds once, repeated code => 401.
- TOTP from previous/next time step accepted only within window and never reused.
- Invalid code, wrong key, missing encryption key => no admin access.
- Enroll -> confirm -> access with new code.
- Cross-country report access denied as in V9.
- Payment verification without store credentials remains fail-closed (503).
- LiveKit seat permissions and banned users require real server integration tests.
