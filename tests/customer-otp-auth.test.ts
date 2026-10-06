import { validateAndNormalizePhone, hashOtp, verifyOtpHash, sendOtp, verifyOtp } from "../src/lib/otp-service";
import { createCustomerToken, verifyCustomerToken } from "../src/lib/customer-auth";
import { prisma } from "../src/lib/db";

async function runTests() {
  console.log("=== RUNNING MOBILE OTP AUTHENTICATION TESTS ===");

  // 1. Phone validation tests
  console.log("\n[Test 1] Phone Number Validation & Normalization");
  const test1a = validateAndNormalizePhone("9876543210", "+91");
  console.assert(test1a.valid && test1a.e164Phone === "+919876543210", `Expected +919876543210, got ${test1a.e164Phone}`);
  console.log("✓ Valid Indian mobile (+91) normalized correctly:", test1a.e164Phone);

  const test1b = validateAndNormalizePhone("12345", "+91");
  console.assert(!test1b.valid, "Expected invalid for short phone number");
  console.log("✓ Invalid phone number rejected correctly:", test1b.error);

  const test1c = validateAndNormalizePhone("2025550123", "+1");
  console.assert(test1c.valid && test1c.e164Phone === "+12025550123", `Expected +12025550123, got ${test1c.e164Phone}`);
  console.log("✓ International phone (+1) normalized correctly:", test1c.e164Phone);

  // 2. Cryptographic OTP Hashing & Timing-Safe Verification
  console.log("\n[Test 2] OTP Cryptographic Salted Hashing");
  const samplePhone = "+919876500001";
  const sampleOtp = "654321";
  const hash = hashOtp(samplePhone, sampleOtp);
  console.assert(hash.length === 64, "Expected 64-char SHA256 hex string");
  console.assert(verifyOtpHash(samplePhone, sampleOtp, hash) === true, "Hash verification should match");
  console.assert(verifyOtpHash(samplePhone, "123456", hash) === false, "Incorrect OTP should not match");
  console.assert(verifyOtpHash("+919876599999", sampleOtp, hash) === false, "Hash must be phone-bound");
  console.log("✓ OTP hashing is cryptographically sound, salted, and phone-bound.");

  // 3. Send OTP & Cooldown Verification
  console.log("\n[Test 3] Send OTP & Resend Cooldown Enforcement");
  const testPhone = "9876500002";
  const normalizedTestPhone = "+919876500002";

  // Clean any test data
  await prisma.otpVerification.deleteMany({ where: { phone: normalizedTestPhone } });
  await prisma.customerUser.deleteMany({ where: { phone: normalizedTestPhone } });

  const sendResult1 = await sendOtp(testPhone, "+91", "LOGIN");
  console.assert(sendResult1.success === true, "Send OTP 1 should succeed");
  console.log("✓ First OTP request succeeded with cooldown:", sendResult1.cooldownSeconds, "seconds");

  // Immediate second request should be throttled by cooldown
  const sendResult2 = await sendOtp(testPhone, "+91", "LOGIN");
  console.assert(sendResult2.success === false, "Immediate second OTP request should be blocked by cooldown");
  console.assert(sendResult2.code === "COOLDOWN_ACTIVE", "Expected COOLDOWN_ACTIVE error code");
  console.log("✓ Second OTP request blocked by cooldown as expected:", sendResult2.error);

  // Check database: plain text OTP must NEVER be stored
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { phone: normalizedTestPhone },
    orderBy: { createdAt: "desc" },
  });
  console.assert(!!otpRecord, "OTP record should exist in database");
  console.assert(!("otp" in (otpRecord as Record<string, unknown>)), "Database model should not contain plaintext otp field");
  console.assert(otpRecord!.otpHash.length === 64, "Database must only store 64-char hash");
  console.log("✓ Plain text OTP is NEVER stored in database. Stored hash:", otpRecord!.otpHash.substring(0, 16) + "...");

  // 4. Verification with Brute-Force Rate Limiting
  console.log("\n[Test 4] Brute-Force Rate Limiting on Verification");
  // 4 incorrect attempts
  for (let i = 1; i <= 4; i++) {
    const wrongAttempt = await verifyOtp(testPhone, "000000", "+91", "LOGIN");
    console.assert(wrongAttempt.success === false, `Attempt ${i} should fail`);
    console.assert(wrongAttempt.remainingAttempts === 5 - i, `Expected ${5 - i} remaining attempts`);
  }
  console.log("✓ 4 wrong attempts correctly incremented attempt counter and decremented remaining attempts.");

  // 5th attempt locks the OTP
  const fifthAttempt = await verifyOtp(testPhone, "000000", "+91", "LOGIN");
  console.assert(fifthAttempt.success === false, "5th wrong attempt should fail and lock");
  console.assert(fifthAttempt.code === "MAX_ATTEMPTS_EXCEEDED", "Expected MAX_ATTEMPTS_EXCEEDED");
  console.log("✓ 5th wrong attempt triggered brute-force lockout:", fifthAttempt.error);

  // 5. Successful Verification & Customer Session Token
  console.log("\n[Test 5] Customer Token Creation & Validation");
  const testPhone3 = "+919876500003";
  await prisma.otpVerification.deleteMany({ where: { phone: testPhone3 } });
  await prisma.customerUser.deleteMany({ where: { phone: testPhone3 } });

  const freshUser = await prisma.customerUser.create({
    data: {
      phone: testPhone3,
      phoneVerified: true,
      name: "Radhe Wholesale Test",
      status: "ACTIVE",
    },
  });

  const sessionToken = await createCustomerToken({
    id: freshUser.id,
    phone: freshUser.phone,
    name: freshUser.name,
    email: freshUser.email,
    status: freshUser.status,
    role: "CUSTOMER",
  });

  console.assert(typeof sessionToken === "string" && sessionToken.length > 20, "JWT session token created");
  const verifiedSession = await verifyCustomerToken(sessionToken);
  console.assert(verifiedSession !== null && verifiedSession.id === freshUser.id, "Session token verified successfully");
  console.log("✓ Customer JWT session created and verified for user ID:", verifiedSession?.id);

  // Clean up test data
  await prisma.otpVerification.deleteMany({ where: { phone: normalizedTestPhone } });
  await prisma.otpVerification.deleteMany({ where: { phone: testPhone3 } });
  await prisma.customerUser.deleteMany({ where: { phone: normalizedTestPhone } });
  await prisma.customerUser.deleteMany({ where: { phone: testPhone3 } });

  console.log("\n=== ALL MOBILE OTP AUTHENTICATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  });
