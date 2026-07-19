import React, { useState } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import i18n, { setLocale } from '../../i18n'
import colors from '../../theme/colors'

export default function LanguageToggle({ style }) {
  const [lang, setLang] = useState(i18n.locale?.startsWith('en') ? 'en' : 'es')

  const toggle = async () => {
    const next = lang === 'es' ? 'en' : 'es'
    await setLocale(next)
    setLang(next)
  }

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={toggle}>
      <Text style={styles.text}>{lang === 'es' ? 'EN' : 'ES'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.muted,
  },
  text: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
})
