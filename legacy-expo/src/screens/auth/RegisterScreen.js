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

const MIN_PASSWORD_LENGTH = 10

export default function RegisterScreen({ navigation }) {
  const { register, confirm } = useContext(AuthContext)
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [familyName, setFamilyName] = useState('')
  const [loading,    setLoading]    = useState(false)

  // Registration no longer logs the user in directly — the backend creates
  // an unconfirmed account and returns a confirmation token that must be
  // exchanged via /auth/confirm. `pendingConfirmation` holds that response
  // while the confirmation modal is shown.
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [confirmToken,        setConfirmToken]        = useState('')
  const [confirming,          setConfirming]          = useState(false)

  const handleRegister = async () => {
    if (!name || !email || !password || !familyName) {
      Alert.alert('Error', 'Completa todos los campos')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', i18n.t('auth.password_too_short'))
      return
    }
    setLoading(true)
    try {
      const data = await register(name.trim(), email.trim(), password, familyName.trim())
      setPendingConfirmation(data)
      // NOTE (dev-only placeholder): there is no email/SMTP server configured
      // yet, so the backend returns the confirmation token directly in the
      // register response instead of emailing it. We prefill the field with
      // it purely as a development convenience. In production the token must
      // NEVER be shown in the UI — it must arrive only via a real email sent
      // by the backend, and this prefill line must be removed.
      setConfirmToken(data.confirmation_token || '')
    } catch (err) {
      const msg = err.response?.data?.errors?.join(', ') || err.response?.data?.error || 'Error al registrar'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirmToken.trim()) return
    setConfirming(true)
    try {
      await confirm(confirmToken.trim())
      // On success AuthContext sets `user`, and AppNavigator switches to the
      // main app stack automatically — nothing else to navigate here.
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
          <Text style={styles.title}>{i18n.t('auth.register_title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.register_sub')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('auth.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ariel Delgado"
            placeholderTextColor={colors.border}
          />

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
            placeholder="••••••••••"
            placeholderTextColor={colors.border}
          />
          <Text style={[styles.hint, password.length > 0 && password.length < MIN_PASSWORD_LENGTH && styles.hintWarning]}>
            {i18n.t('auth.password_hint')}
          </Text>

          <Text style={styles.label}>{i18n.t('auth.family_name')}</Text>
          <TextInput
            style={styles.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="Familia Delgado"
            placeholderTextColor={colors.border}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? i18n.t('common.loading') : i18n.t('auth.register')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t('auth.have_account')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>{i18n.t('auth.sign_in')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation modal — shown right after a successful register().
          Follows the same tokenBox pattern used for family invitations
          (see FamilyScreen). */}
      <Modal visible={!!pendingConfirmation} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('auth.confirm_title')}</Text>
            <Text style={styles.modalMessage}>{i18n.t('auth.confirm_message')}</Text>

            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>{i18n.t('auth.confirmation_token_label')}</Text>
              <Text style={styles.tokenValue} selectable>{pendingConfirmation?.confirmation_token}</Text>
            </View>

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

            <TouchableOpacity
              style={[styles.button, (confirming || !confirmToken.trim()) && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={confirming || !confirmToken.trim()}
            >
              {confirming
                ? <ActivityIndicator color={colors.textInverse} />
                : <Text style={styles.buttonText}>{i18n.t('auth.confirm_button')}</Text>
              }
            </TouchableOpacity>
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
    marginBottom: 28,
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
  hint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  hintWarning: {
    color: colors.danger,
    fontWeight: '600',
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
    marginBottom: 16,
    lineHeight: 18,
  },
  tokenBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  tokenLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  tokenValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
})
