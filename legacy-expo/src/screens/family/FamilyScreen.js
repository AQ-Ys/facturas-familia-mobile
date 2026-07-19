import React, { useState, useEffect, useCallback, useContext } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Modal, TextInput,
  Alert, ActivityIndicator, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getFamily, inviteMember, deleteFamily } from '../../services/family'
import { getCategories, createCategory, deleteCategory } from '../../services/categories'
import { deleteAccount } from '../../services/auth'
import { AuthContext } from '../../context/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import i18n from '../../i18n'
import colors from '../../theme/colors'

function MemberRow({ member, currentUserId }) {
  const isOwner = member.role === 'owner' || member.is_owner
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{(member.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.name} {member.id === currentUserId ? '(tú)' : ''}
        </Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <View style={[styles.roleBadge, isOwner && styles.roleBadgeOwner]}>
        <Text style={[styles.roleText, isOwner && styles.roleTextOwner]}>
          {isOwner ? i18n.t('family.role_owner') : i18n.t('family.role_member')}
        </Text>
      </View>
    </View>
  )
}

export default function FamilyScreen() {
  const { user, logout } = useContext(AuthContext)
  const [data,          setData]          = useState(null)
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [error,         setError]         = useState(null)
  const [inviteModal,   setInviteModal]   = useState(false)
  const [catModal,      setCatModal]      = useState(false)
  const [inviteEmail,   setInviteEmail]   = useState('')
  const [newCatName,    setNewCatName]    = useState('')
  const [inviteResult,  setInviteResult]  = useState(null)
  const [submitting,    setSubmitting]    = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [famRes, catRes] = await Promise.all([getFamily(), getCategories()])
      setData(famRes.data)
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setSubmitting(true)
    try {
      const { data: res } = await inviteMember(inviteEmail.trim())
      setInviteResult(res.token)
      setInviteEmail('')
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Error al enviar invitación')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSubmitting(true)
    try {
      await createCategory(newCatName.trim())
      setNewCatName('')
      const { data: catRes } = await getCategories()
      setCategories(catRes || [])
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Error al crear categoría')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = (cat) => {
    if (cat.is_default) {
      return Alert.alert('Aviso', 'No se puede eliminar una categoría predeterminada')
    }
    Alert.alert(i18n.t('categories.delete_confirm'), cat.name, [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id)
            const { data: catRes } = await getCategories()
            setCategories(catRes || [])
          } catch (err) {
            const msg = err.response?.data?.error || 'Error al eliminar'
            Alert.alert('Error', msg)
          }
        },
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.t('family.delete_account_confirm_title'),
      i18n.t('family.delete_account_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount()
              // Local-only cleanup: the account no longer exists server-side,
              // so logout()'s own best-effort /auth/logout call will simply
              // fail (swallowed) and it proceeds to clear the session.
              // AppNavigator reacts to `user` becoming null and redirects to Login.
              await logout()
            } catch (err) {
              const msg = err.response?.data?.error || 'No se pudo eliminar la cuenta'
              Alert.alert('Error', msg)
            }
          },
        },
      ]
    )
  }

  const handleDeleteFamily = () => {
    Alert.alert(
      i18n.t('family.delete_family_confirm_title'),
      i18n.t('family.delete_family_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFamily()
              await logout()
            } catch (err) {
              const msg = err.response?.data?.error || 'No se pudo eliminar la familia'
              Alert.alert('Error', msg)
            }
          },
        },
      ]
    )
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  const members  = data?.members || []
  const currentUserId = data?.current_user_id

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Family group header */}
      <View style={styles.familyCard}>
        <Ionicons name="people" size={28} color={colors.textInverse} />
        <Text style={styles.familyName}>{data?.name || 'Grupo Familiar'}</Text>
        <Text style={styles.familyCount}>{members.length} miembro{members.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Members */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('family.members')}</Text>
          <TouchableOpacity style={styles.addSmallBtn} onPress={() => { setInviteResult(null); setInviteModal(true) }}>
            <Ionicons name="person-add-outline" size={14} color={colors.accent} />
            <Text style={styles.addSmallText}>{i18n.t('family.invite')}</Text>
          </TouchableOpacity>
        </View>

        {members.length === 0 ? (
          <Text style={styles.emptyText}>{i18n.t('family.no_members')}</Text>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} member={m} currentUserId={currentUserId} />
          ))
        )}
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('categories.title')}</Text>
          <TouchableOpacity style={styles.addSmallBtn} onPress={() => setCatModal(true)}>
            <Ionicons name="add" size={14} color={colors.accent} />
            <Text style={styles.addSmallText}>{i18n.t('categories.add')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.catHint}>{i18n.t('categories.hint')}</Text>

        <View style={styles.catGrid}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.catChip}>
              <Text style={styles.catChipText}>{cat.name}</Text>
              {!cat.is_default && (
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Danger zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.dangerTitle}>{i18n.t('family.danger_zone')}</Text>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.dangerBtnText}>{i18n.t('family.delete_account')}</Text>
        </TouchableOpacity>

        {user?.role === 'owner' && (
          <TouchableOpacity style={[styles.dangerBtn, styles.dangerBtnStrong]} onPress={handleDeleteFamily}>
            <Ionicons name="warning-outline" size={16} color={colors.textInverse} />
            <Text style={styles.dangerBtnStrongText}>{i18n.t('family.delete_family')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Invite modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('family.invite')}</Text>

            {inviteResult ? (
              <>
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenLabel}>{i18n.t('family.invitation_token')}</Text>
                  <Text style={styles.tokenValue} selectable>{inviteResult}</Text>
                </View>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => { setInviteModal(false); setInviteResult(null) }}
                >
                  <Text style={styles.saveBtnText}>{i18n.t('common.confirm')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>{i18n.t('family.email_label')}</Text>
                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={colors.border}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setInviteModal(false)}>
                    <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleInvite}
                    disabled={submitting}
                  >
                    {submitting
                      ? <ActivityIndicator color={colors.textInverse} />
                      : <Text style={styles.saveBtnText}>{i18n.t('family.send_invite')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add category modal */}
      <Modal visible={catModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{i18n.t('categories.add')}</Text>
            <TextInput
              style={styles.input}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder={i18n.t('categories.name_placeholder')}
              placeholderTextColor={colors.border}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCatModal(false); setNewCatName('') }}>
                <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                onPress={async () => {
                  await handleCreateCategory()
                  setCatModal(false)
                }}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.textInverse} />
                  : <Text style={styles.saveBtnText}>{i18n.t('common.save')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  familyCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  familyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
  },
  familyCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
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
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textLight,
  },
  roleBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeOwner: {
    backgroundColor: '#e8f0fe',
  },
  roleText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  roleTextOwner: {
    color: colors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: 12,
  },
  catHint: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerBtnStrong: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    marginBottom: 0,
  },
  dangerBtnStrongText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
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
    marginBottom: 4,
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
