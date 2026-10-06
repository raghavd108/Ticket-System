import { StyleSheet } from 'react-native';

const createStyles = (theme: any) => {
  const COLORS = {
    background: theme.background,
    white: theme.white,
    everWhite: theme.everWhite,
    ink: theme.ink,
    text: theme.text,
    muted: theme.muted,
    light: theme.light,

    primary: theme.primary,
    primaryDark: theme.primaryDark,
    primarySoft: theme.primarySoft,

    blue: theme.blue,
    blueSoft: theme.blueSoft,

    coral: theme.coral,
    coralSoft: theme.coralSoft,

    orange: theme.orange,
    orangeSoft: theme.orangeSoft,

    green: theme.green,
    greenSoft: theme.greenSoft,

    border: theme.border,
    divider: theme.divider,

    dark: theme.dark,
  };

  return StyleSheet.create({
    // =========================================================
    // SCREEN
    // =========================================================

    screen: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    scrollContent: {
      paddingBottom: 70,
    },

    container: {
      width: '100%',
      maxWidth: 900,
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingTop: 22,
    },

    // =========================================================
    // HEADER
    // =========================================================

    header: {
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      marginBottom: 22,
    },

    headerContent: {
      width: '100%',
      paddingRight: 0,
    },

    eyebrow: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '900',
      letterSpacing: 2.2,
      color: COLORS.primary,
      marginBottom: 7,
      textTransform: 'uppercase',
    },

    title: {
      fontSize: 34,
      lineHeight: 39,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -1.2,
      includeFontPadding: false,
    },

    subtitle: {
      marginTop: 9,
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
      fontWeight: '500',
      maxWidth: 500,
    },

    // =========================================================
    // CREATE BUTTON
    // =========================================================

    createButton: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: 12,
      borderRadius: 15,

      backgroundColor: COLORS.primary,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },

    createIcon: {
      color: COLORS.everWhite,
      fontSize: 22,
      fontWeight: '300',
      marginRight: 7,
      lineHeight: 23,
    },

    createButtonText: {
      color: COLORS.everWhite,
      fontSize: 12,
      fontWeight: '900',
      flexShrink: 1,
    },

    // =========================================================
    // STATS
    // =========================================================

    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },

    statCard: {
      flex: 1,
      minHeight: 104,

      borderRadius: 20,
      borderWidth: 1,

      paddingHorizontal: 16,
      paddingVertical: 15,

      flexDirection: 'row',
      alignItems: 'center',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 2,
    },

    statCardPurple: {
      backgroundColor: COLORS.primarySoft,
      borderColor: 'rgba(115, 87, 232, 0.20)',
      shadowColor: COLORS.primary,
    },

    statCardGreen: {
      backgroundColor: COLORS.greenSoft,
      borderColor: 'rgba(39, 163, 111, 0.20)',
      shadowColor: COLORS.green,
    },

    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,

      backgroundColor: COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 12,

      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.035)',
    },

    statIconText: {
      color: COLORS.primary,
      fontSize: 17,
      fontWeight: '900',
    },

    statLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: COLORS.muted,
      letterSpacing: 0.8,
    },

    statValue: {
      marginTop: 3,
      fontSize: 25,
      lineHeight: 29,
      fontWeight: '900',
      color: COLORS.ink,
    },

    statValueSmall: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '900',
      color: COLORS.ink,
    },

    // =========================================================
    // SEARCH
    // =========================================================

    searchBox: {
      height: 56,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 17,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 16,

      marginBottom: 25,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.055,
      shadowRadius: 10,
      elevation: 2,
    },

    searchIcon: {
      fontSize: 25,
      color: COLORS.primary,
      marginRight: 10,
      fontWeight: '400',
    },

    searchInput: {
      flex: 1,
      height: '100%',

      color: COLORS.ink,

      fontSize: 13,
      fontWeight: '500',
    },

    clearSearch: {
      width: 31,
      height: 31,

      borderRadius: 10,

      backgroundColor: COLORS.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',
    },

    clearSearchText: {
      fontSize: 19,
      lineHeight: 22,
      color: COLORS.primary,
      fontWeight: '400',
    },

    // =========================================================
    // LIST HEADER
    // =========================================================

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -0.5,
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 10.5,
      color: COLORS.muted,
      fontWeight: '600',
    },

    refreshButton: {
      width: 42,
      height: 42,

      borderRadius: 13,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },

    refreshText: {
      fontSize: 22,
      color: COLORS.primary,
      fontWeight: '500',
    },

    // =========================================================
    // CLIENT CARD
    // =========================================================

    clientCard: {
      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 20,

      padding: 14,

      marginBottom: 11,

      flexDirection: 'row',
      alignItems: 'center',

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.065,
      shadowRadius: 12,
      elevation: 3,
    },

    clientMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },

    // =========================================================
    // AVATAR
    // =========================================================

    avatar: {
      width: 52,
      height: 52,

      borderRadius: 17,

      backgroundColor: COLORS.primary,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 12,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 3,
    },

    avatarText: {
      color: COLORS.white,
      fontSize: 18,
      fontWeight: '900',
    },

    // =========================================================
    // CLIENT INFO
    // =========================================================

    clientInfo: {
      flex: 1,
      minWidth: 0,
    },

    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      minWidth: 0,
    },

    clientName: {
      flexShrink: 1,
      maxWidth: '65%',
      fontSize: 15,
      fontWeight: '900',
      color: COLORS.ink,
    },

    // =========================================================
    // CLIENT BADGE
    // =========================================================

    activeBadge: {
      marginLeft: 7,

      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor: COLORS.greenSoft,

      paddingHorizontal: 8,
      paddingVertical: 5,

      borderRadius: 20,

      borderWidth: 1,
      borderColor: 'rgba(39, 163, 111, 0.20)',
    },

    activeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,

      backgroundColor: COLORS.green,

      marginRight: 4,
    },

    activeText: {
      fontSize: 8,
      fontWeight: '900',
      color: COLORS.green,
    },

    // =========================================================
    // EMAIL
    // =========================================================

    clientEmail: {
      fontSize: 11.5,
      color: COLORS.muted,
      marginBottom: 6,
      fontWeight: '500',
    },

    // =========================================================
    // HOSPITAL
    // =========================================================

    hospitalRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    hospitalIcon: {
      width: 18,
      height: 18,

      borderRadius: 6,

      backgroundColor: COLORS.primarySoft,

      color: COLORS.primary,

      fontSize: 10,

      textAlign: 'center',
      lineHeight: 18,

      marginRight: 6,
    },

    hospitalText: {
      flex: 1,

      fontSize: 10.5,
      color: COLORS.light,
      fontWeight: '600',
    },

    // =========================================================
    // ACTIONS
    // =========================================================

    clientActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },

    actionButton: {
      height: 38,

      paddingHorizontal: 14,

      borderRadius: 12,

      backgroundColor: COLORS.primarySoft,

      justifyContent: 'center',
      alignItems: 'center',

      borderWidth: 1,
      borderColor: 'rgba(115, 87, 232, 0.20)',
    },

    actionButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
      color: COLORS.primary,
    },

    moreButton: {
      width: 38,
      height: 38,

      marginLeft: 7,

      borderRadius: 12,

      backgroundColor: COLORS.background,

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',
    },

    moreButtonText: {
      fontSize: 13,
      color: COLORS.muted,
      letterSpacing: 1,
      fontWeight: '800',
    },

    // =========================================================
    // LOADING
    // =========================================================

    loadingContainer: {
      backgroundColor: COLORS.white,

      borderRadius: 20,

      borderWidth: 1,
      borderColor: COLORS.border,

      paddingVertical: 50,

      alignItems: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },

    loadingText: {
      marginTop: 11,

      fontSize: 11,
      color: COLORS.muted,
      fontWeight: '600',
    },

    // =========================================================
    // EMPTY STATE
    // =========================================================

    emptyCard: {
      backgroundColor: COLORS.white,

      borderRadius: 22,

      borderWidth: 1,
      borderColor: COLORS.border,

      paddingHorizontal: 25,
      paddingVertical: 48,

      alignItems: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },

    emptyIcon: {
      width: 60,
      height: 60,

      borderRadius: 19,

      backgroundColor: COLORS.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 14,
    },

    emptyIconText: {
      fontSize: 19,
      fontWeight: '900',
      color: COLORS.primary,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: COLORS.ink,
    },

    emptyText: {
      marginTop: 6,

      maxWidth: 300,

      textAlign: 'center',

      fontSize: 11,
      lineHeight: 17,

      color: COLORS.muted,
      fontWeight: '500',
    },

    emptyButton: {
      marginTop: 18,

      backgroundColor: COLORS.primary,

      paddingHorizontal: 18,
      paddingVertical: 11,

      borderRadius: 12,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 3,
    },

    emptyButtonText: {
      color: COLORS.white,
      fontSize: 11,
      fontWeight: '900',
    },

    // =========================================================
    // FOOTER
    // =========================================================

    footerText: {
      textAlign: 'center',

      marginTop: 28,
      marginBottom: 10,

      fontSize: 9,
      color: COLORS.light,
      fontWeight: '600',
    },

    // =========================================================
    // CREATE BUTTON ROW
    // =========================================================

    createButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 10,
      marginTop: 17,
    },

    clientCreateButton: {
      flex: 1,
    },

    employeeCreateButton: {
      flex: 1,
    },

    emptyButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },

    // =========================================================
    // MODAL
    // =========================================================

    modalOverlay: {
      flex: 1,

      backgroundColor: 'rgba(23,19,29,0.62)',

      justifyContent: 'flex-end',
    },

    modalContainer: {
      backgroundColor: COLORS.background,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,

      paddingHorizontal: 21,
      paddingTop: 23,
      paddingBottom: 18,

      maxHeight: '93%',

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 12,
    },

    modalHeader: {
      flexDirection: 'row',

      justifyContent: 'space-between',
      alignItems: 'flex-start',

      marginBottom: 22,
    },

    modalHeaderContent: {
      flex: 1,
      paddingRight: 14,
    },

    modalEyebrow: {
      alignSelf: 'flex-start',

      backgroundColor: COLORS.primarySoft,

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 7,

      marginBottom: 8,
    },

    modalEyebrowText: {
      fontSize: 7.5,
      fontWeight: '900',
      color: COLORS.primary,
      letterSpacing: 1,
    },

    modalTitle: {
      fontSize: 25,
      lineHeight: 30,

      fontWeight: '900',

      color: COLORS.ink,

      letterSpacing: -0.7,
    },

    modalSubtitle: {
      marginTop: 5,

      fontSize: 10.5,
      lineHeight: 16,

      color: COLORS.muted,

      fontWeight: '600',
    },

    closeButton: {
      width: 40,
      height: 40,

      borderRadius: 13,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 1,
    },

    closeText: {
      fontSize: 23,
      lineHeight: 25,

      color: COLORS.ink,

      fontWeight: '300',
    },

    modalScrollContent: {
      paddingBottom: 12,
    },

    clientModalCard: {
      width: '100%',
      maxWidth: 430,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 22,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 12,
    },

    clientModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    clientAvatar: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: '#F1EFEA',
      alignItems: 'center',
      justifyContent: 'center',
    },

    clientAvatarText: {
      fontSize: 23,
      fontWeight: '700',
      color: '#292929',
    },

    clientHeaderInfo: {
      flex: 1,
      marginLeft: 14,
    },

    clientModalName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1D1D1D',
      marginBottom: 6,
    },

    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#F4F2ED',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },

    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6A665E',
      letterSpacing: 0.5,
    },

    closeButtonText: {
      fontSize: 25,
      lineHeight: 27,
      color: '#55514A',
      fontWeight: '400',
    },

    modalDivider: {
      height: 1,
      backgroundColor: '#ECEAE5',
      marginVertical: 20,
    },

    detailsSection: {
      gap: 18,
    },

    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    detailIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#F7F6F3',
      alignItems: 'center',
      justifyContent: 'center',
    },

    detailContent: {
      flex: 1,
      marginLeft: 13,
      paddingTop: 2,
    },

    detailLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#99958D',
      letterSpacing: 1,
      marginBottom: 5,
    },

    detailValue: {
      fontSize: 15,
      fontWeight: '600',
      color: '#282725',
    },

    employeeList: {
      gap: 8,
      marginTop: 2,
    },

    employeeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8F7F4',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    employeeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#77736B',
      marginRight: 10,
    },

    employeeName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#292824',
    },

    employeeDesignation: {
      fontSize: 11,
      color: '#99958D',
      marginTop: 2,
    },

    noEmployeeText: {
      fontSize: 14,
      color: '#9A968E',
      fontStyle: 'italic',
    },

    doneButton: {
      marginTop: 22,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#252421',
      alignItems: 'center',
      justifyContent: 'center',
    },

    doneButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    // =========================================================
    // FORM
    // =========================================================

    field: {
      marginBottom: 16,
    },

    label: {
      fontSize: 9,

      fontWeight: '900',

      color: COLORS.text,

      marginBottom: 7,

      letterSpacing: 0.6,
    },

    input: {
      height: 52,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 14,

      paddingHorizontal: 14,

      fontSize: 13,

      color: COLORS.ink,

      backgroundColor: COLORS.white,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.025,
      shadowRadius: 5,
      elevation: 1,
    },

    // =========================================================
    // PASSWORD
    // =========================================================

    passwordWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },

    passwordInput: {
      paddingRight: 68,
    },

    passwordToggle: {
      position: 'absolute',

      right: 10,

      height: 32,

      paddingHorizontal: 9,

      borderRadius: 9,

      backgroundColor: COLORS.primarySoft,

      justifyContent: 'center',
      alignItems: 'center',
    },

    passwordToggleText: {
      fontSize: 9,
      fontWeight: '900',
      color: COLORS.primary,
    },

    // =========================================================
    // ROLE CARD
    // =========================================================

    roleOptions: {
      gap: 10,
    },

    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderWidth: 1,
      borderColor: '#E4E4E7',
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },

    roleOptionSelected: {
      borderColor: '#7357E8',
      backgroundColor: '#F7F4FF',
    },

    roleRadio: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#A1A1AA',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    roleRadioSelected: {
      borderColor: '#7357E8',
    },

    roleRadioDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: '#7357E8',
    },

    roleOptionContent: {
      flex: 1,
    },

    roleOptionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#27272A',
      marginBottom: 3,
    },

    roleOptionTitleSelected: {
      color: '#7357E8',
    },

    roleOptionText: {
      fontSize: 12,
      color: '#71717A',
    },

    selectedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#7357E8',
    },

    selectedBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // =========================================================
    // SUBMIT
    // =========================================================

    submitButton: {
      height: 54,

      borderRadius: 16,

      backgroundColor: COLORS.primary,

      alignItems: 'center',
      justifyContent: 'center',

      flexDirection: 'row',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },

    submitButtonDisabled: {
      opacity: 0.55,
    },

    submitIcon: {
      color: COLORS.white,
      fontSize: 19,
      marginRight: 8,
      lineHeight: 21,
    },

    submitText: {
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '900',
    },

    // =========================================================
    // CANCEL
    // =========================================================

    cancelButton: {
      height: 48,

      alignItems: 'center',
      justifyContent: 'center',

      marginTop: 5,
    },

    cancelText: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.muted,
    },
  });
};

export default createStyles;
