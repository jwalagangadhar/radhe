import { encryptField, decryptField, maskSensitivePhone, encryptPayload, decryptPayload } from "@/lib/encryption";
import { createCustomerToken, verifyCustomerToken } from "@/lib/customer-auth";
import { createToken, verifyToken } from "@/lib/auth";

async function runTests() {
  console.log("--- 1. Testing Field Encryption ---");
  const plainText = "+919876543210";
  const encrypted = encryptField(plainText);
  console.log("Plain:", plainText);
  console.log("Encrypted:", encrypted);
  if (!encrypted.startsWith("enc:v1:")) throw new Error("Invalid prefix");
  
  const decrypted = decryptField(encrypted);
  console.log("Decrypted:", decrypted);
  if (decrypted !== plainText) throw new Error("Decryption mismatch");

  console.log("--- 2. Testing Masking ---");
  const masked = maskSensitivePhone(encrypted);
  console.log("Masked phone:", masked);

  console.log("--- 3. Testing Customer Token End-to-End Encryption ---");
  const customer = {
    id: "cust_123",
    phone: "+919876543210",
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    status: "ACTIVE"
  };
  const token = await createCustomerToken(customer);
  console.log("Encrypted Customer Token generated successfully.");
  
  // Verify token
  const verified = await verifyCustomerToken(token);
  console.log("Verified Customer Token payload:", verified);
  if (verified.phone !== customer.phone || verified.id !== customer.id) {
    throw new Error("Customer token verification mismatch");
  }

  console.log("--- 4. Testing Staff Token End-to-End Encryption ---");
  const staff = {
    id: "usr_admin_1",
    username: "admin",
    role: "ADMIN",
    name: "System Admin",
    email: "admin@example.com"
  };
  const staffToken = await createToken(staff);
  const verifiedStaff = await verifyToken(staffToken);
  console.log("Verified Staff Token payload:", verifiedStaff);
  if (verifiedStaff.username !== staff.username || verifiedStaff.role !== "ADMIN") {
    throw new Error("Staff token verification mismatch");
  }

  console.log("\nALL ENCRYPTION & AUTH VERIFICATION TESTS PASSED!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
