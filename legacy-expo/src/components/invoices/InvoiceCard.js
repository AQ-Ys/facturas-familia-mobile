import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import colors from '../../theme/colors'
import i18n from '../../i18n'

function formatDate(isoDate, legacyStr) {
  // Try the proper ISO datetime field first
  if (isoDate) {
    const d = new Date(isoDate)
    if (!isNaN(d.getTime())) {
      const dd   = String(d.getDate()).padStart(2, '0')
      const mm   = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }
  }
  // Fallback: return legacy string as-is (already in DD/MM/YYYY HH:MM:SS)
  if (legacyStr) return String(legacyStr).split(' ')[0]
  return i18n.t('common.na')
}

export default function InvoiceCard({ invoice, onPress }) {
  const category = invoice.category || i18n.t('dashboard.uncategorized')

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.left}>
        <Ionicons name="receipt-outline" size={20} color={colors.accent} style={styles.icon} />
        <View style={styles.info}>
          <Text style={styles.issuer} numberOfLines={1}>{invoice.issuer_name || i18n.t('common.na')}</Text>
          <Text style={styles.meta}>{i18n.t('invoices.invoice_number')}{invoice.invoice_number}</Text>
          <View style={styles.row}>
            <Text style={styles.date}>{formatDate(invoice.invoice_date, invoice.invoice_datetime)}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.total}>${Number(invoice.total_paid || 0).toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  info: {
    flex: 1,
  },
  issuer: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textLight,
  },
  categoryBadge: {
    backgroundColor: colors.background,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
})
