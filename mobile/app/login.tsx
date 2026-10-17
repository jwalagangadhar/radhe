import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { API_BASE_URL } from "../src/api/client";
import { sendCustomerOtpApi, verifyCustomerOtpApi } from "../src/api/auth";

type LoginMode = "customer" | "staff";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<LoginMode>("customer");

  // Staff Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customer OTP State
  const [customerPhone, setCustomerPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");

  // OTP Cooldown timer
  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleStaffLogin = async () => {
    if (!identifier.trim()) {
      setErrorMessage("Please enter your username or email");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await login(identifier.trim(), password);
      if (user.role === "ADMIN") {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(worker)/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await sendCustomerOtpApi(cleanPhone, "+91");
      if (res.success) {
        setOtpSent(true);
        setOtpCooldown(res.cooldownSeconds || 60);
        if (res.simulatedOtp) {
          setSimulatedOtp(res.simulatedOtp);
          setOtpCode(res.simulatedOtp); // Auto-fill in dev mode for convenience
        }
      } else {
        setErrorMessage(res.error || "Failed to send OTP. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyCustomerOtpApi(cleanPhone, otpCode.trim(), "+91", customerName.trim() || undefined);
      if (res.success) {
        router.replace("/(customer)/catalog" as any);
      } else {
        setErrorMessage(res.error || "Invalid OTP code. Please check and re-enter.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="storefront-outline" size={40} color="#2563eb" />
            </View>
            <Text style={styles.appTitle}>Rajyalakshmi Radhe Traders</Text>
            <Text style={styles.appSubtitle}>Wholesale Godown & Mobile Store</Text>
          </View>

          {/* Mode Selector Tabs */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeTab, mode === "customer" && styles.modeTabActive]}
              onPress={() => {
                setMode("customer");
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="cellphone-check"
                size={18}
                color={mode === "customer" ? "#1e40af" : "#64748b"}
              />
              <Text style={[styles.modeTabText, mode === "customer" && styles.modeTabTextActive]}>
                Customer (OTP)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === "staff" && styles.modeTabActive]}
              onPress={() => {
                setMode("staff");
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="shield-account"
                size={18}
                color={mode === "staff" ? "#1e40af" : "#64748b"}
              />
              <Text style={[styles.modeTabText, mode === "staff" && styles.modeTabTextActive]}>
                Staff Login
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#dc2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {mode === "customer" ? (
              /* CUSTOMER OTP LOGIN FORM */
              <View>
                <Text style={styles.formTitle}>Customer Login</Text>
                <Text style={styles.formSubtitle}>
                  {otpSent
                    ? `Enter the 6-digit OTP sent to +91 ${customerPhone}`
                    : "Instant access with verified Mobile OTP"}
                </Text>

                {!otpSent ? (
                  /* STEP 1: Enter Phone Number */
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mobile Phone Number</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.phonePrefix}>
                          <Text style={styles.flagEmoji}>🇮🇳</Text>
                          <Text style={styles.prefixText}>+91</Text>
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="10-digit number (e.g. 9876543210)"
                          placeholderTextColor="#94a3b8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={customerPhone}
                          onChangeText={(val) => {
                            setCustomerPhone(val);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          editable={!loading}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitButtonText}>Send 6-Digit OTP</Text>
                          <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* STEP 2: Enter & Verify 6-digit OTP */
                  <View style={{ marginTop: 8 }}>
                    {simulatedOtp ? (
                      <View style={styles.simulatedOtpBox}>
                        <Text style={styles.simulatedOtpLabel}>⚡ Simulated Test OTP:</Text>
                        <Text style={styles.simulatedOtpCode}>{simulatedOtp}</Text>
                      </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>6-Digit OTP Code</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="numeric" size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.otpInput]}
                          placeholder="------"
                          placeholderTextColor="#94a3b8"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={(val) => {
                            setOtpCode(val);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          editable={!loading}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Shop / Business Name (Optional)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="storefront" size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. Sri Krishna Supermarket"
                          placeholderTextColor="#94a3b8"
                          value={customerName}
                          onChangeText={setCustomerName}
                          editable={!loading}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitButtonText}>Verify & Enter Store</Text>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={styles.resendRow}>
                      {otpCooldown > 0 ? (
                        <Text style={styles.cooldownText}>Resend code in {otpCooldown}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                          <Text style={styles.resendLink}>Resend OTP Code</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setSimulatedOtp(null);
                        }}
                      >
                        <Text style={styles.changePhoneLink}>Change Number</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* STAFF USERNAME / PASSWORD LOGIN */
              <View>
                <Text style={styles.formTitle}>Staff Sign In</Text>
                <Text style={styles.formSubtitle}>Access with your Admin or Worker credentials</Text>


                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username or Email</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. admin or worker"
                      placeholderTextColor="#94a3b8"
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleStaffLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Sign In to System</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>DIRECT ACCESS</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.customerStoreBtn}
              onPress={() => router.push("/(customer)/catalog" as any)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="storefront" size={20} color="#78350f" style={{ marginRight: 8 }} />
              <Text style={styles.customerStoreBtnText}>Browse Wholesale Catalog</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.serverIndicator}>
              <View style={styles.greenDot} />
              <Text style={styles.serverText} numberOfLines={1}>
                Backend: {API_BASE_URL}
              </Text>
            </View>
            <Text style={styles.securityNote}>
              Protected by Server-Side JWT Session & Hardware Keystore
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    flex: 1,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    height: 50,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    height: "100%",
  },
  eyeBtn: {
    padding: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    height: 52,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  customerStoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    height: 48,
    borderRadius: 12,
  },
  customerStoreBtnText: {
    color: "#78350f",
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  serverIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  serverText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  securityNote: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
  },
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  modeTabTextActive: {
    color: "#1e40af",
    fontWeight: "700",
  },
  phonePrefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    gap: 4,
  },
  flagEmoji: {
    fontSize: 16,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  simulatedOtpBox: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simulatedOtpLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065f46",
  },
  simulatedOtpCode: {
    fontSize: 16,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 2,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  cooldownText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  resendLink: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
  },
  changePhoneLink: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    textDecorationLine: "underline",
  },

});
