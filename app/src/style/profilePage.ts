import { StyleSheet } from 'react-native';
const createStyles = (theme: any) => {
  const COLORS = {
    background: theme.background,
    white: theme.white,

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
    // SCREEN

    container: {
      paddingTop: 15,
      flex: 1,
      backgroundColor: COLORS.background,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 50,
    },

    // =========================================================
    // PROFILE HEADER
    // =========================================================

    profileHeader: {
      backgroundColor: COLORS.white,

      borderRadius: 24,

      padding: 18,

      marginBottom: 24,

      borderWidth: 1,
      borderColor: COLORS.border,

      flexDirection: 'row',
      alignItems: 'center',

      shadowColor: '#766B8D',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.07,
      shadowRadius: 14,
      elevation: 3,
    },

    avatar: {
      width: 70,
      height: 70,

      borderRadius: 22,

      backgroundColor: COLORS.primary,

      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.2,
      shadowRadius: 11,
      elevation: 4,
    },

    avatarText: {
      color: COLORS.white,

      fontSize: 27,

      fontWeight: '900',

      letterSpacing: -0.5,
    },

    profileHeaderInfo: {
      flex: 1,

      marginLeft: 15,

      minWidth: 0,
    },

    profileName: {
      fontSize: 20,

      lineHeight: 25,

      fontWeight: '900',

      color: COLORS.ink,

      letterSpacing: -0.4,
    },

    profileEmail: {
      marginTop: 4,

      fontSize: 12,

      color: COLORS.muted,

      fontWeight: '500',
    },

    roleBadge: {
      alignSelf: 'flex-start',

      marginTop: 9,

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 8,

      backgroundColor: COLORS.primarySoft,

      borderWidth: 1,
      borderColor: '#DDD4FF',
    },

    roleText: {
      fontSize: 8.5,

      fontWeight: '900',

      color: COLORS.primary,

      textTransform: 'capitalize',

      letterSpacing: 0.4,
    },

    // =========================================================
    // SECTION
    // =========================================================

    section: {
      marginBottom: 23,
    },

    sectionTitle: {
      marginBottom: 10,

      fontSize: 16,

      fontWeight: '900',

      color: COLORS.ink,

      letterSpacing: -0.2,
    },

    // =========================================================
    // INFORMATION CARD
    // =========================================================

    infoCard: {
      backgroundColor: COLORS.white,

      borderRadius: 19,

      borderWidth: 1,

      borderColor: COLORS.border,

      paddingHorizontal: 15,

      shadowColor: '#766B8D',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.045,
      shadowRadius: 11,
      elevation: 2,
    },

    infoItem: {
      flexDirection: 'row',

      alignItems: 'center',

      paddingVertical: 15,
    },

    infoIcon: {
      width: 40,
      height: 40,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor: COLORS.primarySoft,

      borderWidth: 1,
      borderColor: '#E1D9FF',
    },

    infoIconText: {
      fontSize: 13,

      fontWeight: '900',

      color: COLORS.primary,
    },

    infoContent: {
      flex: 1,

      marginLeft: 12,

      minWidth: 0,
    },

    infoLabel: {
      fontSize: 8.5,

      fontWeight: '900',

      color: COLORS.muted,

      marginBottom: 4,

      textTransform: 'uppercase',

      letterSpacing: 0.7,
    },

    infoValue: {
      fontSize: 13,

      lineHeight: 18,

      fontWeight: '700',

      color: COLORS.ink,
    },

    divider: {
      height: 1,

      backgroundColor: COLORS.divider,

      marginLeft: 52,
    },

    // =========================================================
    // SETTINGS
    // =========================================================

    settingsCard: {
      backgroundColor: COLORS.white,

      borderRadius: 19,

      borderWidth: 1,

      borderColor: COLORS.border,

      paddingHorizontal: 15,

      shadowColor: '#766B8D',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.045,
      shadowRadius: 11,
      elevation: 2,
    },

    settingItem: {
      flexDirection: 'row',

      alignItems: 'center',

      paddingVertical: 15,
    },

    settingIcon: {
      width: 41,
      height: 41,

      borderRadius: 12,

      backgroundColor: '#F7F4FA',

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',
    },

    settingIconText: {
      fontSize: 15,

      fontWeight: '800',

      color: COLORS.primary,
    },

    settingContent: {
      flex: 1,

      marginLeft: 12,

      minWidth: 0,
    },

    settingTitle: {
      fontSize: 13,

      fontWeight: '800',

      color: COLORS.ink,
    },

    settingDescription: {
      marginTop: 4,

      fontSize: 10.5,

      lineHeight: 15,

      color: COLORS.muted,

      fontWeight: '500',
    },

    settingArrow: {
      fontSize: 25,

      lineHeight: 27,

      fontWeight: '300',

      color: '#A8A1B1',

      marginLeft: 8,
    },

    // =========================================================
    // LOGOUT
    // =========================================================

    logoutButton: {
      height: 52,

      borderRadius: 15,

      backgroundColor: COLORS.coralSoft,
      borderColor: 'rgba(232, 117, 104, 0.20)',

      borderWidth: 1,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      marginTop: 1,
    },

    logoutIcon: {
      fontSize: 18,

      color: COLORS.coral,

      marginRight: 8,
    },

    logoutText: {
      fontSize: 13,

      fontWeight: '900',

      color: COLORS.coral,
    },

    footerText: {
      marginTop: 18,

      textAlign: 'center',

      fontSize: 9,

      color: COLORS.light,

      fontWeight: '600',

      letterSpacing: 0.2,
    },

    // =========================================================
    // LOADING
    // =========================================================

    loadingContainer: {
      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor: COLORS.background,
    },

    loadingText: {
      marginTop: 11,

      fontSize: 11,

      color: COLORS.muted,

      fontWeight: '600',
    },

    errorText: {
      fontSize: 13,

      color: 'red',

      marginBottom: 15,

      fontWeight: '600',
    },

    retryButton: {
      paddingHorizontal: 20,

      paddingVertical: 11,

      borderRadius: 11,

      backgroundColor: COLORS.primary,

      shadowColor: COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.18,

      shadowRadius: 8,

      elevation: 3,
    },

    retryButtonText: {
      color: COLORS.white,

      fontSize: 12,

      fontWeight: '800',
    },

    // =========================================================
    // MODAL OVERLAY
    // =========================================================

    modalOverlay: {
      flex: 1,

      backgroundColor: 'rgba(23,19,29,0.60)',

      justifyContent: 'center',

      paddingHorizontal: 18,

      paddingVertical: 28,
    },

    // =========================================================
    // MODAL CONTAINER
    // =========================================================

    modalContainer: {
      backgroundColor: COLORS.background,

      borderRadius: 25,

      paddingHorizontal: 20,

      paddingTop: 21,

      paddingBottom: 20,

      maxHeight: '90%',

      width: '100%',

      alignSelf: 'center',

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 10,
      },

      shadowOpacity: 0.18,

      shadowRadius: 22,

      elevation: 10,
    },

    // =========================================================
    // MODAL HEADER
    // =========================================================

    modalHeader: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent: 'space-between',

      marginBottom: 22,
    },

    modalTitle: {
      fontSize: 22,

      lineHeight: 27,

      fontWeight: '900',

      color: COLORS.ink,

      letterSpacing: -0.4,
    },

    modalSubtitle: {
      marginTop: 5,

      fontSize: 10.5,

      lineHeight: 16,

      color: COLORS.muted,

      fontWeight: '500',
    },

    modalCloseButton: {
      width: 39,

      height: 39,

      borderRadius: 13,

      backgroundColor: COLORS.white,

      borderWidth: 1,

      borderColor: COLORS.border,

      alignItems: 'center',

      justifyContent: 'center',

      shadowColor: '#766B8D',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.04,

      shadowRadius: 5,

      elevation: 1,
    },

    modalCloseText: {
      fontSize: 14,

      lineHeight: 17,

      color: COLORS.text,

      fontWeight: '500',
    },

    // =========================================================
    // MODAL INPUT
    // =========================================================

    modalInputContainer: {
      marginBottom: 16,
    },

    modalLabel: {
      marginBottom: 7,

      fontSize: 9,

      fontWeight: '900',

      color: COLORS.text,

      letterSpacing: 0.5,

      textTransform: 'uppercase',
    },

    modalInput: {
      height: 52,

      paddingHorizontal: 14,

      borderRadius: 14,

      borderWidth: 1,

      borderColor: COLORS.border,

      backgroundColor: COLORS.white,

      fontSize: 13,

      color: COLORS.ink,

      fontWeight: '500',

      shadowColor: '#766B8D',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.025,

      shadowRadius: 5,

      elevation: 1,
    },

    // =========================================================
    // MODAL PRIMARY BUTTON
    // =========================================================

    modalPrimaryButton: {
      height: 53,

      marginTop: 4,

      borderRadius: 15,

      backgroundColor: COLORS.primary,

      alignItems: 'center',

      justifyContent: 'center',

      shadowColor: COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.2,

      shadowRadius: 11,

      elevation: 4,
    },

    modalPrimaryButtonText: {
      fontSize: 13,

      fontWeight: '900',

      color: COLORS.white,
    },

    disabledButton: {
      opacity: 0.55,
    },
    settingRow: {
      width: '100%',
      minHeight: 75,
      borderRadius: 15,
      marginTop: 30,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    settingSubtitle: {
      fontSize: 13,
      marginTop: 4,
    },
  });
};

export default createStyles;
