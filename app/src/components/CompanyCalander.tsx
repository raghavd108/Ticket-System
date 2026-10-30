import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';

const BASE_URL = Config.API_URL;
const API_URL = `${BASE_URL}/api/company-calendar`;

type CalendarDayType = 'HOLIDAY' | 'WORKING_DAY';

type CalendarUser = {
  id?: string;
  role?: string;
  designation?: string;
};

type CalendarEntry = {
  id: string;
  date: string;
  type: CalendarDayType;
  name: string;
  description?: string | null;
  isCustom?: boolean;
  isDefaultHoliday?: boolean;
};

type CalendarItem = CalendarEntry & {
  isCustom: boolean;
  isDefaultHoliday?: boolean;
};

type CalendarCell = {
  day: number;
  date: string;
} | null;

type CalendarApiResponse = {
  calendar?: CalendarItem[];
  entries?: CalendarEntry[];
  message?: string;
};

type CompanyCalendarScreenProps = {
  route?: {
    params?: {
      user?: CalendarUser;
    };
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

type CalendarColors = Record<string, string>;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(value: number | string): string {
  return String(value).padStart(2, '0');
}

function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

// Parse YYYY-MM-DD without UTC-to-local date shifting.
function parseDateKey(value: string | null | undefined): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDate(value: string | null | undefined): string {
  const date = parseDateKey(value);

  if (!date) return value || '';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarCells(
  year: number,
  monthIndex: number,
): Array<Exclude<CalendarCell, null> | null> {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = Array(mondayOffset).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: dateKey(year, monthIndex, day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

async function getTokenFromStorage(): Promise<string | null> {
  // Use getItem for compatibility with AsyncStorage versions/types that
  // do not expose multiGet.
  const tokenKeys: string[] = ['token', 'authToken', 'userToken'];

  for (const key of tokenKeys) {
    const value: string | null = await AsyncStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
}

export default function CompanyCalendarScreen({
  route,
}: CompanyCalendarScreenProps) {
  const { isDarkMode, theme } = useTheme();
  const COLORS = useMemo(
    () => ({
      background: theme.background,
      card: theme.white,
      surface: isDarkMode ? '#202D3A' : '#FFFFFF',
      text: theme.ink,
      muted: theme.muted,
      border: theme.border,

      primary: theme.primary,
      primarySoft: theme.primarySoft,

      green: theme.green,
      greenSoft: theme.greenSoft,

      red: theme.coral,
      redSoft: theme.coralSoft,

      orange: theme.orange,
      orangeSoft: theme.orangeSoft,

      purple: isDarkMode ? '#C4B5FD' : '#7958D9',
      purpleSoft: isDarkMode ? '#352C50' : '#F1ECFF',

      track: isDarkMode ? '#354453' : '#EAEFF3',

      // Additional colors used by CompanyCalendarScreen
      amber: theme.orange,
      amberSoft: theme.orangeSoft,
      weekend: isDarkMode ? '#293744' : '#F0EEE8',
    }),
    [theme, isDarkMode],
  );
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  // Pass the logged-in user from your existing navigation if available.
  const user = route?.params?.user;
  const userRole = String(user?.role || '')
    .trim()
    .toLowerCase();
  const userDesignation = String(user?.designation || '')
    .trim()
    .toLowerCase();

  // Admins and employees designated as CEO or CTO can manage the calendar.
  const canManageCalendar =
    userRole === 'admin' ||
    (userRole === 'employee' && ['ceo', 'cto'].includes(userDesignation));

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [monthIndex, setMonthIndex] = useState<number>(new Date().getMonth());

  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);

  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<CalendarDayType>('HOLIDAY');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [token, setToken] = useState<string | null>(null);

  const today = useMemo(() => {
    const now = new Date();

    return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const cells = useMemo<Array<Exclude<CalendarCell, null> | null>>(
    () => getCalendarCells(year, monthIndex),
    [year, monthIndex],
  );

  const calendarByDate = useMemo(() => {
    const map = new Map();

    calendar.forEach(item => map.set(item.date, item));

    return map;
  }, [calendar]);

  const selectedItem = selectedDate ? calendarByDate.get(selectedDate) : null;

  const selectedEntry = selectedDate
    ? entries.find(entry => entry.date === selectedDate)
    : null;

  const stats = useMemo(() => {
    let holidays = 0;
    let workingOverrides = 0;

    calendar.forEach(item => {
      if (item.type === 'HOLIDAY') holidays++;

      if (item.isCustom && item.type === 'WORKING_DAY') {
        workingOverrides++;
      }
    });

    return {
      holidays,
      workingOverrides,
    };
  }, [calendar]);

  useEffect(() => {
    let active = true;

    getTokenFromStorage()
      .then(value => {
        if (active) setToken(value);
      })
      .catch(() => {
        if (active) setToken(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(
    async (
      path: string,
      options: RequestInit = {},
    ): Promise<CalendarApiResponse> => {
      const authToken = token || (await getTokenFromStorage());

      if (!authToken) {
        throw new Error(
          'Authentication token not found. Please sign in again.',
        );
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          ...((options.headers || {}) as Record<string, string>),
        },
      });

      const data: CalendarApiResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status}).`);
      }

      return data;
    },
    [token],
  );

  const loadCalendar = useCallback(
    async (showLoader: boolean = true): Promise<void> => {
      if (showLoader) setLoading(true);

      setError('');

      try {
        const result = await request(`?month=${monthIndex + 1}&year=${year}`);

        setCalendar(result.calendar || []);
        setEntries(result.entries || []);

        setSelectedDate(current => {
          if (
            current &&
            current.startsWith(`${year}-${pad(monthIndex + 1)}-`)
          ) {
            return current;
          }

          return null;
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err) || 'Unable to load company calendar.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [request, monthIndex, year],
  );

  useEffect(() => {
    if (token) {
      loadCalendar();
    }
  }, [token, loadCalendar]);

  const changeMonth = (direction: number): void => {
    const next = new Date(year, monthIndex + direction, 1);

    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
    setSelectedDate(null);
  };

  const openCreateModal = (date: string): void => {
    if (!canManageCalendar) return;

    const existing = entries.find(entry => entry.date === date);

    setEditingEntry(existing || null);
    setFormDate(date);
    setFormType(existing?.type || 'HOLIDAY');
    setFormName(existing?.name || '');
    setFormDescription(existing?.description || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingEntry(null);
  };

  const saveEntry = async () => {
    if (!formDate || !parseDateKey(formDate)) {
      Alert.alert('Invalid date', 'Please select a valid calendar date.');
      return;
    }

    if (!formName.trim()) {
      Alert.alert('Name required', 'Enter a holiday or working-day name.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date: formDate,
        type: formType,
        name: formName.trim(),
        description: formDescription.trim(),
      };

      const result = await request(editingEntry ? `/${editingEntry.id}` : '', {
        method: editingEntry ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      setModalVisible(false);
      setEditingEntry(null);

      await loadCalendar(false);

      Alert.alert(
        'Saved',
        result.message || 'Company calendar updated successfully.',
      );
    } catch (err: unknown) {
      Alert.alert('Unable to save', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = () => {
    if (!editingEntry) return;

    Alert.alert(
      'Delete calendar entry?',
      `Remove "${editingEntry.name}" on ${formatDate(
        editingEntry.date,
      )}? The date will return to its default weekend rules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);

            try {
              const result = await request(`/${editingEntry.id}`, {
                method: 'DELETE',
              });

              setModalVisible(false);
              setEditingEntry(null);

              await loadCalendar(false);

              Alert.alert(
                'Deleted',
                result.message || 'Calendar entry deleted.',
              );
            } catch (err: unknown) {
              Alert.alert('Unable to delete', getErrorMessage(err));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const renderCalendarCell = (
    cell: Exclude<CalendarCell, null> | null,
    index: number,
  ) => {
    if (!cell) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const item = calendarByDate.get(cell.date);
    const isSelected = selectedDate === cell.date;
    const isToday = today === cell.date;

    const isHoliday = item?.type === 'HOLIDAY';
    const isCustomWorkingDay = item?.type === 'WORKING_DAY' && item?.isCustom;

    let backgroundColor = COLORS.card;
    let borderColor = COLORS.border;
    let numberColor = COLORS.text;

    if (isHoliday) {
      backgroundColor = COLORS.primarySoft;
      borderColor = COLORS.primarySoft;
      numberColor = COLORS.primary;
    } else if (isCustomWorkingDay) {
      backgroundColor = COLORS.greenSoft;
      borderColor = COLORS.greenSoft;
      numberColor = COLORS.green;
    }

    if (isSelected) {
      borderColor = COLORS.primary;
    }

    return (
      <Pressable
        key={cell.date}
        onPress={() => setSelectedDate(cell.date)}
        onLongPress={() => canManageCalendar && openCreateModal(cell.date)}
        style={[
          styles.dayCell,
          {
            backgroundColor,
            borderColor,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            { color: numberColor },
            isToday && styles.todayNumber,
          ]}
        >
          {cell.day}
        </Text>

        {isToday && <View style={styles.todayDot} />}

        {item?.isCustom && (
          <View
            style={[
              styles.dayDot,
              {
                backgroundColor:
                  item.type === 'HOLIDAY' ? COLORS.primary : COLORS.green,
              },
            ]}
          />
        )}

        {canManageCalendar && isSelected && (
          <Text style={styles.cellEditHint}>Selected</Text>
        )}
      </Pressable>
    );
  };

  const renderSelectedDetails = () => {
    if (!selectedDate) {
      return (
        <View style={styles.emptySelection}>
          <Text style={styles.emptyTitle}>Choose a date</Text>
          <Text style={styles.mutedText}>
            Select a day to see its holiday or working-day details.
          </Text>
        </View>
      );
    }

    const item = selectedItem;
    const isCustom = Boolean(item?.isCustom);
    const isHoliday = item?.type === 'HOLIDAY';

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailTopRow}>
          <View style={styles.detailDateBlock}>
            <Text style={styles.detailDate}>
              {parseDateKey(selectedDate)?.getDate()}
            </Text>
            <Text style={styles.detailMonth}>
              {MONTHS[monthIndex].slice(0, 3).toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailContent}>
            <Text style={styles.detailTitle}>
              {item?.name || 'Regular working day'}
            </Text>

            <Text style={styles.mutedText}>{formatDate(selectedDate)}</Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isHoliday
                    ? COLORS.primarySoft
                    : COLORS.greenSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color: isHoliday ? COLORS.primary : COLORS.green,
                  },
                ]}
              >
                {isHoliday ? 'Holiday' : 'Working day'}
              </Text>
            </View>
          </View>
        </View>

        {item?.description ? (
          <Text style={styles.descriptionText}>{item.description}</Text>
        ) : null}

        {item?.isDefaultHoliday && (
          <Text style={styles.defaultNote}>
            This is a default weekend holiday. Add a working-day override if
            Spinfocom needs to operate on this date.
          </Text>
        )}

        {canManageCalendar && (
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => openCreateModal(selectedDate)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                {isCustom ? 'Edit entry' : 'Set date'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isCustom && !canManageCalendar && (
          <Text style={styles.defaultNote}>
            {item?.isDefaultHoliday
              ? 'Regular company weekend holiday.'
              : 'No custom calendar entry for this date.'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCalendar(false);
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>✦</Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>SPINFOCOM</Text>
            <Text style={styles.title}>Company Calendar</Text>
            <Text style={styles.subtitle}>
              Company holidays and working days
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Holidays this month</Text>
            <Text style={styles.statValue}>{stats.holidays}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Custom working days</Text>
            <Text style={[styles.statValue, { color: COLORS.green }]}>
              {stats.workingOverrides}
            </Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.monthArrow}
              accessibilityLabel="Previous month"
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.monthTitleBlock}>
              <Text style={styles.monthTitle}>{MONTHS[monthIndex]}</Text>
              <Text style={styles.monthYear}>{year}</Text>
            </View>

            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={styles.monthArrow}
              accessibilityLabel="Next month"
            >
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAYS.map(day => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.mutedText}>Loading calendar...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Calendar unavailable</Text>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => loadCalendar()}
              >
                <Text style={styles.primaryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.calendarGrid}>
              {cells.map((cell, index) => renderCalendarCell(cell, index))}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
              />
              <Text style={styles.legendText}>Holiday</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.green }]}
              />
              <Text style={styles.legendText}>Working override</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.muted }]}
              />
              <Text style={styles.legendText}>Today marker</Text>
            </View>
          </View>
        </View>

        {renderSelectedDetails()}

        {canManageCalendar && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              openCreateModal(selectedDate || dateKey(year, monthIndex, 1))
            }
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              + Add holiday / working day
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>
          Company-wide calendar for Spinfocom. Client organisations do not have
          separate holiday schedules.
        </Text>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingEntry ? 'Edit calendar entry' : 'Add calendar entry'}
                </Text>
                <Text style={styles.mutedText}>
                  Configure a Spinfocom holiday or working day.
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                style={styles.closeButton}
                disabled={saving}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>

              <TextInput
                value={formDate}
                onChangeText={setFormDate}
                placeholder="2026-10-25"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Day type</Text>

              <View style={styles.typeOptions}>
                <TouchableOpacity
                  onPress={() => setFormType('HOLIDAY')}
                  style={[
                    styles.typeOption,
                    formType === 'HOLIDAY' && styles.holidayOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionTitle,
                      formType === 'HOLIDAY' && {
                        color: COLORS.primary,
                      },
                    ]}
                  >
                    Holiday
                  </Text>
                  <Text style={styles.typeOptionDescription}>
                    Block attendance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFormType('WORKING_DAY')}
                  style={[
                    styles.typeOption,
                    formType === 'WORKING_DAY' && styles.workingOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionTitle,
                      formType === 'WORKING_DAY' && {
                        color: COLORS.green,
                      },
                    ]}
                  >
                    Working day
                  </Text>
                  <Text style={styles.typeOptionDescription}>
                    Override weekend rule
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Name</Text>

              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={
                  formType === 'HOLIDAY'
                    ? 'e.g. Diwali Holiday'
                    : 'e.g. Special Sunday Working'
                }
                placeholderTextColor={COLORS.muted}
                maxLength={191}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Description (optional)</Text>

              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Add a short note..."
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.input, styles.descriptionInput]}
              />

              <TouchableOpacity
                onPress={saveEntry}
                disabled={saving}
                style={[
                  styles.primaryButton,
                  styles.modalSaveButton,
                  saving && styles.disabledButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {editingEntry ? 'Save changes' : 'Create entry'}
                  </Text>
                )}
              </TouchableOpacity>

              {editingEntry && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  disabled={saving}
                  onPress={deleteEntry}
                >
                  <Text style={styles.deleteButtonText}>
                    Delete calendar entry
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: CalendarColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    container: {
      flex: 1,
      marginTop: StatusBar.currentHeight || 0,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
    },
    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    headerIconText: {
      color: COLORS.primary,
      fontSize: 27,
      fontWeight: '700',
    },
    headerText: {
      flex: 1,
    },
    eyebrow: {
      color: COLORS.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      marginBottom: 3,
    },
    title: {
      color: COLORS.text,
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    subtitle: {
      color: COLORS.muted,
      fontSize: 12,
      marginTop: 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 18,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 15,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statLabel: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    statValue: {
      color: COLORS.primary,
      fontSize: 27,
      fontWeight: '800',
      marginTop: 7,
    },
    calendarCard: {
      backgroundColor: COLORS.card,
      borderRadius: 22,
      padding: 15,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 22,
    },
    monthArrow: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
    },
    monthArrowText: {
      fontSize: 29,
      color: COLORS.text,
      lineHeight: 32,
    },
    monthTitleBlock: {
      alignItems: 'center',
    },
    monthTitle: {
      color: COLORS.text,
      fontSize: 19,
      fontWeight: '800',
    },
    monthYear: {
      color: COLORS.muted,
      fontSize: 12,
      marginTop: 2,
    },
    weekHeader: {
      flexDirection: 'row',
      marginBottom: 9,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
    },
    weekdayText: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '13.2%',
      marginHorizontal: '0.54%',
      height: 49,
      marginBottom: 5,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    dayNumber: {
      fontSize: 13,
      fontWeight: '600',
    },
    todayNumber: {
      textDecorationLine: 'underline',
      fontWeight: '900',
    },
    dayDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 3,
    },
    todayDot: {
      position: 'absolute',
      top: 3,
      right: 5,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.muted,
    },
    cellEditHint: {
      fontSize: 7,
      color: COLORS.primary,
      marginTop: 1,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 13,
      marginTop: 14,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    legendText: {
      color: COLORS.muted,
      fontSize: 10,
    },
    loadingBox: {
      height: 250,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    errorBox: {
      paddingVertical: 35,
      alignItems: 'center',
      gap: 10,
    },
    errorTitle: {
      color: COLORS.text,
      fontWeight: '800',
      fontSize: 16,
    },
    errorText: {
      color: COLORS.red,
      fontSize: 12,
      textAlign: 'center',
    },
    detailCard: {
      marginTop: 16,
      backgroundColor: COLORS.card,
      borderRadius: 20,
      padding: 17,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    detailTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailDateBlock: {
      width: 65,
      height: 72,
      backgroundColor: COLORS.background,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    detailDate: {
      fontSize: 28,
      color: COLORS.text,
      fontWeight: '800',
    },
    detailMonth: {
      color: COLORS.muted,
      fontSize: 10,
      fontWeight: '800',
      marginTop: 1,
    },
    detailContent: {
      flex: 1,
      alignItems: 'flex-start',
    },
    detailTitle: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },
    mutedText: {
      color: COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    statusPill: {
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginTop: 7,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    descriptionText: {
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 14,
    },
    defaultNote: {
      color: COLORS.muted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 13,
    },
    detailActions: {
      marginTop: 15,
    },
    secondaryButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    secondaryButtonText: {
      color: COLORS.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    emptySelection: {
      marginTop: 16,
      padding: 20,
      backgroundColor: COLORS.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    emptyTitle: {
      color: COLORS.text,
      fontWeight: '800',
      fontSize: 15,
      marginBottom: 5,
    },
    primaryButton: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 18,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 17,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
    disabledButton: {
      opacity: 0.6,
    },
    footerNote: {
      textAlign: 'center',
      color: COLORS.muted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 20,
      paddingHorizontal: 12,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(25, 25, 22, 0.45)',
    },
    modalSheet: {
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: '90%',
    },
    modalHandle: {
      alignSelf: 'center',
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor: COLORS.border,
      marginBottom: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 22,
    },
    modalTitle: {
      color: COLORS.text,
      fontSize: 21,
      fontWeight: '800',
      marginBottom: 5,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    closeButtonText: {
      fontSize: 25,
      color: COLORS.text,
      lineHeight: 27,
    },
    inputLabel: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 15,
    },
    input: {
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: COLORS.text,
      fontSize: 13,
    },
    descriptionInput: {
      height: 90,
      paddingTop: 13,
    },
    typeOptions: {
      flexDirection: 'row',
      gap: 10,
    },
    typeOption: {
      flex: 1,
      padding: 13,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
    },
    holidayOptionActive: {
      backgroundColor: COLORS.primarySoft,
      borderColor: COLORS.primary,
    },
    workingOptionActive: {
      backgroundColor: COLORS.greenSoft,
      borderColor: COLORS.green,
    },
    typeOptionTitle: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: '800',
    },
    typeOptionDescription: {
      color: COLORS.muted,
      fontSize: 10,
      marginTop: 5,
      lineHeight: 14,
    },
    modalSaveButton: {
      marginTop: 24,
    },
    deleteButton: {
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 5,
    },
    deleteButtonText: {
      color: COLORS.red,
      fontSize: 13,
      fontWeight: '800',
    },
  });
