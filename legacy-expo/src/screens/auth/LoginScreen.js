import React, { useState, useContext } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Modal, ActivityIndicator,
} from 'react-native'
import { AuthContext } from '../../context/AuthContext'
import LanguageToggle from '../../components/common/LanguageToggle'
import i18n from '../../i18n'
import colors from '../../theme/colors'

export default function LoginScreen({ navigation }) {
  const { login, confirm } = useContext(AuthContext)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  // Lets a user who registered (or accepted a family invitation) in a
  // previous session — and never confirmed — enter their confirmation token
  // without having to register again.
  const [confirmModal, setConfirmModal] = useState(false)
  const [confirmToken, setConfirmToken] = useState('')
  const [confirming,   setConfirming]   = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const status = err.response?.status
      const serverMsg = err.response?.data?.error || err.response?.data?.detail
      const networkErr = !err.response && err.request

      if (status === 403 && err.response?.data?.requires_confirmation) {
        Alert.alert(
          'Error',
          serverMsg,
          [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            { text: i18n.t('auth.confirm_button'), onPress: () => setConfirmModal(true) },
          ]
        )
      } else {
        const msg = serverMsg
          || (networkErr ? 'No se pudo conectar al servidor. Verifica tu red.' : i18n.t('auth.error_invalid'))
        Alert.alert('Error', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirmToken.trim()) return
    setConfirming(true)
    try {
      await confirm(confirmToken.trim())
      setConfirmModal(false)
      setConfirmToken('')
      // On success AuthContext sets `user` and AppNavigator switches stacks.
    } catch (err) {
      const msg = err.response?.data?.error || 'Token de confirmación inválido'
      Alert.alert('Error', msg)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <LanguageToggle />
        </View>

        <View style={styles.header}>
          <Text style={styles.appName}>Facturas Familia</Text>
          <Text style={styles.title}>{i18n.t('auth.login_title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.login_sub')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.border}
          />

          <Text style={styles.label}>{i18n.t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.border}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? i18n.t('common.loading') : i18n.t('auth.login')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t('auth.no_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>{i18n.t('auth.sign_up')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.confirmLink} onPress={() => setConfirmModal(true)}>
          <Text style={styles.confirmLinkText}>{i18n.t('auth.confirm_pending_link')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pending confirmation modal — for a token received in a previous
          session (e.g. right after registering, or accepting a family
          invitation) that wasn't confirmed yet. */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('auth.confirm_title')}</Text>
            <Text style={styles.modalMessage}>{i18n.t('auth.requires_confirmation_hint')}</Text>

            <Text style={styles.label}>{i18n.t('auth.confirm_token_input_label')}</Text>
            <TextInput
              style={styles.input}
              value={confirmToken}
              onChangeText={setConfirmToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={i18n.t('auth.confirm_token_input_label')}
              placeholderTextColor={colors.border}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setConfirmModal(false); setConfirmToken('') }}>
                <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (confirming || !confirmToken.trim()) && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={confirming || !confirmToken.trim()}
              >
                {confirming
                  ? <ActivityIndicator color={colors.textInverse} />
                  : <Text style={styles.saveBtnText}>{i18n.t('auth.confirm_button')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  topRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  header: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textLight,
    fontSize: 14,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  confirmLinkText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  // Confirmation modal (same visual pattern as the family invite modal)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 8,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
})
