import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';

import { useTheme } from '../context/ThemeContext';

type Designation = {
  id: number;
  name: string;
  canViewAllTickets: boolean;
  canAssignTickets: boolean;
  canManageUsers: boolean;
  canPublishOffers: boolean;
  canNotifyEmployees: boolean;
  managementLevel: number;
  userCount?: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;

  // Permission information from authenticated user.
  isSuperAdmin?: boolean;
  canManageUsers?: boolean;

  // Controls whether the New button is displayed.
  allowCreate?: boolean;
};

const DesignationPicker = ({
  value,
  onChange,
  disabled = false,
  isSuperAdmin = false,
  canManageUsers = false,
  allowCreate = false,
}: Props) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const [newCanViewAll, setNewCanViewAll] = useState(false);
  const [newCanAssignTickets, setNewCanAssignTickets] = useState(false);
  const [newCanManageUsers, setNewCanManageUsers] = useState(false);
  const [newCanPublishOffers, setNewCanPublishOffers] = useState(false);
  const [newCanNotifyEmployees, setNewCanNotifyEmployees] = useState(false);
  const [newManagementLevel, setNewManagementLevel] = useState('0');

  const [saving, setSaving] = useState(false);

  const canCreateDesignation = allowCreate && canManageUsers && !disabled;

  // =====================================================
  // LOAD DESIGNATIONS
  // =====================================================

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setError('Your session has expired. Please log in again.');
        return;
      }

      const response = await axios.get(`${Config.API_URL}/api/designations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const records: Designation[] = Array.isArray(response.data?.designations)
        ? response.data.designations
        : [];

      setDesignations(records);
    } catch (loadError: any) {
      console.log(
        'GET DESIGNATIONS ERROR:',
        loadError?.response?.data || loadError,
      );

      setError(
        loadError?.response?.data?.message || 'Unable to load designations.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // =====================================================
  // FILTER DESIGNATIONS
  // =====================================================

  const availableDesignations = useMemo(() => {
    if (isSuperAdmin) {
      return designations;
    }

    // Managers cannot assign elevated designations.
    return designations.filter(item => {
      const elevated =
        item.canManageUsers === true ||
        item.canViewAllTickets === true ||
        item.canPublishOffers === true ||
        item.canNotifyEmployees === true ||
        Number(item.managementLevel || 0) > 0;

      return !elevated;
    });
  }, [designations, isSuperAdmin]);

  const selected = availableDesignations.find(item => item.name === value);

  // =====================================================
  // RESET CREATE FORM
  // =====================================================

  const resetCreateForm = () => {
    setNewName('');
    setNewCanViewAll(false);
    setNewCanAssignTickets(false);
    setNewCanManageUsers(false);
    setNewCanPublishOffers(false);
    setNewCanNotifyEmployees(false);
    setNewManagementLevel('0');
    setAdding(false);
  };

  // =====================================================
  // CREATE DESIGNATION
  // =====================================================

  const createDesignation = async () => {
    const name = newName.trim();

    if (!canCreateDesignation) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to create designations.',
      );
      return;
    }

    if (!name) {
      Alert.alert('Designation Required', 'Enter a designation name.');
      return;
    }

    const managementLevel = Number(newManagementLevel);

    if (
      !Number.isInteger(managementLevel) ||
      managementLevel < 0 ||
      managementLevel > 1000
    ) {
      Alert.alert(
        'Invalid Management Level',
        'Management level must be a whole number between 0 and 1000.',
      );
      return;
    }

    // Only SuperAdmin can grant elevated permissions.
    if (
      !isSuperAdmin &&
      (newCanViewAll || newCanManageUsers || managementLevel > 0)
    ) {
      Alert.alert(
        'Permission Denied',
        'Only SuperAdmin can create elevated designations.',
      );
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Session Expired', 'Please log in again.');
        return;
      }

      const payload = {
        name,

        // Ordinary managers can configure ticket assignment only.
        canAssignTickets: newCanAssignTickets,

        // Elevated permissions are only sent by SuperAdmin.
        ...(isSuperAdmin
          ? {
              canViewAllTickets: newCanViewAll,
              canManageUsers: newCanManageUsers,
              canPublishOffers: newCanPublishOffers,
              canNotifyEmployees: newCanNotifyEmployees,
              managementLevel,
            }
          : {}),
      };

      const response = await axios.post(
        `${Config.API_URL}/api/designations`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const created: Designation | undefined = response.data?.designation;

      if (!created) {
        throw new Error('Designation was not returned by the server.');
      }

      setDesignations(previous =>
        [...previous, created].sort((a, b) => a.name.localeCompare(b.name)),
      );

      onChange(created.name);

      resetCreateForm();

      Alert.alert('Success', 'Designation created successfully.');
    } catch (createError: any) {
      console.log(
        'CREATE DESIGNATION ERROR:',
        createError?.response?.data || createError,
      );

      Alert.alert(
        'Unable to Add Designation',
        createError?.response?.data?.message ||
          createError?.message ||
          'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SELECTED DESIGNATION DESCRIPTION
  // =====================================================

  const getDesignationDescription = (designation: Designation) => {
    const permissions = [];

    if (designation.canViewAllTickets) {
      permissions.push('View all tickets');
    }

    if (designation.canAssignTickets) {
      permissions.push('Assign tickets');
    }

    if (designation.canManageUsers) {
      permissions.push('Manage users');
    }

    if (designation.canPublishOffers) {
      permissions.push('Publish offers');
    }

    if (designation.canNotifyEmployees) {
      permissions.push('Send employee notifications');
    }

    if (permissions.length === 0) {
      return 'Can access tickets according to assigned client permissions.';
    }

    return permissions.join(' • ');
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <View>
      {/* DESIGNATION LIST */}

      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : error ? (
        <TouchableOpacity onPress={load} style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>

          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.chips}>
          {availableDesignations.map(item => {
            const isSelected = item.name === value;

            return (
              <TouchableOpacity
                key={item.id}
                disabled={disabled}
                onPress={() => onChange(item.name)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                  disabled,
                }}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={theme.everWhite}
                    style={styles.chipIcon}
                  />
                )}

                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {availableDesignations.length === 0 && (
            <Text style={styles.emptyText}>No available designations.</Text>
          )}

          {/* CREATE BUTTON */}

          {canCreateDesignation && !adding && (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={[styles.chip, styles.addChip]}
              accessibilityRole="button"
              accessibilityLabel="Add a new designation"
            >
              <Ionicons name="add" size={16} color={theme.primary} />

              <Text style={styles.addChipText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SELECTED DESIGNATION DETAILS */}

      {selected && (
        <View style={styles.hintBox}>
          <View style={styles.hintHeader}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={theme.primary}
            />

            <Text style={styles.hintTitle}>{selected.name}</Text>
          </View>

          <Text style={styles.hint}>{getDesignationDescription(selected)}</Text>

          {isSuperAdmin && (
            <Text style={styles.levelText}>
              Management level: {selected.managementLevel}
            </Text>
          )}
        </View>
      )}

      {/* CREATE DESIGNATION FORM */}

      {adding && canCreateDesignation && (
        <View style={styles.addBox}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>New Designation</Text>

              <Text style={styles.formSubtitle}>
                Configure designation permissions
              </Text>
            </View>

            <TouchableOpacity
              onPress={resetCreateForm}
              disabled={saving}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* NAME */}

          <Text style={styles.fieldLabel}>Designation Name</Text>

          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Project Manager"
            placeholderTextColor={theme.muted}
            autoCapitalize="words"
            editable={!saving}
            style={styles.input}
          />

          {/* TICKET ASSIGNMENT */}

          <View style={styles.permissionRow}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>Assign Tickets</Text>

              <Text style={styles.permissionDescription}>
                Can assign tickets to employees.
              </Text>
            </View>

            <Switch
              value={newCanAssignTickets}
              onValueChange={setNewCanAssignTickets}
              disabled={saving}
              trackColor={{
                false: theme.border,
                true: theme.primary,
              }}
            />
          </View>

          {/* SUPERADMIN CONTROLS */}

          {isSuperAdmin && (
            <>
              <View style={styles.superAdminLabel}>
                <Ionicons
                  name="shield-checkmark"
                  size={15}
                  color={theme.primary}
                />

                <Text style={styles.superAdminText}>
                  SuperAdmin Permissions
                </Text>
              </View>

              {/* VIEW ALL TICKETS */}

              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>View All Tickets</Text>

                  <Text style={styles.permissionDescription}>
                    Can view all organisation tickets.
                  </Text>
                </View>

                <Switch
                  value={newCanViewAll}
                  onValueChange={setNewCanViewAll}
                  disabled={saving}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary,
                  }}
                />
              </View>

              {/* MANAGE USERS */}

              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>Manage Users</Text>

                  <Text style={styles.permissionDescription}>
                    Can access user management operations.
                  </Text>
                </View>

                <Switch
                  value={newCanManageUsers}
                  onValueChange={setNewCanManageUsers}
                  disabled={saving}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary,
                  }}
                />
              </View>

              {/* PUBLISH OFFERS */}

              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>Publish Offers</Text>
                  <Text style={styles.permissionDescription}>
                    Can create and publish company offers.
                  </Text>
                </View>

                <Switch
                  value={newCanPublishOffers}
                  onValueChange={setNewCanPublishOffers}
                  disabled={saving}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary,
                  }}
                />
              </View>

              {/* SEND EMPLOYEE NOTIFICATIONS */}

              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>
                    Send Employee Notifications
                  </Text>
                  <Text style={styles.permissionDescription}>
                    Can send notifications to employees.
                  </Text>
                </View>

                <Switch
                  value={newCanNotifyEmployees}
                  onValueChange={setNewCanNotifyEmployees}
                  disabled={saving}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary,
                  }}
                />
              </View>

              {/* MANAGEMENT LEVEL */}

              <Text style={styles.fieldLabel}>Management Level</Text>

              <TextInput
                value={newManagementLevel}
                onChangeText={setNewManagementLevel}
                placeholder="0"
                placeholderTextColor={theme.muted}
                keyboardType="number-pad"
                editable={!saving}
                style={styles.input}
              />

              <Text style={styles.levelHint}>
                Higher numbers represent greater management authority.
              </Text>
            </>
          )}

          {/* ACTION BUTTONS */}

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={resetCreateForm}
              disabled={saving}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={createDesignation}
              disabled={saving}
              style={[styles.primaryButton, saving && styles.disabledButton]}
            >
              {saving ? (
                <ActivityIndicator color={theme.everWhite} />
              ) : (
                <Text style={styles.primaryText}>Create Designation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// =====================================================
// STYLES
// =====================================================

const createStyles = (theme: any) =>
  StyleSheet.create({
    loader: {
      paddingVertical: 12,
    },

    errorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },

    errorText: {
      color: theme.danger,
      fontSize: 13,
      flex: 1,
    },

    retryText: {
      color: theme.primary,
      fontWeight: '700',
      fontSize: 13,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },

    chipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },

    chipIcon: {
      marginRight: 4,
    },

    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },

    chipTextSelected: {
      color: theme.everWhite,
    },

    addChip: {
      borderStyle: 'dashed',
      borderColor: theme.primary,
    },

    addChipText: {
      marginLeft: 3,
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },

    emptyText: {
      paddingVertical: 10,
      fontSize: 13,
      color: theme.muted,
    },

    hintBox: {
      marginTop: 10,
      padding: 11,
      borderRadius: 10,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },

    hintHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    hintTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    hint: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: theme.muted,
    },

    levelText: {
      marginTop: 5,
      fontSize: 11,
      color: theme.primary,
      fontWeight: '700',
    },

    addBox: {
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
    },

    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    formTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },

    formSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: theme.muted,
    },

    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: theme.background,
    },

    fieldLabel: {
      marginBottom: 7,
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },

    input: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.ink,
      backgroundColor: theme.background,
      fontSize: 14,
    },

    permissionRow: {
      marginTop: 13,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },

    permissionInfo: {
      flex: 1,
      paddingRight: 12,
    },

    permissionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },

    permissionDescription: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: theme.muted,
    },

    superAdminLabel: {
      marginTop: 18,
      marginBottom: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    superAdminText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.primary,
    },

    levelHint: {
      marginTop: 5,
      fontSize: 11,
      color: theme.muted,
    },

    actions: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
    },

    secondaryButton: {
      minHeight: 40,
      paddingHorizontal: 15,
      justifyContent: 'center',
      borderRadius: 10,
    },

    secondaryText: {
      color: theme.muted,
      fontWeight: '700',
      fontSize: 13,
    },

    primaryButton: {
      minHeight: 40,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.primary,
    },

    primaryText: {
      color: theme.everWhite,
      fontWeight: '700',
      fontSize: 12,
    },

    disabledButton: {
      opacity: 0.6,
    },
  });

export default DesignationPicker;
