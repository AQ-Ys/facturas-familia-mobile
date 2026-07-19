import React, { useState, useEffect, useCallback, useContext } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Modal,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  getProject, deleteProject,
  addMember, removeMember,
  removeInvoice,
} from '../../services/projects'
import { getFamily } from '../../services/family'
import { AuthContext } from '../../context/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import i18n from '../../i18n'
import colors from '../../theme/colors'

export default function ProjectDetailScreen({ route, navigation }) {
  const { id } = route.params
  const { user } = useContext(AuthContext)
  const [project,    setProject]    = useState(null)
  const [family,     setFamily]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)
  const [memberModal, setMemberModal] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [projRes, famRes] = await Promise.all([
        getProject(id),
        getFamily(),
      ])
      setProject(projRes.data)
      setFamily(famRes.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const isOwner = project?.owner_id === user?.id

  const handleDelete = () => {
    Alert.alert('Eliminar proyecto', `¿Eliminar "${project?.name}"?`, [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProject(id)
            navigation.goBack()
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el proyecto')
          }
        },
      },
    ])
  }

  const handleAddMember = async (userId) => {
    setMemberModal(false)
    try {
      await addMember(id, userId)
      load()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Error al agregar miembro')
    }
  }

  const handleRemoveMember = (userId, name) => {
    Alert.alert('Remover miembro', `¿Remover a ${name} del proyecto?`, [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(id, userId)
            load()
          } catch {
            Alert.alert('Error', 'No se pudo remover el miembro')
          }
        },
      },
    ])
  }

  const handleRemoveInvoice = (invoiceId) => {
    Alert.alert('Desasociar factura', '¿Desasociar esta factura del proyecto?', [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeInvoice(id, invoiceId)
            load()
          } catch {
            Alert.alert('Error', 'No se pudo desasociar la factura')
          }
        },
      },
    ])
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  const proj = project
  const members = proj.members || []
  const invoices = proj.invoices || []

  // Available family members not yet in project
  const familyMembers = family?.members || []
  const memberIds = new Set([proj.owner_id, ...members.map((m) => m.id)])
  const available = familyMembers.filter((m) => !memberIds.has(m.id))

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.projectName}>{proj.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {proj.project_type === 'family' ? i18n.t('projects.type_family') : i18n.t('projects.type_personal')}
              </Text>
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{i18n.t('projects.total_amount')}</Text>
          <Text style={styles.totalValue}>${Number(proj.total_amount || 0).toFixed(2)}</Text>
          <Text style={styles.totalSub}>{invoices.length} {i18n.t('projects.invoices_count')}</Text>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('projects.members')}</Text>
            {isOwner && available.length > 0 && (
              <TouchableOpacity onPress={() => setMemberModal(true)} style={styles.addSmallBtn}>
                <Ionicons name="add" size={14} color={colors.accent} />
                <Text style={styles.addSmallText}>{i18n.t('projects.add_member')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Owner */}
          <View style={styles.memberRow}>
            <Ionicons name="person-circle-outline" size={20} color={colors.muted} />
            <Text style={styles.memberName}>{proj.owner_name || 'Propietario'}</Text>
            <Text style={styles.memberRole}>{i18n.t('family.role_owner')}</Text>
          </View>

          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Ionicons name="person-outline" size={20} color={colors.muted} />
              <Text style={styles.memberName}>{m.name}</Text>
              {isOwner && (
                <TouchableOpacity onPress={() => handleRemoveMember(m.id, m.name)}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {members.length === 0 && (
            <Text style={styles.emptyText}>{i18n.t('projects.no_members')}</Text>
          )}
        </View>

        {/* Invoices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('projects.associated_invoices')}</Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddInvoiceToProject', { projectId: id })}
                style={styles.addSmallBtn}
              >
                <Ionicons name="add" size={14} color={colors.accent} />
                <Text style={styles.addSmallText}>{i18n.t('projects.add_invoice')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {invoices.length === 0 ? (
            <Text style={styles.emptyText}>{i18n.t('projects.no_invoices')}</Text>
          ) : (
            invoices.map((inv) => (
              <View key={inv.invoice_id} style={styles.invoiceRow}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceIssuer} numberOfLines={1}>{inv.issuer_name}</Text>
                  <Text style={styles.invoiceMeta}>
                    {inv.include_all_items ? i18n.t('projects.include_all_items') : `${i18n.t('projects.items_included')}`}
                  </Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>${Number(inv.computed_amount || 0).toFixed(2)}</Text>
                  {isOwner && (
                    <TouchableOpacity onPress={() => handleRemoveInvoice(inv.invoice_id)}>
                      <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add member modal */}
      <Modal visible={memberModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('projects.add_member')}</Text>
            {available.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('projects.all_members_added')}</Text>
            ) : (
              <FlatList
                data={available}
                keyExtractor={(m) => String(m.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.memberPickRow} onPress={() => handleAddMember(item.id)}>
                    <Ionicons name="person-outline" size={20} color={colors.muted} />
                    <Text style={styles.memberPickName}>{item.name}</Text>
                    <Text style={styles.memberPickEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMemberModal(false)}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  projectName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 4,
  },
  totalSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addSmallText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  memberRole: {
    fontSize: 12,
    color: colors.textLight,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  invoiceInfo: {
    flex: 1,
    marginRight: 8,
  },
  invoiceIssuer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceMeta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  invoiceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
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
    maxHeight: '55%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  memberPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  memberPickName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  memberPickEmail: {
    fontSize: 12,
    color: colors.textLight,
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
