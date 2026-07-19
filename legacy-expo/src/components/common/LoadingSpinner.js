import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import colors from '../../theme/colors'
import i18n from '../../i18n'

export default function LoadingSpinner({ message }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      {message !== false && (
        <Text style={styles.text}>{message || i18n.t('common.loading')}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  text: {
    marginTop: 12,
    color: colors.textLight,
    fontSize: 14,
  },
})
