import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { useTheme } from '../context/ThemeContext';

type Organisation = {
  _id: string;
  name: string;
  orgType: string;
};

type FilterProps = {
  role?: string;
  clientorganisation?: string;

  // Organisation list
  organisations?: Organisation[];

  // Software
  softwareFilter: string;
  setSoftwareFilter: (value: string) => void;

  // Organisation
  organisationFilter: string;
  setorganisationFilter: (value: string) => void;

  // Organisation Type
  orgTypeFilter: string;
  setOrgTypeFilter: (value: string) => void;

  // Status
  statusFilter: string;
  setStatusFilter: (value: string) => void;

  // Sorting
  sortFilter: string;
  setSortFilter: (value: string) => void;

  onApply?: () => void;
};

const Filter = ({
  role,
  clientorganisation,

  organisations = [],

  softwareFilter,
  setSoftwareFilter,

  organisationFilter,
  setorganisationFilter,

  orgTypeFilter,
  setOrgTypeFilter,

  statusFilter,
  setStatusFilter,

  sortFilter,
  setSortFilter,

  onApply,
}: FilterProps) => {
  const { theme, isDarkMode } = useTheme();

  const styles = createStyles(theme, isDarkMode);

  const isClient = role?.toLowerCase() === 'client';
  const isAdmin = role?.toLowerCase() === 'admin';
  const isEmployee = role?.toLowerCase() === 'employee';

  const filteredOrganisations =
    orgTypeFilter === 'all'
      ? organisations
      : organisations.filter(
          organisation => organisation.orgType === orgTypeFilter,
        );

  React.useEffect(() => {
    if (
      organisationFilter !== 'all' &&
      orgTypeFilter !== 'all' &&
      !filteredOrganisations.some(
        organisation => organisation.name === organisationFilter,
      )
    ) {
      setorganisationFilter('all');
    }
  }, [orgTypeFilter]);

  return (
    <View style={styles.container}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Filter Tickets</Text>

          <Text style={styles.subtitle}>
            Refine tickets using the available filters
          </Text>
        </View>

        <View style={styles.filterIcon}>
          <Text style={styles.filterIconText}>☷</Text>
        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* =====================================================
            SOFTWARE
        ===================================================== */}

        <View style={styles.filterGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Software</Text>

            <Text style={styles.optionalText}>Optional</Text>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={softwareFilter}
              onValueChange={value => setSoftwareFilter(value)}
              style={styles.picker}
              dropdownIconColor={theme.muted}
            >
              <Picker.Item label="All Software" value="all" />
              <Picker.Item label="IPD" value="IPD" />
              <Picker.Item label="OPD" value="OPD" />
            </Picker>
          </View>
        </View>

        {/* =====================================================
            ORGANISATION TYPE
        ===================================================== */}

        {(isAdmin || isEmployee) && (
          <View style={styles.filterGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Organisation Type</Text>

              <Text style={styles.optionalText}>Optional</Text>
            </View>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={orgTypeFilter}
                onValueChange={value => setOrgTypeFilter(value)}
                style={styles.picker}
                dropdownIconColor={theme.muted}
              >
                <Picker.Item label="All Organisation Types" value="all" />

                <Picker.Item label="Hospital" value="Hospital" />
                <Picker.Item label="Clinic" value="Clinic" />
                <Picker.Item label="Laboratory" value="Laboratory" />
              </Picker>
            </View>
          </View>
        )}

        {/* =====================================================
            ORGANISATION
        ===================================================== */}

        <View style={styles.filterGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Organisation</Text>

            {isClient ? (
              <View style={styles.lockBadge}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.lockText}>Fixed</Text>
              </View>
            ) : (
              <Text style={styles.optionalText}>Optional</Text>
            )}
          </View>

          <View
            style={[
              styles.pickerWrapper,
              isClient && styles.disabledPickerWrapper,
            ]}
          >
            {isClient ? (
              <View style={styles.lockedOrganisation}>
                <View style={styles.organisationIconContainer}>
                  <Text style={styles.organisationIcon}>⌂</Text>
                </View>

                <View style={styles.organisationTextContainer}>
                  <Text style={styles.organisationValue}>
                    {clientorganisation || 'Your organisation'}
                  </Text>

                  <Text style={styles.lockedDescription}>
                    Organisation is assigned to your account
                  </Text>
                </View>

                <Text style={styles.lockedIcon}>🔒</Text>
              </View>
            ) : (
              <Picker
                selectedValue={organisationFilter}
                onValueChange={value => setorganisationFilter(value)}
                style={styles.picker}
                dropdownIconColor={theme.muted}
              >
                <Picker.Item label="All organisations" value="all" />

                {filteredOrganisations.map(organisation => (
                  <Picker.Item
                    key={organisation._id}
                    label={organisation.name}
                    value={organisation.name}
                  />
                ))}
              </Picker>
            )}
          </View>
        </View>

        {/* =====================================================
            STATUS
        ===================================================== */}

        <View style={styles.filterGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Status</Text>

            <Text style={styles.optionalText}>Optional</Text>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={value => setStatusFilter(value)}
              style={styles.picker}
              dropdownIconColor={theme.muted}
            >
              <Picker.Item label="All Status" value="all" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="In progress" value="in-progress" />
              <Picker.Item label="Resolved" value="resolved" />
            </Picker>
          </View>
        </View>

        {/* =====================================================
            SORTING
        ===================================================== */}

        <View style={styles.filterGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Sort By</Text>

            <Text style={styles.optionalText}>Optional</Text>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sortFilter}
              onValueChange={value => setSortFilter(value)}
              style={styles.picker}
              dropdownIconColor={theme.muted}
            >
              <Picker.Item label="Newest First" value="newest" />

              <Picker.Item label="Oldest First" value="oldest" />
            </Picker>
          </View>
        </View>

        {/* =====================================================
            CLIENT ACCESS INFO
        ===================================================== */}

        {isClient && (
          <View style={styles.infoBox}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>i</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Account-based filtering</Text>

              <Text style={styles.infoText}>
                You can filter tickets by software, organisation type, status
                and sorting. Your organisation is fixed to your account.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          activeOpacity={0.85}
          onPress={onApply}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>

          <Text style={styles.applyArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* =========================================================
   THEME BASED STYLES
========================================================= */

const createStyles = (theme: any, isDarkMode: boolean) =>
  StyleSheet.create({
    /* =====================================================
       CONTAINER
    ===================================================== */

    container: {
      backgroundColor: theme.white,

      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,

      maxHeight: '88%',

      overflow: 'hidden',
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 20,

      borderBottomWidth: 1,
      borderBottomColor: theme.divider,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    headerTextContainer: {
      flex: 1,
      paddingRight: 15,
    },

    title: {
      fontSize: 22,
      fontWeight: '800',

      color: theme.ink,

      letterSpacing: -0.5,
    },

    subtitle: {
      marginTop: 5,

      fontSize: 13,
      lineHeight: 19,

      color: theme.muted,
    },

    /* =====================================================
       FILTER ICON
    ===================================================== */

    filterIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor: theme.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',
    },

    filterIconText: {
      fontSize: 23,

      color: theme.primary,

      fontWeight: '600',
    },

    /* =====================================================
       CONTENT
    ===================================================== */

    scrollContent: {
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 15,
    },

    filterGroup: {
      marginBottom: 25,
    },

    /* =====================================================
       LABEL
    ===================================================== */

    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      marginBottom: 9,
    },

    label: {
      fontSize: 14,
      fontWeight: '700',

      color: theme.text,
    },

    optionalText: {
      fontSize: 11,
      fontWeight: '600',

      color: theme.muted,

      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    /* =====================================================
       PICKER
    ===================================================== */

    pickerWrapper: {
      height: 56,

      borderWidth: 1,
      borderColor: theme.border,

      borderRadius: 14,

      backgroundColor: theme.background,

      justifyContent: 'center',

      overflow: 'hidden',
    },

    picker: {
      height: 56,
      width: '100%',

      color: theme.text,
    },

    /* =====================================================
       LOCKED ORGANISATION
    ===================================================== */

    disabledPickerWrapper: {
      backgroundColor: theme.primarySoft,

      borderColor: theme.border,
    },

    lockedOrganisation: {
      height: 56,

      paddingHorizontal: 13,

      flexDirection: 'row',
      alignItems: 'center',
    },

    organisationIconContainer: {
      width: 36,
      height: 36,

      borderRadius: 10,

      backgroundColor: theme.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',
    },

    organisationIcon: {
      fontSize: 18,

      color: theme.primary,
    },

    organisationTextContainer: {
      flex: 1,

      marginLeft: 11,
    },

    organisationValue: {
      fontSize: 14,
      fontWeight: '700',

      color: theme.text,
    },

    lockedDescription: {
      marginTop: 2,

      fontSize: 11,

      color: theme.muted,
    },

    lockedIcon: {
      fontSize: 14,

      marginLeft: 8,
    },

    disabledPicker: {
      color: theme.muted,
    },

    /* =====================================================
       BADGES
    ===================================================== */

    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 8,
      paddingVertical: 4,

      borderRadius: 8,

      backgroundColor: theme.primarySoft,
    },

    lockIcon: {
      fontSize: 9,

      marginRight: 4,
    },

    lockText: {
      fontSize: 10,
      fontWeight: '700',

      color: theme.primary,

      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    /* =====================================================
       HELPER
    ===================================================== */

    helperText: {
      marginTop: 7,

      fontSize: 11,

      color: theme.muted,
    },

    /* =====================================================
       INFO BOX
    ===================================================== */

    infoBox: {
      flexDirection: 'row',

      padding: 14,

      borderRadius: 14,

      backgroundColor: theme.blueSoft,

      borderWidth: 1,
      borderColor: theme.border,

      marginBottom: 5,
    },

    infoIconContainer: {
      width: 27,
      height: 27,

      borderRadius: 9,

      backgroundColor: theme.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',
    },

    infoIcon: {
      fontSize: 14,
      fontWeight: '800',

      color: theme.primary,
    },

    infoContent: {
      flex: 1,

      marginLeft: 10,
    },

    infoTitle: {
      fontSize: 12,
      fontWeight: '700',

      color: theme.text,

      marginBottom: 3,
    },

    infoText: {
      fontSize: 11,
      lineHeight: 16,

      color: theme.muted,
    },

    /* =====================================================
       FOOTER
    ===================================================== */

    footer: {
      paddingHorizontal: 22,
      paddingTop: 15,
      paddingBottom: 20,

      borderTopWidth: 1,
      borderTopColor: theme.divider,

      backgroundColor: theme.white,
    },

    /* =====================================================
       APPLY BUTTON
    ===================================================== */

    applyButton: {
      height: 54,

      borderRadius: 14,

      backgroundColor: theme.primary,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: theme.primary,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: isDarkMode ? 0.12 : 0.2,

      shadowRadius: 10,

      elevation: 4,
    },

    applyButtonText: {
      color: theme.dark,

      fontSize: 14,
      fontWeight: '800',

      letterSpacing: 0.1,
    },

    applyArrow: {
      marginLeft: 9,

      color: theme.dark,

      fontSize: 18,
      fontWeight: '600',
    },
  });

export default Filter;
