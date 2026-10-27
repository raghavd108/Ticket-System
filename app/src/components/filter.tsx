import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

type Organisation = {
  _id: string;
  name: string;
  orgType: string;
};

type Option = {
  label: string;
  value: string;
};

type FilterProps = {
  role?: string;
  clientorganisation?: string;
  organisations?: Organisation[];

  softwareFilter: string;
  setSoftwareFilter: (value: string) => void;

  organisationFilter: string;
  setorganisationFilter: (value: string) => void;

  orgTypeFilter: string;
  setOrgTypeFilter: (value: string) => void;

  statusFilter: string;
  setStatusFilter: (value: string) => void;

  sortFilter: string;
  setSortFilter: (value: string) => void;

  onApply?: () => void;
  onClose?: () => void;
};

const ACCENT = '#E9AD60';

type Styles = ReturnType<typeof createStyles>;

/* -------------------------------------------------------
   INLINE DROPDOWN
   Opens below its own field. No Modal or native Picker.
------------------------------------------------------- */

const FilterDropdown = ({
  id,
  label,
  value,
  options,
  onChange,
  styles,
  dark,
  open,
  onToggle,
  onClose,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  styles: Styles;
  dark: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}) => {
  const selected = options.find(item => item.value === value);

  return (
    <View style={[styles.field, open && styles.fieldOpen]}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.dropdown, open && styles.dropdownOpen]}
        onPress={() => onToggle(id)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || ''}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {selected?.label || 'Select an option'}
        </Text>

        <View style={[styles.dropdownIcon, open && styles.dropdownIconOpen]}>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={dark ? '#D6B27E' : '#86633C'}
          />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.inlineOptions}>
          <View style={styles.optionsCaption}>
            <Text style={styles.optionsCaptionText}>
              SELECT {label.toUpperCase()}
            </Text>

            <Text style={styles.optionsCount}>{options.length} options</Text>
          </View>

          <View style={styles.optionsContent}>
            {options.map((item, index) => {
              const selectedOption = item.value === value;

              return (
                <Pressable
                  key={`${item.value}-${index}`}
                  style={({ pressed }) => [
                    styles.inlineOption,
                    selectedOption && styles.inlineOptionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: selectedOption,
                  }}
                >
                  <View
                    style={[
                      styles.optionMarker,
                      selectedOption && styles.optionMarkerSelected,
                    ]}
                  >
                    {selectedOption && (
                      <Ionicons name="checkmark" size={13} color="#29251F" />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.inlineOptionText,
                      selectedOption && styles.inlineOptionTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>

                  {selectedOption && (
                    <View style={styles.selectedLabel}>
                      <Text style={styles.selectedLabelText}>SELECTED</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

/* -------------------------------------------------------
   CHIP SELECTOR
------------------------------------------------------- */

const ChoiceChips = ({
  label,
  value,
  options,
  onChange,
  styles,
  status = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  styles: Styles;
  status?: boolean;
}) => {
  const statusColor = (item: string) => {
    switch (item) {
      case 'pending':
        return '#D99A43';
      case 'in-progress':
        return '#7295C6';
      case 'resolved':
        return '#55A582';
      default:
        return ACCENT;
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.chipsContainer}>
        {options.map(option => {
          const selected = value === option.value;
          const color = status ? statusColor(option.value) : ACCENT;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                selected && !status && styles.chipSelected,
                selected &&
                  status && {
                    backgroundColor: color + '20',
                    borderColor: color,
                  },
              ]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              {status && option.value !== 'all' && (
                <View style={[styles.statusDot, { backgroundColor: color }]} />
              )}

              {selected && !status && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#29251F"
                  style={styles.chipCheck}
                />
              )}

              <Text
                style={[
                  styles.chipText,
                  selected && !status && styles.chipTextSelected,
                  selected &&
                    status && {
                      color,
                      fontWeight: '800',
                    },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/* -------------------------------------------------------
   MAIN FILTER PANEL
------------------------------------------------------- */

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
  onClose,
}: FilterProps) => {
  const { isDarkMode } = useTheme();
  const styles = createStyles(isDarkMode);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isClient = role?.toLowerCase() === 'client';
  const isAdmin = role?.toLowerCase() === 'admin';
  const isEmployee = role?.toLowerCase() === 'employee';

  const toggleDropdown = (id: string) => {
    setOpenDropdown(current => (current === id ? null : id));
  };

  const filteredOrganisations = useMemo(
    () =>
      orgTypeFilter === 'all'
        ? organisations
        : organisations.filter(item => item.orgType === orgTypeFilter),
    [organisations, orgTypeFilter],
  );

  useEffect(() => {
    if (
      organisationFilter !== 'all' &&
      orgTypeFilter !== 'all' &&
      !filteredOrganisations.some(item => item.name === organisationFilter)
    ) {
      setorganisationFilter('all');
    }
  }, [
    organisationFilter,
    orgTypeFilter,
    filteredOrganisations,
    setorganisationFilter,
  ]);

  const softwareOptions: Option[] = [
    { label: 'All Software', value: 'all' },
    { label: 'IPD', value: 'IPD' },
    { label: 'OPD', value: 'OPD' },
  ];

  const organisationTypeOptions: Option[] = [
    { label: 'All types', value: 'all' },
    { label: 'Hospital', value: 'Hospital' },
    { label: 'Clinic', value: 'Clinic' },
    { label: 'Laboratory', value: 'Laboratory' },
  ];

  const statusOptions: Option[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In progress', value: 'in-progress' },
    { label: 'Resolved', value: 'resolved' },
  ];

  const sortOptions: Option[] = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
  ];

  const activeCount = [
    softwareFilter !== 'all',
    !isClient && organisationFilter !== 'all',
    (isAdmin || isEmployee) && orgTypeFilter !== 'all',
    statusFilter !== 'all',
    sortFilter !== 'newest',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSoftwareFilter('all');
    setorganisationFilter('all');
    setOrgTypeFilter('all');
    setStatusFilter('all');
    setSortFilter('newest');
    setOpenDropdown(null);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.heading}>
            <View style={styles.eyebrowRow}>
              <View style={styles.accentMark} />
              <Text style={styles.eyebrow}>TICKET MANAGEMENT</Text>
            </View>

            <Text style={styles.title}>Filter tickets</Text>

            <Text style={styles.subtitle}>Find exactly what you need.</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          >
            <Ionicons
              name="close"
              size={23}
              color={isDarkMode ? '#F4F1E9' : '#292D27'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.metaIcon}>
            <Ionicons
              name="options-outline"
              size={15}
              color={isDarkMode ? '#E5B16B' : '#A96D2A'}
            />
          </View>

          <Text style={styles.metaText}>
            {activeCount === 0
              ? 'All tickets'
              : `${activeCount} filter${activeCount === 1 ? '' : 's'} adjusted`}
          </Text>

          <View style={styles.metaDivider} />

          <TouchableOpacity onPress={resetFilters} activeOpacity={0.7}>
            <Text style={styles.clearHeaderText}>Reset all</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE FIELDS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>REFINE RESULTS</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* SOFTWARE */}
        <ChoiceChips
          label="Software"
          value={softwareFilter}
          options={softwareOptions}
          onChange={setSoftwareFilter}
          styles={styles}
        />

        {/* ORGANISATION TYPE */}
        {(isAdmin || isEmployee) && (
          <FilterDropdown
            id="organisationType"
            label="Organisation type"
            value={orgTypeFilter}
            options={organisationTypeOptions}
            onChange={setOrgTypeFilter}
            styles={styles}
            dark={isDarkMode}
            open={openDropdown === 'organisationType'}
            onToggle={toggleDropdown}
            onClose={() => setOpenDropdown(null)}
          />
        )}

        {/* ORGANISATION */}
        {isClient ? (
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Organisation</Text>

              <View style={styles.fixedBadge}>
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={isDarkMode ? '#E7B66F' : '#946329'}
                />
                <Text style={styles.fixedText}>FIXED</Text>
              </View>
            </View>

            <View style={styles.organisationCard}>
              <View style={styles.organisationIcon}>
                <Ionicons name="business-outline" size={20} color={ACCENT} />
              </View>

              <View style={styles.organisationInfo}>
                <Text style={styles.organisationName} numberOfLines={1}>
                  {clientorganisation || 'Your organisation'}
                </Text>

                <Text style={styles.organisationDescription}>
                  Linked to your account
                </Text>
              </View>

              <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
            </View>
          </View>
        ) : (
          <FilterDropdown
            id="organisation"
            label="Organisation"
            value={organisationFilter}
            options={[
              { label: 'All organisations', value: 'all' },
              ...filteredOrganisations.map(item => ({
                label: item.name,
                value: item.name,
              })),
            ]}
            onChange={setorganisationFilter}
            styles={styles}
            dark={isDarkMode}
            open={openDropdown === 'organisation'}
            onToggle={toggleDropdown}
            onClose={() => setOpenDropdown(null)}
          />
        )}

        {/* TICKET STATUS */}
        <ChoiceChips
          label="Ticket status"
          value={statusFilter}
          options={statusOptions}
          onChange={setStatusFilter}
          styles={styles}
          status
        />

        {/* SORTING */}
        <View style={styles.field}>
          <Text style={styles.label}>Sort tickets</Text>

          <View style={styles.sortContainer}>
            {sortOptions.map(option => {
              const selected = sortFilter === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    selected && styles.sortOptionSelected,
                  ]}
                  onPress={() => setSortFilter(option.value)}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.sortIcon,
                      selected && styles.sortIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        option.value === 'newest' ? 'arrow-down' : 'arrow-up'
                      }
                      size={17}
                      color={
                        selected
                          ? '#29251F'
                          : isDarkMode
                          ? '#C1C6B9'
                          : '#66695F'
                      }
                    />
                  </View>

                  <View style={styles.sortInfo}>
                    <Text
                      style={[
                        styles.sortText,
                        selected && styles.sortTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={[
                        styles.sortDescription,
                        selected && styles.sortDescriptionSelected,
                      ]}
                    >
                      {option.value === 'newest'
                        ? 'Recently created tickets first'
                        : 'Older tickets first'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.sortRadio,
                      selected && styles.sortRadioSelected,
                    ]}
                  >
                    {selected && <View style={styles.sortRadioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isClient && (
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={ACCENT}
            />

            <Text style={styles.infoText}>
              Your organisation is fixed to your account. Use the other filters
              to narrow down your tickets.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FIXED FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={resetFilters}
          activeOpacity={0.75}
        >
          <Ionicons
            name="refresh-outline"
            size={17}
            color={isDarkMode ? '#E8E8E0' : '#41443B'}
          />
          <Text style={styles.clearButtonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={onApply}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Apply filters"
        >
          <Text style={styles.applyButtonText}>Apply filters</Text>

          <Ionicons name="arrow-forward" size={18} color="#29251F" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const createStyles = (dark: boolean) =>
  StyleSheet.create({
    // This component is rendered INSIDE the parent's single Modal/bottom sheet.
    // Keep it as content only: no second height, rounded sheet, border, or handle.
    container: {
      flex: 1,
      minHeight: 0,
      backgroundColor: dark ? '#121612' : '#FCFBF8',
    },

    header: {
      paddingHorizontal: 21,
      paddingBottom: 15,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: dark ? '#30362F' : '#EAE6DE',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    heading: {
      flex: 1,
      paddingRight: 12,
    },

    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },

    accentMark: {
      width: 16,
      height: 3,
      borderRadius: 3,
      backgroundColor: ACCENT,
      marginRight: 7,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.3,
      color: dark ? '#E5B16B' : '#A96D2A',
    },

    title: {
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.7,
      color: dark ? '#F5F3EC' : '#292D27',
    },

    subtitle: {
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
      color: dark ? '#A0A69A' : '#7B7D73',
    },

    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: dark ? '#20251F' : '#F1EFE8',
      borderWidth: 1,
      borderColor: dark ? '#383E35' : '#E5E0D6',
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 15,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: dark ? '#30362F' : '#EAE6DE',
    },

    metaIcon: {
      width: 25,
      height: 25,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? '#30271B' : '#F6E9D6',
      marginRight: 8,
    },

    metaText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
      color: dark ? '#D0D4C8' : '#64675D',
    },

    metaDivider: {
      width: 1,
      height: 15,
      backgroundColor: dark ? '#41463C' : '#DED9CE',
      marginHorizontal: 11,
    },

    clearHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: dark ? '#E8B975' : '#A46C2F',
    },

    scrollView: {
      flex: 1,
      minHeight: 0,
    },

    scrollContent: {
      paddingHorizontal: 21,
      paddingTop: 17,
      paddingBottom: 22,
    },

    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 19,
    },

    sectionTitle: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: dark ? '#9CA393' : '#8B8C80',
      marginRight: 12,
    },

    sectionLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: dark ? '#30362F' : '#E6E2D9',
    },

    field: {
      marginBottom: 20,
    },

    fieldOpen: {
      zIndex: 20,
      elevation: 8,
      position: 'relative',
    },

    label: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.1,
      color: dark ? '#E9E9E1' : '#353930',
      marginBottom: 9,
    },

    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },

    /* Chips */

    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      minHeight: 39,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: dark ? '#343A33' : '#E4E0D7',
      backgroundColor: dark ? '#191D19' : '#F6F4EF',
    },

    chipSelected: {
      backgroundColor: ACCENT,
      borderColor: ACCENT,
    },

    chipCheck: {
      marginRight: 5,
    },

    chipText: {
      fontSize: 11,
      fontWeight: '700',
      color: dark ? '#E4E6DD' : '#4C4F46',
    },

    chipTextSelected: {
      color: '#29251F',
      fontWeight: '800',
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 7,
    },

    /* Dropdown trigger */

    dropdown: {
      minHeight: 49,
      paddingLeft: 14,
      paddingRight: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: dark ? '#343A33' : '#E3DFD6',
      backgroundColor: dark ? '#191D19' : '#F6F4EF',
    },

    dropdownOpen: {
      borderColor: dark ? '#9B7849' : '#D9A45D',
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },

    dropdownValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: dark ? '#F0EFE8' : '#30342D',
    },

    dropdownIcon: {
      width: 29,
      height: 29,
      marginLeft: 10,
      borderRadius: 9,
      backgroundColor: dark ? '#262B24' : '#ECE9E0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    dropdownIconOpen: {
      backgroundColor: dark ? '#35291B' : '#F6E9D6',
    },

    /* Inline dropdown panel */

    inlineOptions: {
      marginTop: 4,
      elevation: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: dark ? '#343A33' : '#E3DFD6',
      backgroundColor: dark ? '#171B17' : '#FFFFFF',
      overflow: 'hidden',
    },

    optionsCaption: {
      minHeight: 35,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: dark ? '#343A33' : '#EAE6DE',
      backgroundColor: dark ? '#1C211B' : '#F8F6F1',
    },

    optionsCaptionText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: dark ? '#A8AD9F' : '#858679',
    },

    optionsCount: {
      fontSize: 10,
      fontWeight: '600',
      color: dark ? '#A8AD9F' : '#858679',
    },

    optionsContent: {
      padding: 6,
    },

    inlineOption: {
      minHeight: 43,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 9,
      borderRadius: 9,
      marginBottom: 3,
    },

    inlineOptionSelected: {
      backgroundColor: dark ? '#30271B' : '#FBF0DF',
    },

    optionPressed: {
      opacity: 0.7,
    },

    optionMarker: {
      width: 20,
      height: 20,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: dark ? '#50574B' : '#D7D3C8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    optionMarkerSelected: {
      backgroundColor: ACCENT,
      borderColor: ACCENT,
    },

    inlineOptionText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: dark ? '#E5E7DE' : '#393D34',
    },

    inlineOptionTextSelected: {
      color: dark ? '#F1C27F' : '#8B5D24',
      fontWeight: '800',
    },

    selectedLabel: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 5,
      backgroundColor: dark ? '#46341E' : '#F3DFBF',
      marginLeft: 6,
    },

    selectedLabelText: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.2,
      color: dark ? '#F4C27F' : '#8B5D24',
    },

    /* Organisation */

    fixedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: dark ? '#35291B' : '#F6E9D6',
    },

    fixedText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: dark ? '#E7B66F' : '#946329',
    },

    organisationCard: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: dark ? '#343A33' : '#E3DFD6',
      backgroundColor: dark ? '#191D19' : '#F6F4EF',
    },

    organisationIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: dark ? '#35291B' : '#F6E9D6',
      alignItems: 'center',
      justifyContent: 'center',
    },

    organisationInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 8,
    },

    organisationName: {
      fontSize: 12,
      fontWeight: '800',
      color: dark ? '#F0EFE8' : '#30342D',
    },

    organisationDescription: {
      marginTop: 3,
      fontSize: 10,
      color: dark ? '#929A8E' : '#85877E',
    },

    /* Sort rows */

    sortContainer: {
      gap: 8,
    },

    sortOption: {
      minHeight: 59,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: dark ? '#343A33' : '#E3DFD6',
      backgroundColor: dark ? '#191D19' : '#F6F4EF',
    },

    sortOptionSelected: {
      backgroundColor: dark ? '#30271B' : '#FBF0DF',
      borderColor: dark ? '#8B693D' : '#E1B779',
    },

    sortIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? '#282D26' : '#EAE7DF',
    },

    sortIconSelected: {
      backgroundColor: ACCENT,
    },

    sortInfo: {
      flex: 1,
      marginHorizontal: 10,
    },

    sortText: {
      fontSize: 12,
      fontWeight: '700',
      color: dark ? '#E4E6DD' : '#4C4F46',
    },

    sortTextSelected: {
      color: dark ? '#F4C27F' : '#8B5D24',
    },

    sortDescription: {
      fontSize: 10,
      marginTop: 3,
      color: dark ? '#959C90' : '#85877E',
    },

    sortDescriptionSelected: {
      color: dark ? '#C3AE8F' : '#98774D',
    },

    sortRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: dark ? '#62695E' : '#C5C4B9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    sortRadioSelected: {
      borderColor: ACCENT,
    },

    sortRadioDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: ACCENT,
    },

    /* Client information */

    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 12,
      backgroundColor: dark ? '#201D17' : '#F8F0E3',
      borderWidth: 1,
      borderColor: dark ? '#403426' : '#EDDFC8',
    },

    infoText: {
      flex: 1,
      marginLeft: 9,
      fontSize: 11,
      lineHeight: 17,
      color: dark ? '#C0B9A9' : '#706858',
    },

    /* Footer */

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 18,
      backgroundColor: dark ? '#121612' : '#FCFBF8',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: dark ? '#30362F' : '#E8E4DB',
    },

    clearButton: {
      minWidth: 91,
      height: 49,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: dark ? '#41473D' : '#DDD9CF',
      backgroundColor: dark ? '#1A1F19' : '#F5F3ED',
    },

    clearButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: dark ? '#E8E8E0' : '#41443B',
    },

    applyButton: {
      flex: 1,
      minHeight: 49,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: ACCENT,
    },

    applyButtonText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.1,
      color: '#29251F',
    },
  });

export default Filter;
