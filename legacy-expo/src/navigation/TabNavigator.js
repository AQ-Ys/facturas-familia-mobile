import React, { useContext } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'

import colors from '../theme/colors'
import i18n from '../i18n'
import { AuthContext } from '../context/AuthContext'

import DashboardScreen      from '../screens/dashboard/DashboardScreen'
import InvoicesScreen       from '../screens/invoices/InvoicesScreen'
import InvoiceDetailScreen  from '../screens/invoices/InvoiceDetailScreen'
import AddInvoiceScreen     from '../screens/invoices/AddInvoiceScreen'
import ProjectsScreen       from '../screens/projects/ProjectsScreen'
import ProjectDetailScreen  from '../screens/projects/ProjectDetailScreen'
import AddInvoiceToProjectScreen from '../screens/projects/AddInvoiceToProjectScreen'
import AlertsScreen         from '../screens/alerts/AlertsScreen'
import FamilyScreen         from '../screens/family/FamilyScreen'

const Tab   = createBottomTabNavigator()
const Stack = createStackNavigator()

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.textInverse,
  headerTitleStyle: { fontWeight: '600' },
}

function InvoiceStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="InvoicesList"   component={InvoicesScreen}      options={{ title: i18n.t('invoices.title') }} />
      <Stack.Screen name="InvoiceDetail"  component={InvoiceDetailScreen} options={{ title: i18n.t('invoices.detail_title') }} />
      <Stack.Screen name="AddInvoice"     component={AddInvoiceScreen}    options={{ title: i18n.t('invoices.add') }} />
    </Stack.Navigator>
  )
}

function ProjectStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="ProjectsList"          component={ProjectsScreen}             options={{ title: i18n.t('projects.title') }} />
      <Stack.Screen name="ProjectDetail"         component={ProjectDetailScreen}        options={{ title: i18n.t('projects.title') }} />
      <Stack.Screen name="AddInvoiceToProject"   component={AddInvoiceToProjectScreen}  options={{ title: i18n.t('projects.add_invoice') }} />
    </Stack.Navigator>
  )
}

export default function TabNavigator() {
  const { logout } = useContext(AuthContext)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'home',
            Invoices:  'receipt-outline',
            Projects:  'folder-outline',
            Alerts:    'notifications-outline',
            Family:    'people-outline',
          }
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}  options={{ title: i18n.t('nav.dashboard'), headerShown: true, ...headerOptions }} />
      <Tab.Screen name="Invoices"  component={InvoiceStack}     options={{ title: i18n.t('nav.invoices') }} />
      <Tab.Screen name="Projects"  component={ProjectStack}     options={{ title: i18n.t('nav.projects') }} />
      <Tab.Screen name="Alerts"    component={AlertsScreen}     options={{ title: i18n.t('nav.alerts'), headerShown: true, ...headerOptions }} />
      <Tab.Screen name="Family"    component={FamilyScreen}     options={{ title: i18n.t('nav.family'), headerShown: true, ...headerOptions }} />
    </Tab.Navigator>
  )
}
