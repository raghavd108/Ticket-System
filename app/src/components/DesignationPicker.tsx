import React, { useCallback, useEffect, useState } from 'react';
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
import { Config } from 'react-native-config';
import { useTheme } from '../context/ThemeContext';

type Designation = {
  id: number;
  name: string;
  canViewAllTickets: boolean;
  canAssignTickets: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Admins may add designations inline.
  allowCreate?: boolean;
};

// Designations come from the Designation table; employees can only be
// given a designation that exists there (enforced by the backend too).
const DesignationPicker = ({
  value,
  onChange,
  disabled = false,
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
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('token');

      const response = await axios.get(`${Config.API_URL}/api/designations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDesignations(
        Array.isArray(response.data?.designations)
          ? response.data.designations
          : [],
      );
    } catch (loadError) {
      console.log('GET DESIGNATIONS ERROR:', loadError);
      setError('Unable to load designations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createDesignation = async () => {
    const name = newName.trim();

    if (!name) {
      Alert.alert('Designation Required', 'Enter a designation name.');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');

      const response = await axios.post(
        `${Config.API_URL}/api/designations`,
        {
          name,
          canViewAllTickets: newCanViewAll,
          canAssignTickets: newCanViewAll,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const created: Designation | undefined = response.data?.designation;

      if (created) {
        setDesignations(previous =>
          [...previous, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        onChange(created.name);
      }

      setNewName('');
      setNewCanViewAll(false);
      setAdding(false);
    } catch (createError: any) {
      Alert.alert(
        'Unable to Add Designation',
        createError?.response?.data?.message ?? 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const selected = designations.find(item => item.name === value);

  return (
    <View>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : error ? (
        <TouchableOpacity onPress={load} style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.chips}>
          {designations.map(item => {
            const isSelected = item.name === value;

            return (
              <TouchableOpacity
                key={item.id}
                disabled={disabled}
                onPress={() => onChange(item.name)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled }}
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
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {allowCreate && !adding && (
            <TouchableOpacity
              disabled={disabled}
              onPress={() => setAdding(true)}
              style={[styles.chip, styles.addChip]}
              accessibilityRole="button"
              accessibilityLabel="Add a new designation"
            >
              <Ionicons name="add" size={15} color={theme.primary} />
              <Text style={[styles.chipText, { color: theme.primary }]}>
                New
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {selected && (
        <Text style={styles.hint}>
          {selected.canViewAllTickets
            ? 'Can view and assign all incoming tickets.'
            : 'Sees only tickets assigned to them for their mapped clients.'}
        </Text>
      )}

      {adding && (
        <View style={styles.addBox}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Designation name"
            placeholderTextColor={theme.muted}
            autoCapitalize="words"
            editable={!saving}
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              Can view and assign all tickets
            </Text>
            <Switch
              value={newCanViewAll}
              onValueChange={setNewCanViewAll}
              disabled={saving}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setAdding(false)}
              disabled={saving}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createDesignation}
              disabled={saving}
              style={styles.primaryButton}
            >
              {saving ? (
                <ActivityIndicator color={theme.everWhite} />
              ) : (
                <Text style={styles.primaryText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

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
    hint: {
      marginTop: 8,
      fontSize: 12,
      color: theme.muted,
    },
    addBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
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
    switchRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    switchLabel: {
      flex: 1,
      paddingRight: 10,
      fontSize: 13,
      color: theme.text,
    },
    actions: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    secondaryButton: {
      minHeight: 40,
      paddingHorizontal: 16,
      justifyContent: 'center',
      borderRadius: 10,
    },
    secondaryText: {
      color: theme.muted,
      fontWeight: '700',
    },
    primaryButton: {
      minHeight: 40,
      minWidth: 72,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    primaryText: {
      color: theme.everWhite,
      fontWeight: '700',
    },
  });

export default DesignationPicker;
