import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { createInvoice } from '../../services/invoices'
import i18n from '../../i18n'
import colors from '../../theme/colors'

export default function AddInvoiceScreen({ navigation }) {
  const [cufe,     setCufe]     = useState('')
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [scanning, setScanning] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync()
    if (!text) return
    const trimmed = text.trim()
    try {
      const url = new URL(trimmed)
      const chFE = url.searchParams.get('chFE')
      setCufe(chFE || trimmed)
    } catch {
      setCufe(trimmed)
    }
  }

  const handleScan = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission()
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para escanear')
        return
      }
    }
    setScanning(true)
  }

  const handleBarcodeScanned = ({ data }) => {
    setScanning(false)
    const text = data.trim()
    try {
      const url = new URL(text)
      const chFE = url.searchParams.get('chFE')
      setCufe(chFE || text)
    } catch {
      setCufe(text)
    }
  }

  const handleFetch = async () => {
    const cleaned = cufe.trim()
    if (!cleaned) return
    setLoading(true)
    setPreview(null)
    try {
      const { data } = await createInvoice(cleaned)
      // Backend returns the saved invoice on success
      setPreview(data)
      Alert.alert(
        i18n.t('invoices.saved_ok'),
        `${data.issuer_name} — $${Number(data.total_paid).toFixed(2)}`,
        [
          { text: 'Ver detalle', onPress: () => navigation.replace('InvoiceDetail', { id: data.id }) },
          { text: 'Agregar otra', onPress: () => { setCufe(''); setPreview(null) } },
        ]
      )
    } catch (err) {
      const status = err.response?.status
      const data = err.response?.data

      if (status === 409) {
        // Duplicate CUFE — two distinct cases from the backend:
        // - already saved by MY family: `existing_invoice` is present, we can link to it.
        // - already registered by ANOTHER family: `existing_invoice` is intentionally
        //   omitted (the backend no longer leaks foreign family data), so we must not
        //   assume it exists here.
        if (data?.existing_invoice) {
          Alert.alert(i18n.t('invoices.already_saved'), '', [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            { text: 'Ver detalle', onPress: () => navigation.replace('InvoiceDetail', { id: data.existing_invoice.id }) },
          ])
        } else {
          Alert.alert('Aviso', data?.error || i18n.t('invoices.already_registered_other'))
        }
      } else if (status === 429) {
        Alert.alert('Aviso', data?.error || 'Demasiadas solicitudes. Intenta de nuevo en un momento.')
      } else {
        const msg = data?.error || data?.errors?.join(', ') || 'Error al consultar la factura'
        Alert.alert('Error', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (scanning) {
    return (
      <View style={styles.scanContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'code128', 'code39'] }}
        />
        <View style={styles.scanOverlay}>
          <Text style={styles.scanHint}>Apunta la cámara al código QR de la factura</Text>
          <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
            <Text style={styles.cancelScanText}>{i18n.t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>{i18n.t('invoices.enter_cufe')}</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={cufe}
          onChangeText={setCufe}
          placeholder={i18n.t('invoices.cufe_placeholder')}
          placeholderTextColor={colors.border}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handlePaste}>
          <Text style={styles.secondaryBtnText}>{i18n.t('invoices.paste_cufe')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleScan}>
          <Text style={styles.secondaryBtnText}>{i18n.t('invoices.scan_cufe')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!cufe.trim() || loading) && styles.submitBtnDisabled]}
        onPress={handleFetch}
        disabled={!cufe.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitBtnText}>{i18n.t('invoices.submit')}</Text>
        )}
      </TouchableOpacity>

      {preview && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Vista previa</Text>
          <Text style={styles.previewIssuer}>{preview.issuer_name}</Text>
          <Text style={styles.previewAmount}>${Number(preview.total_paid).toFixed(2)}</Text>
          <Text style={styles.previewCategory}>{preview.category}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scanContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  scanHint: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 10,
  },
  cancelScan: {
    backgroundColor: colors.danger,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelScanText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  hint: {
    fontSize: 15,
    color: colors.textLight,
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  preview: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  previewTitle: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewIssuer: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  previewCategory: {
    fontSize: 14,
    color: colors.muted,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
})
