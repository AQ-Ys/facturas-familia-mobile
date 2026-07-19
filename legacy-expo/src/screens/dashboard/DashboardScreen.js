import React, { useState, useEffect, useContext, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getDashboard } from '../../services/dashboard'
import { AuthContext } from '../../context/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import InvoiceCard from '../../components/invoices/InvoiceCard'
import i18n from '../../i18n'
import colors from '../../theme/colors'

function SummaryCard({ label, value, icon, accent }) {
  return (
    <View style={[styles.summaryCard, accent && { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <Ionicons name={icon} size={22} color={accent || colors.accent} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext)
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data: res } = await getDashboard()
      setData(res)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorMessage onRetry={load} />

  const summary    = data?.summary    || {}
  const byCategory = data?.by_category || []
  const recent     = data?.recent_invoices || []
  const yearLabel  = data?.year ? `Año ${data.year}` : ''

  const topCat = byCategory.length > 0
    ? byCategory.reduce((a, b) => (b.total > a.total ? b : a))
    : null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>{i18n.t('dashboard.title')}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard
          label={i18n.t('dashboard.total_spent')}
          value={`$${Number(summary.total_spent || 0).toFixed(2)}`}
          icon="cash-outline"
          accent={colors.secondary}
        />
        <SummaryCard
          label={i18n.t('dashboard.invoices_count')}
          value={summary.invoices_count ?? 0}
          icon="receipt-outline"
          accent={colors.accent}
        />
        <SummaryCard
          label={i18n.t('dashboard.top_category')}
          value={topCat?.category || i18n.t('dashboard.uncategorized')}
          icon="pricetag-outline"
          accent={colors.muted}
        />
      </View>

      {/* Spending by category */}
      {byCategory.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{i18n.t('dashboard.spending_by_category')}</Text>
            {yearLabel ? <Text style={styles.yearBadge}>{yearLabel}</Text> : null}
          </View>
          {byCategory.slice(0, 5).map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{item.category || i18n.t('dashboard.uncategorized')}</Text>
              <Text style={styles.categoryAmount}>${Number(item.total).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('dashboard.recent_transactions')}</Text>
        {recent.length === 0 ? (
          <Text style={styles.emptyText}>{i18n.t('dashboard.no_transactions')}</Text>
        ) : (
          recent.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onPress={() =>
                navigation.navigate('Invoices', {
                  screen: 'InvoiceDetail',
                  params: { id: inv.id },
                })
              }
            />
          ))
        )}
      </View>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: {
    fontSize: 14,
    color: colors.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyText: {
    color: colors.textLight,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  yearBadge: {
    fontSize: 11,
    color: colors.textInverse,
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
})
