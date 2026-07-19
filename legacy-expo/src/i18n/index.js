import { I18n } from 'i18n-js'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from './en.json'
import es from './es.json'

const i18n = new I18n({ en, es })

// Default to device locale, fall back to Spanish
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'es'
i18n.enableFallback = true
i18n.defaultLocale = 'es'

// Load saved language preference from storage (async, best-effort)
AsyncStorage.getItem('language').then((lang) => {
  if (lang) i18n.locale = lang
})

export default i18n

export const setLocale = async (lang) => {
  i18n.locale = lang
  await AsyncStorage.setItem('language', lang)
}
