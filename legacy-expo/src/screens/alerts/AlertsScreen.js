import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Modal, TextInput,
  Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getAlerts, createAlert, deleteAlert } from '../../services/alerts'
import { getCategories } from '../../services/categories'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import i18n from '../../i18n'
import colors from '../../theme/colors'

function AlertCard({ alert, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardCategory}>{alert.category}</Text>
          <Text style={styles.cardLimit}>${Number(alert.amount_limit).toFixed(2)}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {alert.period === 'weekly' ? i18n.t('alerts.weekly') : i18n.t('alerts.monthly')}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: alert.scope === 'family' ? '#e8f4f0' : colors.background }]}>
              <Text style={styles.badgeText}>
                {alert.scope === 'family' ? i18n.t('alerts.family') : i18n.t('alerts.personal')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.activeDot, !alert.active && styles.activeDotOff]} />
          <Text style={styles.activeLabel}>{alert.active ? i18n.t('alerts.active') : 'Inactiva'}</Text>
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function AlertsScreen() {
  const [alerts,      setAlerts]      = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [catModal,    setCatModal]    = useState(false)

  const [form, setForm] = useState({
    category: '',
    amount_limit: '',
    period: 'monthly',
    scope: 'personal',
  })

  const load = useCallback(async () => {
    try {
      setError(null)
      const [alertRes, catRes] = await Promise.all([getAlerts(), getCategories()])
      setAlerts(alertRes.data || [])
      setCategories(catRes.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const handleDelete = (id) => {
    Alert.alert('Eliminar alerta', '¿Eliminar esta alerta?', [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAlert(id)
            load()
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la alerta')
          }
        },
      },
    ])
  }

  const handleCreate = async () => {
    if (!form.category || !form.amount_limit) {
      return Alert.alert('Error', 'Categoría y monto son requeridos')
    }
    setSaving(true)
    try {
      await createAlert({
        category:     form.category,
        amount_limit: Number(form.amount_limit),
        period:       form.period,
        scope:        form.scope,
      })
      setModalOpen(false)
      setForm({ category: '', amount_limit: '', period: 'monthly', scope: 'personal' })
      load()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Error al crear la alerta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addBtnText}>{i18n.t('alerts.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <AlertCard alert={item} onDelete={() => handleDelete(item.id)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={i18n.t('alerts.no_alerts')}
            subtitle={i18n.t('alerts.no_alerts_sub')}
          />
        }
      />

      {/* Create alert modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('alerts.add')}</Text>

            <Text style={styles.label}>{i18n.t('alerts.category')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setCatModal(true)}>
              <Text style={[styles.pickerBtnText, !form.category && { color: colors.border }]}>
                {form.category || 'Seleccionar...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('alerts.amount_label')}</Text>
            <TextInput
              style={styles.input}
              value={form.amount_limit}
              onChangeText={(v) => setForm((f) => ({ ...f, amount_limit: v }))}
              keyboardType="numeric"
              placeholder="100.00"
              placeholderTextColor={colors.border}
            />

            <Text style={styles.label}>{i18n.t('alerts.period')}</Text>
            <View style={styles.segmentRow}>
              {['monthly', 'weekly'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.segBtn, form.period === p && styles.segBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, period: p }))}
                >
                  <Text style={[styles.segBtnText, form.period === p && styles.segBtnTextActive]}>
                    {p === 'monthly' ? i18n.t('alerts.monthly') : i18n.t('alerts.weekly')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{i18n.t('alerts.scope')}</Text>
            <View style={styles.segmentRow}>
              {['personal', 'family'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.segBtn, form.scope === s && styles.segBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, scope: s }))}
                >
                  <Text style={[styles.segBtnText, form.scope === s && styles.segBtnTextActive]}>
                    {s === 'family' ? i18n.t('alerts.family') : i18n.t('alerts.personal')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={colors.textInverse} />
                  : <Text style={styles.saveBtnText}>{i18n.t('alerts.create')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category picker */}
      <Modal visible={catModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('alerts.category')}</Text>
            <FlatList
              data={categories}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.catItem}
                  onPress={() => { setForm((f) => ({ ...f, category: item.name })); setCatModal(false) }}
                >
                  <Text style={styles.catItemText}>{item.name}</Text>
                  {form.category === item.name && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtnFull} onPress={() => setCatModal(false)}>
              <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  cardLimit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  activeDotOff: {
    backgroundColor: colors.border,
  },
  activeLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  deleteBtn: {
    padding: 4,
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
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerBtnText: {
    fontSize: 14,
    color: colors.text,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segBtnText: {
    fontSize: 13,
    color: colors.text,
  },
  segBtnTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  cancelBtnFull: {
    margin: 12,
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
  catItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  catItemText: {
    fontSize: 15,
    color: colors.text,
  },
})
