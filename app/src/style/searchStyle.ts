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
      paddingHorizontal: 18,
      paddingTop: 35,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    heading: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: COLORS.ink,
      letterSpacing: -0.7,
    },

    subtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
      marginTop: 5,
      marginBottom: 19,
    },

    /* =====================================================
       SEARCH
    ===================================================== */

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },

    input: {
      flex: 1,
      height: 52,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 14,

      paddingHorizontal: 15,
      paddingRight: 43,

      fontSize: 13,
      fontWeight: '500',

      color: COLORS.text,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.035,
      shadowRadius: 8,
      elevation: 1,
    },

    clearButton: {
      position: 'absolute',
      right: 92,

      width: 32,
      height: 42,

      justifyContent: 'center',
      alignItems: 'center',
    },

    clearText: {
      fontSize: 23,
      lineHeight: 25,
      color: COLORS.muted,
      fontWeight: '400',
    },

    searchButton: {
      height: 52,

      paddingHorizontal: 17,
      marginLeft: 8,

      borderRadius: 14,

      backgroundColor: COLORS.ink,

      justifyContent: 'center',
      alignItems: 'center',

      minWidth: 82,

      shadowColor: COLORS.ink,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },

    searchButtonText: {
      color: COLORS.white,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.1,
    },

    /* =====================================================
       RESULT COUNT
    ===================================================== */

    resultCount: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 4,
      marginTop: 1,
    },

    /* =====================================================
       LIST
    ===================================================== */

    list: {
      paddingTop: 4,
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
      paddingBottom: 20,
    },

    /* =====================================================
       RESULT CARD
    ===================================================== */

    resultCard: {
      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 18,

      padding: 16,

      marginTop: 10,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.045,
      shadowRadius: 13,
      elevation: 2,
    },

    /* =====================================================
       CARD HEADER
    ===================================================== */

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    title: {
      flex: 1,

      fontSize: 16,
      lineHeight: 21,

      fontWeight: '800',

      color: COLORS.ink,

      marginRight: 12,
    },

    /* =====================================================
       STATUS
    ===================================================== */

    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,

      borderRadius: 8,

      backgroundColor: COLORS.primarySoft,

      borderWidth: 1,
      borderColor: COLORS.border,

      minWidth: 66,

      alignItems: 'center',
    },

    statusText: {
      fontSize: 9,
      fontWeight: '800',

      color: COLORS.primary,

      textTransform: 'capitalize',
      letterSpacing: 0.2,
    },

    /* =====================================================
       PROBLEM
    ===================================================== */

    problem: {
      fontSize: 13,
      lineHeight: 20,

      color: COLORS.muted,

      marginTop: 11,

      fontWeight: '500',
    },

    /* =====================================================
       DIVIDER
    ===================================================== */

    divider: {
      height: 1,

      backgroundColor: COLORS.divider,

      marginVertical: 13,
    },

    /* =====================================================
       MODULE
    ===================================================== */

    module: {
      fontSize: 11,
      lineHeight: 17,

      fontWeight: '700',

      color: COLORS.muted,
    },

    /* =====================================================
       DATE
    ===================================================== */

    date: {
      fontSize: 10,

      color: COLORS.muted,

      marginTop: 5,

      fontWeight: '500',
    },

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    emptyContainer: {
      flex: 1,

      justifyContent: 'center',
      alignItems: 'center',

      paddingHorizontal: 30,

      marginTop: -40,
    },

    emptyIcon: {
      width: 58,
      height: 58,

      borderRadius: 18,

      backgroundColor: COLORS.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 14,
    },

    emptyIconText: {
      fontSize: 23,
      fontWeight: '800',
      color: COLORS.primary,
    },

    emptyTitle: {
      fontSize: 17,

      fontWeight: '800',

      color: COLORS.text,

      textAlign: 'center',
    },

    emptyText: {
      fontSize: 12,

      color: COLORS.muted,

      textAlign: 'center',

      marginTop: 6,

      lineHeight: 19,

      maxWidth: 300,
    },

    /* =====================================================
       OPTIONAL SEARCH STATE
    ===================================================== */

    searchHint: {
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 7,

      paddingHorizontal: 3,
    },

    searchHintDot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      backgroundColor: COLORS.primary,

      marginRight: 7,
    },

    searchHintText: {
      fontSize: 10,
      color: COLORS.muted,
    },
  });
};

export default createStyles;
