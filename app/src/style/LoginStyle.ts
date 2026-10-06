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
    /* =====================================================
       SCREEN
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor: COLORS.background,

      justifyContent: 'center',
      alignItems: 'center',

      paddingHorizontal: 20,
      paddingVertical: 30,
    },

    /* =====================================================
       LOGIN CARD
    ===================================================== */

    card: {
      width: '100%',
      maxWidth: 430,

      backgroundColor: COLORS.white,

      borderRadius: 24,

      paddingHorizontal: 24,
      paddingVertical: 28,

      borderWidth: 1,
      borderColor: COLORS.border,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.07,
      shadowRadius: 20,

      elevation: 3,
    },

    /* =====================================================
       BRAND / ICON
    ===================================================== */

    brandContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },

    brandIcon: {
      width: 58,
      height: 58,

      borderRadius: 18,

      backgroundColor: COLORS.primary,

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 15,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.18,
      shadowRadius: 10,

      elevation: 4,
    },

    brandIconText: {
      fontSize: 24,
      fontWeight: '900',
      color: COLORS.white,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    title: {
      fontSize: 28,

      lineHeight: 34,

      fontWeight: '800',

      color: COLORS.ink,

      textAlign: 'center',

      letterSpacing: -0.7,

      marginBottom: 6,
    },

    subtitle: {
      fontSize: 13,

      lineHeight: 19,

      color: COLORS.muted,

      textAlign: 'center',

      marginBottom: 27,

      paddingHorizontal: 15,
    },

    /* =====================================================
       INPUT GROUP
    ===================================================== */

    inputContainer: {
      marginBottom: 17,
    },

    label: {
      fontSize: 12,

      fontWeight: '800',

      color: COLORS.text,

      marginBottom: 8,

      letterSpacing: 0.1,
    },

    /* =====================================================
       INPUT
    ===================================================== */

    input: {
      width: '100%',

      height: 52,

      borderWidth: 1,

      borderColor: COLORS.border,

      borderRadius: 13,

      paddingHorizontal: 15,

      fontSize: 13,

      fontWeight: '500',

      color: COLORS.text,

      backgroundColor: COLORS.white,
    },

    inputFocused: {
      borderColor: COLORS.primary,

      backgroundColor: COLORS.white,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,

      elevation: 1,
    },

    /* =====================================================
       LOGIN BUTTON
    ===================================================== */

    loginButton: {
      height: 54,

      backgroundColor: COLORS.primary,

      borderRadius: 14,

      justifyContent: 'center',
      alignItems: 'center',

      marginTop: 7,

      shadowColor: COLORS.ink,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.13,
      shadowRadius: 10,

      elevation: 3,
    },

    loginText: {
      color: COLORS.white,

      fontSize: 13,

      fontWeight: '800',

      letterSpacing: 0.2,
    },

    /* =====================================================
       REGISTER
    ===================================================== */

    registerContainer: {
      flexDirection: 'row',

      justifyContent: 'center',
      alignItems: 'center',

      marginTop: 21,

      paddingTop: 19,

      borderTopWidth: 1,

      borderTopColor: COLORS.divider,
    },

    registerText: {
      color: COLORS.muted,

      fontSize: 12,

      fontWeight: '500',
    },

    registerLink: {
      color: COLORS.primary,

      fontSize: 12,

      fontWeight: '800',

      marginLeft: 5,
    },

    /* =====================================================
       OPTIONAL ERROR MESSAGE
    ===================================================== */

    errorBox: {
      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor: COLORS.coralSoft,

      borderWidth: 1,

      borderColor: COLORS.coral,

      borderRadius: 12,

      paddingHorizontal: 12,

      paddingVertical: 10,

      marginBottom: 17,
    },

    errorIcon: {
      width: 25,
      height: 25,

      borderRadius: 8,

      backgroundColor: COLORS.coralSoft,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 9,
    },

    errorIconText: {
      color: COLORS.coral,

      fontSize: 12,

      fontWeight: '900',
    },

    errorText: {
      flex: 1,

      color: COLORS.coral,

      fontSize: 11,

      lineHeight: 17,

      fontWeight: '600',
    },

    /* =====================================================
       LOADING
    ===================================================== */

    loadingButton: {
      opacity: 0.65,
    },

    /* =====================================================
       FOOTER
    ===================================================== */

    footerText: {
      marginTop: 17,

      textAlign: 'center',

      fontSize: 10,

      lineHeight: 15,

      color: COLORS.muted,
    },
  });
};

export default createStyles;
