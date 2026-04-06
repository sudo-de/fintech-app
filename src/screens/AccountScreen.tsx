import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { FONTS, RADIUS, SPACING } from '../constants/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getInitials } from '../utils/formatters';
import { showAppAlert } from '../utils/appAlert';
import { estimateAsyncStorageUsageBytes, formatStorageSize } from '../utils/storageUsage';

type AccountNavProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}

function SettingRow({ icon, iconColor, label, description, onPress, right, disabled }: SettingRowProps) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.4 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
        ) : null}
      </View>
      {right ?? (
        onPress && !disabled ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        ) : null
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export function AccountScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    user,
    avatarUri,
    mpinEnabled,
    biometricEnabled,
    notifications,
    updateProfile,
    updateNotifications,
    updateAvatar,
    disableMPIN,
    setBiometric,
    signOut,
  } = useAuth();
  const { currency, setCurrency, ratesLoading } = useCurrency();
  const navigation = useNavigation<AccountNavProp>();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState<{ title: string; message: string } | null>(null);
  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    })();
  }, []);

  /** Silent refresh — no loading UI (avoids row/modal flicker when opening Data & storage or refocusing Account). */
  const refreshStorageEstimate = useCallback(async () => {
    try {
      const bytes = await estimateAsyncStorageUsageBytes();
      setStorageBytes(bytes);
    } catch {
      setStorageBytes(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStorageEstimate();
    }, [refreshStorageEstimate])
  );

  useEffect(() => {
    if (!storageModalVisible) return;
    refreshStorageEstimate();
  }, [storageModalVisible, refreshStorageEstimate]);

  const handleSaveProfile = useCallback(async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: editName.trim(), email: editEmail.trim() });
      setProfileModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  }, [editName, editEmail, updateProfile]);

  const openProfileModal = useCallback(() => {
    setEditName(user?.name ?? '');
    setEditEmail(user?.email ?? '');
    setProfileModalVisible(true);
  }, [user?.name, user?.email]);

  const openPhotoSheet = useCallback(() => setPhotoSheetVisible(true), []);

  const pickFromCamera = useCallback(async () => {
    setPhotoSheetVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setPermissionDialog({
        title: 'Camera access needed',
        message: 'Allow camera access in Settings to take a new profile photo.',
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await updateAvatar(result.assets[0].uri);
    }
  }, [updateAvatar]);

  const pickFromLibrary = useCallback(async () => {
    setPhotoSheetVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPermissionDialog({
        title: 'Photos access needed',
        message: 'Allow photo library access in Settings to choose a picture.',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await updateAvatar(result.assets[0].uri);
    }
  }, [updateAvatar]);

  const removeProfilePhoto = useCallback(() => {
    setPhotoSheetVisible(false);
    updateAvatar(null);
  }, [updateAvatar]);

  const handleToggleMPIN = () => {
    if (mpinEnabled) {
      showAppAlert(isDark, 'Disable PIN', 'This will also disable biometric lock. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: disableMPIN },
      ]);
    } else {
      navigation.navigate('MPINSetup', { mode: 'setup' });
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable biometric lock',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (result.success) {
          await setBiometric(true);
        }
      } catch {
        // cancelled
      }
    } else {
      await setBiometric(false);
    }
  };

  const openSignOutConfirm = useCallback(() => setSignOutModalVisible(true), []);
  const closeSignOutConfirm = useCallback(() => setSignOutModalVisible(false), []);
  const confirmSignOut = useCallback(() => {
    setSignOutModalVisible(false);
    signOut();
  }, [signOut]);

  const toggleNotif = (key: keyof typeof notifications) => {
    updateNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const initials = getInitials(user?.name ?? '');

  // Section groups need an explicit border so they're visible in light mode
  // (in dark mode the card/background contrast is strong enough without it)
  const sectionStyle = [
    styles.sectionGroup,
    { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Account</Text>
        </View>

        {/* ── Profile Hero ────────────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={openPhotoSheet}
            activeOpacity={0.85}
            accessibilityLabel="Change profile photo"
            accessibilityHint="Opens options to take or choose a photo"
            style={styles.avatarWrap}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Ionicons name="camera" size={11} color={colors.textInverse} />
            </View>
          </TouchableOpacity>

          {/* Name + email */}
          <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name ?? '—'}
          </Text>
          {user?.email ? (
            <Text style={[styles.heroEmail, { color: colors.textTertiary }]} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}

          {/* Edit button */}
          <TouchableOpacity
            onPress={openProfileModal}
            style={[styles.editProfileBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={13} color={colors.primary} />
            <Text style={[styles.editProfileText, { color: colors.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>APPEARANCE</Text>
        <View style={sectionStyle}>
          <SettingRow
            icon={isDark ? 'moon' : 'sunny'}
            iconColor={isDark ? '#6C63FF' : '#FFB300'}
            label="Dark Mode"
            description={isDark ? 'Currently dark' : 'Currently light'}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={isDark ? colors.primary : colors.textTertiary}
              />
            }
          />
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>NOTIFICATIONS</Text>
        <View style={sectionStyle}>
          <SettingRow
            icon="alarm-outline"
            iconColor="#FF9FF3"
            label="Daily Reminder"
            description="Remind me to log expenses daily"
            right={
              <Switch
                value={notifications.dailyReminder}
                onValueChange={() => toggleNotif('dailyReminder')}
                trackColor={{ false: colors.border, true: '#FF9FF360' }}
                thumbColor={notifications.dailyReminder ? '#FF9FF3' : colors.textTertiary}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingRow
            icon="warning-outline"
            iconColor="#FFB300"
            label="Budget Alerts"
            description="Alert when nearing budget limit"
            right={
              <Switch
                value={notifications.budgetAlerts}
                onValueChange={() => toggleNotif('budgetAlerts')}
                trackColor={{ false: colors.border, true: '#FFB30060' }}
                thumbColor={notifications.budgetAlerts ? '#FFB300' : colors.textTertiary}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingRow
            icon="bar-chart-outline"
            iconColor="#4ECDC4"
            label="Weekly Report"
            description="Get a summary every Sunday"
            right={
              <Switch
                value={notifications.weeklyReport}
                onValueChange={() => toggleNotif('weeklyReport')}
                trackColor={{ false: colors.border, true: '#4ECDC460' }}
                thumbColor={notifications.weeklyReport ? '#4ECDC4' : colors.textTertiary}
              />
            }
          />
        </View>

        {/* Currency */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>CURRENCY</Text>
        <View style={sectionStyle}>
          <SettingRow
            icon="cash-outline"
            iconColor="#4ECDC4"
            label={`${currency.flag}  ${currency.name}`}
            description={
              ratesLoading
                ? 'Fetching live exchange rates…'
                : `Live conversion to ${currency.code} (${currency.symbol})`
            }
            onPress={() => setCurrencyModalVisible(true)}
          />
        </View>

        {/* Data & storage */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DATA & STORAGE</Text>
        <View style={sectionStyle}>
          <SettingRow
            icon="hardware-chip-outline"
            iconColor="#8B84FF"
            label="Storage usage"
            description="Local storage · mock / offline JSON"
            onPress={() => setStorageModalVisible(true)}
            right={
              <View style={styles.storageRowRight}>
                <Text style={[styles.storageSizeText, { color: colors.textSecondary }]}>
                  {storageBytes != null ? formatStorageSize(storageBytes) : '—'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            }
          />
        </View>

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>SECURITY</Text>
        <View style={sectionStyle}>
          <SettingRow
            icon="keypad-outline"
            iconColor="#6C63FF"
            label="PIN Lock"
            description={mpinEnabled ? 'Tap to disable' : 'Set a 4-digit PIN to lock the app'}
            right={
              <Switch
                value={mpinEnabled}
                onValueChange={handleToggleMPIN}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={mpinEnabled ? colors.primary : colors.textTertiary}
              />
            }
          />
          {mpinEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <SettingRow
                icon="refresh-outline"
                iconColor="#6C63FF"
                label="Change PIN"
                onPress={() => navigation.navigate('MPINSetup', { mode: 'change' })}
              />
            </>
          )}
          {biometricAvailable && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <SettingRow
                icon="finger-print-outline"
                iconColor="#03DAC6"
                label="Biometric Lock"
                description={mpinEnabled ? 'Use fingerprint / Face ID' : 'Enable PIN first'}
                disabled={!mpinEnabled}
                right={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    disabled={!mpinEnabled}
                    trackColor={{ false: colors.border, true: '#03DAC660' }}
                    thumbColor={biometricEnabled ? '#03DAC6' : colors.textTertiary}
                  />
                }
              />
            </>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: isDark ? `${colors.expense}18` : `${colors.expense}0F`,
              borderColor: `${colors.expense}40`,
            },
          ]}
          onPress={openSignOutConfirm}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityHint="Opens confirmation to sign out of this device."
        >
          <Ionicons name="log-out-outline" size={18} color={colors.expense} />
          <Text style={[styles.signOutText, { color: colors.expense }]}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Profile edit modal (bottom sheet) ──────────────────────── */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            onPress={() => setProfileModalVisible(false)}
          >
            <Pressable style={[styles.profileModalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
              {/* Handle */}
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.editInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.editInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSaveProfile}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: editName.trim() ? colors.primary : colors.border },
                ]}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>Save changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => {
                  setProfileModalVisible(false);
                  setEditName(user?.name ?? '');
                  setEditEmail(user?.email ?? '');
                }}
                disabled={isSaving}
              >
                <Text style={[styles.cancelLinkText, { color: colors.textTertiary }]}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Currency picker modal ─────────────────────────────────────── */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Currency</Text>

            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.code === currency.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.currencyRow,
                      {
                        backgroundColor: selected ? `${colors.primary}12` : 'transparent',
                        borderColor: selected ? `${colors.primary}30` : colors.divider,
                      },
                    ]}
                    onPress={async () => {
                      await setCurrency(item.code);
                      setCurrencyModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.currencyFlag}>{item.flag}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={[styles.currencyName, { color: colors.textPrimary }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.currencyCode, { color: colors.textTertiary }]}>
                        {item.code}
                      </Text>
                    </View>
                    <Text style={[styles.currencySymbol, { color: selected ? colors.primary : colors.textSecondary }]}>
                      {item.symbol}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Profile photo: themed bottom sheet (replaces system action sheet) ── */}
      <Modal
        visible={photoSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoSheetVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setPhotoSheetVisible(false)}
        >
          <Pressable
            style={[styles.photoSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.photoSheetTitle, { color: colors.textPrimary }]}>Profile photo</Text>
            <Text style={[styles.photoSheetSubtitle, { color: colors.textSecondary }]}>
              Update how you appear on this device
            </Text>

            <TouchableOpacity
              style={[styles.photoOptionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickFromCamera}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Take photo with camera"
            >
              <View style={[styles.photoOptionIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.photoOptionText}>
                <Text style={[styles.photoOptionLabel, { color: colors.textPrimary }]}>Take photo</Text>
                <Text style={[styles.photoOptionHint, { color: colors.textTertiary }]}>Use the camera now</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoOptionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickFromLibrary}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Choose from photo library"
            >
              <View style={[styles.photoOptionIcon, { backgroundColor: `${colors.secondary}18` }]}>
                <Ionicons name="images-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.photoOptionText}>
                <Text style={[styles.photoOptionLabel, { color: colors.textPrimary }]}>Choose from library</Text>
                <Text style={[styles.photoOptionHint, { color: colors.textTertiary }]}>Pick an existing picture</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            {avatarUri ? (
              <TouchableOpacity
                style={[styles.photoRemoveRow, { borderColor: `${colors.expense}35` }]}
                onPress={removeProfilePhoto}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Remove profile photo"
              >
                <Ionicons name="trash-outline" size={20} color={colors.expense} />
                <Text style={[styles.photoRemoveText, { color: colors.expense }]}>Remove current photo</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.photoCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setPhotoSheetVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.photoCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Sign out: centered themed confirm ── */}
      <Modal
        visible={signOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSignOutConfirm}
      >
        <Pressable
          style={[styles.centerDialogOverlay, { backgroundColor: colors.overlay }]}
          onPress={closeSignOutConfirm}
        >
          <Pressable
            style={[styles.centerDialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={[styles.signOutIconWrap, { backgroundColor: `${colors.expense}18` }]}>
              <Ionicons name="log-out-outline" size={28} color={colors.expense} />
            </View>
            <Text style={[styles.centerDialogTitle, { color: colors.textPrimary }]}>Sign out?</Text>
            <Text style={[styles.centerDialogBody, { color: colors.textSecondary }]}>
              You are signing out on this device. You can sign in again anytime. Your account on the server is not
              deleted.
            </Text>
            <View style={styles.centerDialogActions}>
              <TouchableOpacity
                style={[styles.dialogSecondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={closeSignOutConfirm}
                accessibilityRole="button"
                accessibilityLabel="Stay signed in"
              >
                <Text style={[styles.dialogSecondaryBtnText, { color: colors.textPrimary }]}>Stay signed in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogPrimaryDangerBtn, { backgroundColor: colors.expense }]}
                onPress={confirmSignOut}
                accessibilityRole="button"
                accessibilityLabel="Confirm sign out"
              >
                <Text style={[styles.dialogPrimaryBtnText, { color: colors.textInverse }]}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Data & storage info ── */}
      <Modal
        visible={storageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStorageModalVisible(false)}
      >
        <Pressable
          style={[styles.centerDialogOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setStorageModalVisible(false)}
        >
          <Pressable
            style={[styles.storageInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={[styles.signOutIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="hardware-chip-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.centerDialogTitle, { color: colors.textPrimary }]}>Data on this device</Text>
            <ScrollView
              style={styles.storageInfoScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.storageMeter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.storageMeterLabel, { color: colors.textTertiary }]}>Estimated local storage</Text>
                <Text style={[styles.storageMeterValue, { color: colors.textPrimary }]}>
                  {storageBytes != null ? formatStorageSize(storageBytes) : '—'}
                </Text>
                <Text style={[styles.storageMeterHint, { color: colors.textSecondary }]}>
                  AsyncStorage: JSON for app state, session, currency preference, and similar keys.
                </Text>
              </View>
              <Text style={[styles.storageInfoPara, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Profile: </Text>
                Name and email sync with your server account. Your profile photo is kept only on this device.
              </Text>
              <Text style={[styles.storageInfoPara, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Local JSON: </Text>
                Transactions, goals, budgets, and settings are stored as mock-style offline JSON in local storage so
                the app works without a network.
              </Text>
              <Text style={[styles.storageInfoPara, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Sign out: </Text>
                Ends your session and resets session-related data in this storage so the next login starts clean. Your
                server account is unchanged.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.permissionOkBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStorageModalVisible(false)}
            >
              <Text style={[styles.dialogPrimaryBtnText, { color: colors.textInverse }]}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Permission message (themed, no system alert) ── */}
      <Modal
        visible={permissionDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionDialog(null)}
      >
        <Pressable
          style={[styles.centerDialogOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setPermissionDialog(null)}
        >
          <Pressable
            style={[styles.centerDialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.signOutIconWrap, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="shield-outline" size={26} color={colors.warning} />
            </View>
            {permissionDialog ? (
              <>
                <Text style={[styles.centerDialogTitle, { color: colors.textPrimary }]}>{permissionDialog.title}</Text>
                <Text style={[styles.centerDialogBody, { color: colors.textSecondary }]}>
                  {permissionDialog.message}
                </Text>
              </>
            ) : null}
            <TouchableOpacity
              style={[styles.permissionOkBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPermissionDialog(null)}
            >
              <Text style={[styles.dialogPrimaryBtnText, { color: colors.textInverse }]}>OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  backBtn: {
    marginLeft: -4,
    padding: 4,
  },
  pageTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    flex: 1,
  },

  // Profile hero
  heroCard: {
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: SPACING.lg,
    marginBottom: 28,
    gap: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroEmail: {
    fontSize: FONTS.sizes.sm,
    marginTop: 1,
    textAlign: 'center',
  },
  storageRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storageSizeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full ?? 99,
    borderWidth: 1,
    marginTop: 8,
  },
  editProfileText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionGroup: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: 12,
    borderWidth: 0,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  signOutText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerDialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  centerDialogCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  centerDialogTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  centerDialogBody: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '500',
  },
  signOutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerDialogActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  dialogSecondaryBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogSecondaryBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  dialogPrimaryDangerBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogPrimaryBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  permissionOkBtn: {
    marginTop: SPACING.sm,
    height: 50,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photoSheetTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  photoSheetSubtitle: {
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: SPACING.lg,
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
  },
  photoOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  photoOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionText: {
    flex: 1,
    gap: 2,
  },
  photoOptionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  photoOptionHint: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  photoRemoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  photoRemoveText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  photoCancelBtn: {
    marginTop: SPACING.xs,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCancelText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  profileModalSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 36,
  },
  inputLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginLeft: 2,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 50,
    fontSize: FONTS.sizes.md,
    marginBottom: 16,
  },
  saveBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencyFlag: {
    fontSize: 26,
    marginRight: 14,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  currencyCode: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },

  storageInfoCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  storageInfoScroll: {
    maxHeight: 360,
  },
  storageMeter: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  storageMeterLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  storageMeterValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    marginTop: 4,
  },
  storageMeterHint: {
    fontSize: FONTS.sizes.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  storageInfoPara: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 21,
    marginBottom: SPACING.sm,
  },
});
