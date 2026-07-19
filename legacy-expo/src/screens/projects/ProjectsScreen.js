import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Modal, TextInput,
  Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getProjects, createProject } from '../../services/projects'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import i18n from '../../i18n'
import colors from '../../theme/colors'

function ProjectCard({ project, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={1}>{project.name}</Text>
        <View style={[styles.typeBadge, project.project_type === 'family' && styles.typeBadgeFamily]}>
          <Text style={styles.typeBadgeText}>
            {project.project_type === 'family' ? i18n.t('projects.type_family') : i18n.t('projects.type_personal')}
          </Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardTotal}>${Number(project.total_amount || 0).toFixed(2)}</Text>
        <Text style={styles.cardCount}>{project.invoices_count ?? 0} {i18n.t('projects.invoices_count')}</Text>
      </View>
      {(project.start_date || project.end_date) && (
        <Text style={styles.cardDates}>
          {project.start_date} {project.end_date ? `→ ${project.end_date}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function ProjectsScreen({ navigation }) {
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({ name: '', project_type: 'personal', start_date: '', end_date: '' })

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await getProjects()
      setProjects(data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const handleCreate = async () => {
    if (!form.name.trim()) return Alert.alert('Error', 'El nombre es requerido')
    setSaving(true)
    try {
      await createProject({
        name:         form.name.trim(),
        project_type: form.project_type,
        start_date:   form.start_date || undefined,
        end_date:     form.end_date   || undefined,
      })
      setModalOpen(false)
      setForm({ name: '', project_type: 'personal', start_date: '', end_date: '' })
      load()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.errors?.join(', ') || 'Error al crear el proyecto')
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
          <Text style={styles.addBtnText}>{i18n.t('projects.new_project')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate('ProjectDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title={i18n.t('projects.no_projects')}
            subtitle={i18n.t('projects.no_projects_sub')}
          />
        }
      />

      {/* Create project modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('projects.new_project')}</Text>

            <Text style={styles.label}>{i18n.t('projects.name')}</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={i18n.t('projects.name_placeholder')}
              placeholderTextColor={colors.border}
            />

            <Text style={styles.label}>{i18n.t('projects.type')}</Text>
            <View style={styles.typeRow}>
              {['personal', 'family'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, form.project_type === t && styles.typeBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, project_type: t }))}
                >
                  <Text style={[styles.typeBtnText, form.project_type === t && styles.typeBtnTextActive]}>
                    {t === 'family' ? i18n.t('projects.type_family') : i18n.t('projects.type_personal')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{i18n.t('projects.start_date')} (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.start_date}
              onChangeText={(v) => setForm((f) => ({ ...f, start_date: v }))}
              placeholder="2026-01-01"
              placeholderTextColor={colors.border}
            />

            <Text style={styles.label}>{i18n.t('projects.end_date')} (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.end_date}
              onChangeText={(v) => setForm((f) => ({ ...f, end_date: v }))}
              placeholder="2026-12-31"
              placeholderTextColor={colors.border}
            />

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
                  : <Text style={styles.saveBtnText}>{i18n.t('common.save')}</Text>
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeFamily: {
    backgroundColor: '#e8f4f0',
  },
  typeBadgeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  cardCount: {
    fontSize: 12,
    color: colors.textLight,
  },
  cardDates: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 4,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  typeBtnTextActive: {
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
