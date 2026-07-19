import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, RefreshControl, Modal, Alert, Share,
  ActivityIndicator, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getInvoices, exportCsv } from '../../services/invoices'
import { getCategories } from '../../services/categories'
import { getProjects } from '../../services/projects'
import InvoiceCard from '../../components/invoices/InvoiceCard'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import i18n from '../../i18n'
import colors from '../../theme/colors'

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function parseDate(str) {
  if (!str) return null
  // invoice_date comes as ISO 8601 from the API — parse directly
  const d = new Date(String(str))
  return isNaN(d.getTime()) ? null : d
}

function groupByMonth(invoices) {
  const map = {}
  invoices.forEach((inv) => {
    // invoice_date is a proper ISO datetime; invoice_datetime is the legacy DD/MM/YYYY string
    const d = parseDate(inv.invoice_date)
    const key = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : 'sin-fecha'
    if (!map[key]) map[key] = { items: [], total: 0 }
    map[key].items.push(inv)
    map[key].total += Number(inv.total_paid || 0)
  })
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const title = key === 'sin-fecha'
        ? 'Sin fecha'
        : (() => {
            const [year, month] = key.split('-')
            return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
          })()
      return { title, total: map[key].total, data: map[key].items }
    })
}

function getPresetRange(preset) {
  const now  = new Date()
  const y    = now.getFullYear()
  const m    = now.getMonth()
  const iso  = (d) => d.toISOString().split('T')[0]
  switch (preset) {
    case 'month':   return { date_from: iso(new Date(y, m, 1)),     date_to: iso(new Date(y, m + 1, 0)) }
    case '3months': return { date_from: iso(new Date(y, m - 2, 1)), date_to: iso(new Date(y, m + 1, 0)) }
    case '6months': return { date_from: iso(new Date(y, m - 5, 1)), date_to: iso(new Date(y, m + 1, 0)) }
    case 'year':    return { date_from: iso(new Date(y, 0, 1)),      date_to: iso(new Date(y, 11, 31)) }
    default:        return {}
  }
}

const DATE_PRESETS = [
  { key: 'month',   label: 'Este mes' },
  { key: '3months', label: 'Últ. 3 meses' },
  { key: '6months', label: 'Últ. 6 meses' },
  { key: 'year',    label: 'Este año' },
  { key: 'all',     label: 'Todo' },
]

export default function InvoicesScreen({ navigation }) {
  const [invoices,   setInvoices]   = useState([])
  const [categories, setCategories] = useState([])
  const [projects,   setProjects]   = useState([])
  const [filter,     setFilter]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)
  const [showFilter, setShowFilter] = useState(false)

  const [showExport,  setShowExport]  = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [csvPreset,   setCsvPreset]   = useState('all')
  const [csvCategory, setCsvCategory] = useState(null)
  const [csvProject,  setCsvProject]  = useState(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const params = filter ? { category: filter } : {}
      const [invRes, catRes, projRes] = await Promise.all([
        getInvoices(params),
        getCategories(),
        getProjects(),
      ])
      setInvoices(invRes.data || [])
      setCategories(catRes.data || [])
      setProjects(projRes.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = csvPreset !== 'all' ? getPresetRange(csvPreset) : {}
      if (csvCategory) params.category   = csvCategory
      if (csvProject)  params.project_id = csvProject
      const { data } = await exportCsv(params)
      await Share.share({ message: data, title: 'facturas.csv' })
    } catch {
      Alert.alert('Error', 'No se pudo exportar el CSV')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  const sections = groupByMonth(invoices)

  return (
    <View style={styles.container}>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter((v) => !v)}>
          <Ionicons name="filter-outline" size={16} color={colors.accent} />
          <Text style={styles.filterBtnText} numberOfLines={1}>
            {filter || i18n.t('invoices.all_categories')}
          </Text>
          <Ionicons name={showFilter ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.csvBtn} onPress={() => setShowExport(true)}>
          <Ionicons name="download-outline" size={16} color={colors.textInverse} />
          <Text style={styles.csvBtnText}>CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddInvoice')}>
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ── Category filter chips ── */}
      {showFilter && (
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, !filter && styles.chipActive]}
            onPress={() => { setFilter(null); setShowFilter(false) }}
          >
            <Text style={[styles.chipText, !filter && styles.chipTextActive]}>
              {i18n.t('invoices.all_categories')}
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, filter === cat.name && styles.chipActive]}
              onPress={() => { setFilter(cat.name); setShowFilter(false) }}
            >
              <Text style={[styles.chipText, filter === cat.name && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Grouped list ── */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionTotal}>${section.total.toFixed(2)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={i18n.t('invoices.no_invoices')}
            subtitle={i18n.t('invoices.no_invoices_sub')}
          />
        }
      />

      {/* ── CSV Export Modal ── */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Exportar CSV</Text>

            {/* Period presets */}
            <Text style={styles.modalLabel}>Período</Text>
            <View style={styles.presetGrid}>
              {DATE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.presetBtn, csvPreset === p.key && styles.presetBtnActive]}
                  onPress={() => setCsvPreset(p.key)}
                >
                  <Text style={[styles.presetText, csvPreset === p.key && styles.presetTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.modalLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !csvCategory && styles.chipActive]}
                onPress={() => setCsvCategory(null)}
              >
                <Text style={[styles.chipText, !csvCategory && styles.chipTextActive]}>Todas</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, csvCategory === cat.name && styles.chipActive]}
                  onPress={() => setCsvCategory(cat.name)}
                >
                  <Text style={[styles.chipText, csvCategory === cat.name && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Project */}
            <Text style={styles.modalLabel}>Proyecto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !csvProject && styles.chipActive]}
                onPress={() => setCsvProject(null)}
              >
                <Text style={[styles.chipText, !csvProject && styles.chipTextActive]}>Todos</Text>
              </TouchableOpacity>
              {projects.map((proj) => (
                <TouchableOpacity
                  key={proj.id}
                  style={[styles.chip, csvProject === proj.id && styles.chipActive]}
                  onPress={() => setCsvProject(proj.id)}
                >
                  <Text style={[styles.chipText, csvProject === proj.id && styles.chipTextActive]}>
                    {proj.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Summary of selection */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                {DATE_PRESETS.find((p) => p.key === csvPreset)?.label}
                {csvCategory ? ` · ${csvCategory}` : ''}
                {csvProject  ? ` · ${projects.find((p) => p.id === csvProject)?.name ?? ''}` : ''}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExport(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
                onPress={handleExport}
                disabled={exporting}
              >
                {exporting
                  ? <ActivityIndicator size="small" color={colors.textInverse} />
                  : (
                    <>
                      <Ionicons name="share-outline" size={16} color={colors.textInverse} />
                      <Text style={styles.exportBtnText}>Exportar</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnText: { flex: 1, fontSize: 13, color: colors.text },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  csvBtnText: { color: colors.textInverse, fontSize: 13, fontWeight: '600' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category chips
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: colors.textInverse, fontWeight: '600' },

  // Section list
  list: { paddingHorizontal: 12, paddingBottom: 32, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },

  // Presets
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: 13, color: colors.text },
  presetTextActive: { color: colors.textInverse, fontWeight: '600' },

  // Chip row inside modal
  chipRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },

  // Summary
  summaryBox: {
    marginTop: 14,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  summaryText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
  exportBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: colors.secondary,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
})
