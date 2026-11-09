import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { User, Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { registerUser, getAuthErrorMessage } from '../../services/auth.service';
import colors from '../../theme/colors';

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    // Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }
    // Mật khẩu tối thiểu 6 ký tự theo yêu cầu đề bài
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(trimmedName, trimmedEmail, password);
      // Đăng ký thành công, Firebase Auth tự động chuyển sang trạng thái đã đăng nhập
    } catch (error: any) {
      const msg = getAuthErrorMessage(error);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nút quay lại */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.text} />
          <Text style={styles.backText}>Đăng nhập</Text>
        </TouchableOpacity>

        {/* Tiêu đề */}
        <View style={styles.header}>
          <Text style={styles.title}>Tạo Tài Khoản</Text>
          <Text style={styles.subtitle}>Điền thông tin để bắt đầu trò chuyện</Text>
        </View>

        {/* Thông báo lỗi */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form đăng ký */}
        <View style={styles.form}>
          <Text style={styles.label}>Họ và tên</Text>
          <View style={styles.inputContainer}>
            <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nguyễn Văn A"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự)</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập ít nhất 6 ký tự..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <Text style={styles.label}>Nhập lại mật khẩu</Text>
          <View style={styles.inputContainer}>
            <CheckCircle2 size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận lại mật khẩu..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Đăng Ký Tài Khoản</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Chuyển sang Đăng nhập */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 6,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  button: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
