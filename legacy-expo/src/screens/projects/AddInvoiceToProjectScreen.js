import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getInvoices, getInvoice } from '../../services/invoices'
import { addInvoice } from '../../services/projects'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import i18n from '../../i18n'
import colors from '../../theme/colors'

export default function AddInvoiceToProjectScreen({ route, navigation }) {
  const { projectId } = route.params

  // Step 1: pick invoice — Step 2: pick items
  const [step,          setStep]          = useState(1)
  const [invoices,      setInvoices]      = useState([])
  const [search,        setSearch]        = useState('')
  const [loadingList,   setLoadingList]   = useState(true)
  const [selectedInv,   setSelectedInv]   = useState(null)
  const [invDetail,     setInvDetail]     = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [includeAll,    setIncludeAll]    = useState(true)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [saving,        setSaving]        = useState(false)

  const loadInvoices = useCallback(async () => {
    try {
      const { data } = await getInvoices()
      setInvoices(data || [])
    } catch {
      Alert.alert('Error', 'No se pudo cargar las facturas')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const handleSelectInvoice = async (inv) => {
    setSelectedInv(inv)
    setLoadingDetail(true)
    setStep(2)
    try {
      const { data } = await getInvoice(inv.id)
      setInvDetail(data)
      setIncludeAll(true)
      setSelectedItems(new Set())
    } catch {
      Alert.alert('Error', 'No se pudo cargar el detalle')
      setStep(1)
    } finally {
      setLoadingDetail(false)
    }
  }

  const toggleItem = (itemId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const handleSave = async () => {
    if (!includeAll && selectedItems.size === 0) {
      return Alert.alert('Error', 'Selecciona al menos un ítem')
    }
    setSaving(true)
    try {
      await addInvoice(projectId, {
        invoice_id:       selectedInv.id,
        include_all_items: includeAll,
        item_ids:         includeAll ? [] : [...selectedItems],
      })
      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo agregar la factura')
    } finally {
      setSaving(false)
    }
  }

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inv.issuer_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.cufe?.toLowerCase().includes(q)
    )
  })

  // ─── Step 1: pick invoice ─────────────────────────────────────────
  if (step === 1) {
    if (loadingList) return <LoadingSpinner />
    return (
      <View style={styles.container}>
        <Text style={styles.stepHint}>{i18n.t('projects.step1_hint')}</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={i18n.t('projects.search_invoice_placeholder')}
          placeholderTextColor={colors.border}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.invRow} onPress={() => handleSelectInvoice(item)} activeOpacity={0.75}>
              <View style={styles.invInfo}>
                <Text style={styles.invIssuer} numberOfLines={1}>{item.issuer_name}</Text>
                <Text style={styles.invMeta}>#{item.invoice_number}</Text>
              </View>
              <Text style={styles.invTotal}>${Number(item.total_paid || 0).toFixed(2)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title={i18n.t('projects.no_invoices_found')} />
          }
        />
      </View>
    )
  }

  // ─── Step 2: pick items ───────────────────────────────────────────
  const items = invDetail?.items || []

  const computedAmount = includeAll
    ? Number(selectedInv?.total_paid || 0)
    : items
        .filter((it) => selectedItems.has(it.id))
        .reduce((sum, it) => sum + Number(it.total || 0), 0)

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
        <Ionicons name="arrow-back" size={18} color={colors.accent} />
        <Text style={styles.backText}>{i18n.t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.stepHint}>{i18n.t('projects.step2_hint')}</Text>
      <Text style={styles.invName}>{selectedInv?.issuer_name}</Text>

      {loadingDetail ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Include all toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{i18n.t('projects.include_all_items')}</Text>
            <Switch
              value={includeAll}
              onValueChange={setIncludeAll}
              trackColor={{ true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Item list */}
          {!includeAll && (
            <FlatList
              data={items}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.itemRow, selectedItems.has(item.id) && styles.itemRowSelected]}
                  onPress={() => toggleItem(item.id)}
                >
                  <Ionicons
                    name={selectedItems.has(item.id) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selectedItems.has(item.id) ? colors.accent : colors.muted}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.itemMeta}>{item.quantity} × ${Number(item.unit_price || 0).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>${Number(item.total || 0).toFixed(2)}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 260 }}
            />
          )}

          {/* Amount preview */}
          <View style={styles.amountPreview}>
            <Text style={styles.amountLabel}>{i18n.t('projects.amount_in_project')}</Text>
            <Text style={styles.amountValue}>${computedAmount.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={colors.textInverse} />
              : <Text style={styles.saveBtnText}>{i18n.t('common.save')}</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepHint: {
    fontSize: 13,
    color: colors.textLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  invInfo: {
    flex: 1,
  },
  invIssuer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  invMeta: {
    fontSize: 12,
    color: colors.textLight,
  },
  invTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 16,
    paddingBottom: 0,
  },
  backText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  invName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRowSelected: {
    backgroundColor: '#eef6fc',
  },
  itemInfo: {
    flex: 1,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  amountPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  saveBtn: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
})
