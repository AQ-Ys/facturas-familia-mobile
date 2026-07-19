import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getInvoice, updateCategory } from '../../services/invoices'
import { getCategories } from '../../services/categories'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import i18n from '../../i18n'
import colors from '../../theme/colors'

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function formatDate(dt) {
  if (!dt) return i18n.t('common.na')
  const d = new Date(dt)
  if (isNaN(d)) return dt
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export default function InvoiceDetailScreen({ route }) {
  const { id } = route.params
  const [invoice,    setInvoice]    = useState(null)
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [saving,     setSaving]     = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [invRes, catRes] = await Promise.all([
        getInvoice(id),
        getCategories(),
      ])
      setInvoice(invRes.data)
      setCategories(catRes.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleCategoryChange = async (name) => {
    setSaving(true)
    setModalOpen(false)
    try {
      const { data } = await updateCategory(id, name)
      setInvoice((prev) => ({
        ...prev,
        category:         data.effective_category,
        user_category:    data.user_category,
        default_category: data.default_category,
      }))
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la categoría')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  const inv = invoice
  const items = inv.items || []
  const payments = (() => {
    const pm = inv.payment_methods
    if (!pm) return []
    if (Array.isArray(pm)) return pm
    if (typeof pm === 'string') {
      try { return JSON.parse(pm) } catch { return [] }
    }
    return []
  })()

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Category */}
        <View style={styles.categoryRow}>
          <View>
            <Text style={styles.categoryLabel}>{i18n.t('invoices.category')}</Text>
            <Text style={styles.categoryValue}>{inv.category || i18n.t('dashboard.uncategorized')}</Text>
            {inv.user_category ? (
              <Text style={styles.categoryHint}>{i18n.t('invoices.category_manual')}</Text>
            ) : (
              <Text style={styles.categoryHint}>{i18n.t('invoices.category_ai')}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editCatBtn} onPress={() => setModalOpen(true)} disabled={saving}>
            <Ionicons name="pencil-outline" size={16} color={colors.textInverse} />
            <Text style={styles.editCatText}>{i18n.t('common.edit')}</Text>
          </TouchableOpacity>
        </View>

        {/* Header info */}
        <Section title={i18n.t('invoices.detail_title')}>
          <Row label={i18n.t('invoices.invoice_number')} value={inv.invoice_number} />
          <Row label={i18n.t('invoices.date')}           value={formatDate(inv.invoice_datetime)} />
          <Row label={i18n.t('invoices.scope')}          value={inv.scope} />
          <Row label={i18n.t('invoices.consumer_type')}  value={inv.issuer_consumer_type} />
        </Section>

        {/* Issuer */}
        <Section title={i18n.t('invoices.issuer')}>
          <Row label="Nombre"    value={inv.issuer_name} />
          <Row label="RUC"       value={inv.issuer_ruc} />
          <Row label="DV"        value={inv.issuer_dv} />
          <Row label="Dirección" value={inv.issuer_address} />
          <Row label="Teléfono"  value={inv.issuer_phone} />
        </Section>

        {/* Receiver */}
        <Section title={i18n.t('invoices.receiver')}>
          <Row label="Nombre" value={inv.receiver_name} />
          <Row label="RUC"    value={inv.receiver_ruc} />
          <Row label="DV"     value={inv.receiver_dv} />
          <Row label="Tipo"   value={inv.receiver_type} />
        </Section>

        {/* Totals */}
        <Section title="Totales">
          <Row label="Subtotal"          value={`$${Number(inv.subtotal_amount || 0).toFixed(2)}`} />
          <Row label="ITBMS"             value={`$${Number(inv.itbms_amount || 0).toFixed(2)}`} />
          <Row label={i18n.t('invoices.total')} value={`$${Number(inv.total_paid || 0).toFixed(2)}`} />
        </Section>

        {/* Payment methods */}
        {payments.length > 0 && (
          <Section title={i18n.t('invoices.payment_methods')}>
            {payments.map((p, idx) => (
              <Row key={idx} label={p.method || p.forma_pago || 'Pago'} value={`$${Number(p.amount || p.monto || 0).toFixed(2)}`} />
            ))}
          </Section>
        )}

        {/* Line items */}
        {items.length > 0 && (
          <Section title={i18n.t('invoices.items')}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={styles.itemRow}>
                  <Text style={styles.itemMeta}>
                    {i18n.t('invoices.quantity')}: {item.quantity} × ${Number(item.unit_price || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.itemTotal}>${Number(item.total || 0).toFixed(2)}</Text>
                </View>
                {Number(item.itbms) > 0 && (
                  <Text style={styles.itemMeta}>ITBMS: ${Number(item.itbms).toFixed(2)}</Text>
                )}
              </View>
            ))}
          </Section>
        )}
      </ScrollView>

      {/* Category picker modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('invoices.category')}</Text>
            <FlatList
              data={categories}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, inv.category === item.name && styles.modalItemActive]}
                  onPress={() => handleCategoryChange(item.name)}
                >
                  <Text style={[styles.modalItemText, inv.category === item.name && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  {inv.category === item.name && (
                    <Ionicons name="checkmark" size={16} color={colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalOpen(false)}>
              <Text style={styles.modalCancelText}>{i18n.t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  editCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editCatText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  itemCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  itemDesc: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textLight,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  modalItemActive: {
    backgroundColor: colors.background,
  },
  modalItemText: {
    fontSize: 15,
    color: colors.text,
  },
  modalItemTextActive: {
    fontWeight: '600',
    color: colors.accent,
  },
  modalCancel: {
    margin: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
})
