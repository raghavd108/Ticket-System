import { StyleSheet } from 'react-native';

const createStyles = (theme: any) => {
  const COLORS = {
    // Theme-controlled colors
    background: theme.background,
    white: theme.white,

    ink: theme.ink,
    text: theme.text,
    muted: theme.muted,
    light: theme.light,

    primary: theme.primary,
    primaryDark: theme.primaryDark,
    primarySoft: theme.primarySoft,

    border: theme.border,
    divider: theme.divider,

    dark: theme.dark,

    // Status / accent colors
    blue: theme.blue,
    blueSoft: theme.blueSoft,

    coral: theme.coral,
    coralSoft: theme.coralSoft,

    orange: theme.orange,
    orangeSoft: theme.orangeSoft,

    green: theme.green,
    greenSoft: theme.greenSoft,
  };

  return StyleSheet.create({
    /* =====================================================
     SCREEN
  ===================================================== */

    container: {
      backgroundColor: COLORS.background,
    },

    adminContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    clientContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    /* =====================================================
     LOADING
  ===================================================== */

    loadingContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingIcon: {
      width: 62,
      height: 62,
      borderRadius: 22,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingIconText: {
      color: COLORS.primary,
      fontSize: 25,
      fontWeight: '900',
    },

    loadingTitle: {
      marginTop: 17,
      fontSize: 17,
      fontWeight: '900',
      color: COLORS.ink,
    },

    loadingText: {
      marginTop: 5,
      fontSize: 12,
      color: COLORS.muted,
    },

    /* =====================================================
     HEADER
  ===================================================== */

    headerBackground: {
      backgroundColor: COLORS.background,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      paddingHorizontal: 16,
      marginHorizontal: -16,
      overflow: 'hidden',
    },

    pageHeader: {
      paddingTop: 20,
      paddingBottom: 16,
      marginBottom: 0,
    },

    headerTopRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    headerTextContainer: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },

    eyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.8,
      color: COLORS.primary,
      marginBottom: 5,
    },

    title: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -1,
    },

    subtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
    },

    notificationButton: {
      width: 44,
      height: 44,
      flexShrink: 0,
      borderRadius: 14,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      marginLeft: 8,
    },

    notificationIcon: {
      fontSize: 22,
    },

    notificationDot: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.coral,
      right: 8,
      top: 7,
    },

    attendanceContainer: {
      width: '100%',
      alignSelf: 'stretch',
      marginTop: 14,
      marginBottom: 4,
    },

    headerDivider: {
      height: 1,
      width: '100%',
      backgroundColor: COLORS.border,
      marginTop: 18,
      marginBottom: 0,
    },

    /* =====================================================
     SEARCH
  ===================================================== */

    searchRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 14,
    },

    searchBox: {
      flex: 1,
      height: 48,
      borderRadius: 16,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 14,
    },

    searchIcon: {
      fontSize: 25,
      color: COLORS.muted,
      marginRight: 8,
      marginTop: -4,
    },

    searchPlaceholder: {
      fontSize: 12,
      color: COLORS.light,
      fontWeight: '600',
    },

    /* =====================================================
       MOBILE TICKET OVERVIEW / PROGRESS GRAPH
    ===================================================== */

    ticketOverview: {
      width: '100%',
      backgroundColor: COLORS.white,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginTop: 12,
      marginBottom: 10,
      shadowColor: '#17131D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.045,
      shadowRadius: 12,
      elevation: 2,
    },

    overviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    overviewEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: COLORS.muted,
      marginBottom: 5,
    },

    overviewTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      color: COLORS.ink,
    },

    overviewIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },

    progressSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 23,
      marginBottom: 17,
      gap: 8,
    },

    progressTextGroup: {
      flex: 1,
      minWidth: 0,
    },

    progressPercentage: {
      fontSize: 35,
      lineHeight: 41,
      fontWeight: '800',
      letterSpacing: -1.2,
      color: COLORS.ink,
    },

    progressCaption: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text,
      marginTop: 2,
    },

    progressSubtext: {
      fontSize: 11,
      lineHeight: 16,
      color: COLORS.muted,
      marginTop: 5,
    },

    totalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
    },

    totalBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.primary,
    },

    progressTrack: {
      height: 10,
      width: '100%',
      flexDirection: 'row',
      overflow: 'hidden',
      borderRadius: 10,
      backgroundColor: COLORS.light,
      gap: 3,
    },

    progressSegment: {
      height: '100%',
      borderRadius: 8,
      minWidth: 0,
    },

    pendingSegment: {
      backgroundColor: COLORS.orange,
    },

    inProgressSegment: {
      backgroundColor: COLORS.blue,
    },

    resolvedSegment: {
      backgroundColor: COLORS.green,
    },

    overviewDivider: {
      height: 1,
      backgroundColor: COLORS.divider,
      marginTop: 22,
      marginBottom: 17,
    },

    statusDetails: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },

    statusDetail: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 5,
    },

    statusDetailTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 10,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      flexShrink: 0,
    },

    pendingDot: {
      backgroundColor: COLORS.orange,
    },

    inProgressDot: {
      backgroundColor: COLORS.blue,
    },

    resolvedDot: {
      backgroundColor: COLORS.green,
    },

    statusDetailLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.muted,
      flexShrink: 1,
    },

    statusDetailCount: {
      fontSize: 23,
      lineHeight: 29,
      fontWeight: '800',
      color: COLORS.ink,
    },

    statusDetailCaption: {
      fontSize: 9,
      lineHeight: 14,
      color: COLORS.muted,
      marginTop: 3,
    },

    statusDivider: {
      width: 1,
      backgroundColor: COLORS.divider,
      marginHorizontal: 5,
    },

    /* =====================================================
     ERROR
  ===================================================== */

    errorBox: {
      marginTop: 10,
      backgroundColor: COLORS.coralSoft,
      borderRadius: 17,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F7D9D4',
    },

    errorIconCircle: {
      width: 31,
      height: 31,
      borderRadius: 11,
      backgroundColor: COLORS.coral,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    errorIcon: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },

    errorText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.text,
    },

    /* =====================================================
     SECTION
  ===================================================== */

    sectionHeader: {
      marginTop: 20,
      marginBottom: 12,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    sectionHeaderText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },

    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '900',
      color: COLORS.ink,
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 16,
      color: COLORS.muted,
      fontWeight: '600',
    },

    sectionHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      flexShrink: 0,
    },

    ticketCountBadge: {
      minWidth: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: COLORS.primarySoft,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 9,
    },

    ticketCountText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '900',
    },

    filterButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: COLORS.primarySoft,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /* =====================================================
     EMPTY
  ===================================================== */

    emptyBox: {
      marginTop: 15,
      backgroundColor: COLORS.white,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 30,
      paddingVertical: 65,
    },

    emptyIconContainer: {
      width: 65,
      height: 65,
      borderRadius: 22,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },

    emptyIcon: {
      fontSize: 27,
      color: COLORS.primary,
      fontWeight: '900',
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: COLORS.ink,
    },

    emptyText: {
      marginTop: 7,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 19,
      color: COLORS.muted,
    },

    /* =====================================================
     TICKET LIST
  ===================================================== */

    ticketList: {
      gap: 14,
    },

    ticketCard: {
      backgroundColor: COLORS.white,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 17,
      paddingTop: 16,
      paddingBottom: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },

    ticketTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 30,
    },

    ticketNumber: {
      minWidth: 43,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 11,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    ticketNumberText: {
      fontSize: 10,
      fontWeight: '900',
      color: COLORS.muted,
      letterSpacing: 0.7,
    },

    /* =====================================================
     STATUS
  ===================================================== */

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 31,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
      gap: 5,
    },

    statusPending: {
      backgroundColor: COLORS.orangeSoft,
    },

    statusProgress: {
      backgroundColor: COLORS.primarySoft,
    },

    statusResolved: {
      backgroundColor: COLORS.greenSoft,
    },

    statusUnknown: {
      backgroundColor: COLORS.background,
    },

    statusDotPending: {
      backgroundColor: COLORS.orange,
    },

    statusDotProgress: {
      backgroundColor: COLORS.primary,
    },

    statusDotResolved: {
      backgroundColor: COLORS.green,
    },

    statusDotUnknown: {
      backgroundColor: COLORS.muted,
    },

    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: -0.1,
    },

    /* =====================================================
     MODULE
  ===================================================== */
    moduleIconPurple: {
      backgroundColor: COLORS.primarySoft,
      borderColor: COLORS.border,
    },

    moduleIconCoral: {
      backgroundColor: COLORS.coralSoft,
      borderColor: COLORS.border,
    },

    moduleIconGreen: {
      backgroundColor: COLORS.greenSoft,
      borderColor: COLORS.border,
    },

    moduleIconBlue: {
      backgroundColor: COLORS.blueSoft,
      borderColor: COLORS.border,
    },
    ticketTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      minHeight: 56,
    },

    moduleIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      flexShrink: 0,
    },

    moduleIconText: {
      fontSize: 23,
      fontWeight: '800',
      color: COLORS.primary,
      textAlign: 'center',
    },

    moduleTextContainer: {
      flex: 1,
      minWidth: 0,
      marginLeft: 13,
    },

    ticketModule: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -0.4,
    },

    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 5,
    },

    ticketDate: {
      fontSize: 11,
      lineHeight: 16,
      color: COLORS.muted,
      fontWeight: '600',
    },

    dateDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.muted,
      marginHorizontal: 7,
    },

    chevronContainer: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      flexShrink: 0,
    },

    chevron: {
      fontSize: 27,
      lineHeight: 29,
      color: COLORS.primary,
      fontWeight: '500',
      marginTop: -2,
    },

    /* =====================================================
     PROBLEM
  ===================================================== */

    ticketProblem: {
      marginTop: 17,
      fontSize: 13,
      lineHeight: 20,
      color: COLORS.text,
      fontWeight: '500',
      letterSpacing: 0.05,
    },

    /* =====================================================
     META
  ===================================================== */

    ticketMetaRow: {
      marginTop: 16,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      rowGap: 9,
    },

    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      maxWidth: '100%',
    },

    metaIcon: {
      fontSize: 11,
      color: COLORS.primary,
      marginRight: 6,
      fontWeight: '800',
    },

    metaText: {
      fontSize: 11,
      lineHeight: 15,
      color: COLORS.muted,
      fontWeight: '700',
      flexShrink: 1,
    },

    metaDivider: {
      width: 1,
      height: 14,
      backgroundColor: COLORS.border,
      marginHorizontal: 10,
    },

    attachmentMiniBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    attachmentMiniIcon: {
      fontSize: 12,
      color: COLORS.primary,
      marginRight: 4,
    },

    attachmentMiniText: {
      fontSize: 10,
      fontWeight: '800',
      color: COLORS.muted,
    },

    /* =====================================================
     FILTER
  ===================================================== */
    filterOverlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 18, 16, 0.52)',
      justifyContent: 'flex-end',
    },

    filterContainer: {
      height: '90%',
      maxHeight: '91%',
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: 'rgba(160, 145, 120, 0.18)',
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -5,
      },
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },

    modalHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 4,
      backgroundColor: '#CFC9BE',
      marginTop: 10,
      marginBottom: 8,
    },

    premiumOverlay: {
      flex: 1,
      backgroundColor: 'rgba(14, 12, 20, 0.62)',
      justifyContent: 'flex-end',
    },

    premiumSheet: {
      flex: 1,
      marginTop: 34,
      backgroundColor: theme.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },

    premiumTop: {
      paddingHorizontal: 21,
      paddingTop: 10,
    },

    premiumGrabber: {
      alignSelf: 'center',
      width: 35,
      height: 4,
      borderRadius: 10,
      backgroundColor: theme.border || '#DED9E3',
      marginBottom: 17,
    },

    premiumTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 15,
    },

    premiumOverline: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: theme.secondaryText || '#89838F',
    },

    premiumTopTitle: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.7,
      color: theme.ink || theme.text,
      marginTop: 4,
    },

    premiumClose: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E9E4ED',
      alignItems: 'center',
      justifyContent: 'center',
    },

    premiumScroll: {
      flex: 1,
    },

    premiumScrollContent: {
      paddingHorizontal: 21,
      paddingTop: 5,
      paddingBottom: 28,
    },

    premiumIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 19,
      gap: 11,
    },

    premiumModuleIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    premiumIdentityText: {
      flex: 1,
      minWidth: 0,
    },

    premiumModuleName: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.ink || theme.text,
    },

    premiumTicketId: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.secondaryText || '#89838F',
      marginTop: 4,
    },

    premiumStatusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 20,
      maxWidth: 125,
    },

    premiumStatusText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.text,
      flexShrink: 1,
    },

    premiumProblem: {
      paddingTop: 19,
      paddingBottom: 20,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E8E2EC',
      marginBottom: 23,
    },

    premiumProblemHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
    },

    premiumProblemTitle: {
      fontSize: 21,
      lineHeight: 28,
      fontWeight: '800',
      letterSpacing: -0.65,
      color: theme.ink || theme.text,
      marginBottom: 9,
    },

    premiumProblemDescription: {
      fontSize: 14,
      lineHeight: 23,
      color: theme.text,
    },

    premiumDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
      borderTopWidth: 1,
      borderTopColor: theme.border || '#E8E2EC',
      marginTop: 18,
      paddingTop: 13,
    },

    premiumDateText: {
      fontSize: 10,
      color: theme.secondaryText || '#89838F',
      fontWeight: '600',
    },

    premiumDateDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.secondaryText || '#89838F',
      marginHorizontal: 2,
    },

    premiumSection: {
      paddingBottom: 19,
      marginBottom: 17,
      borderBottomWidth: 1,
      borderBottomColor: theme.border || '#E8E2EC',
    },

    premiumSectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 15,
    },

    premiumSectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.25,
      color: theme.ink || theme.text,
    },

    premiumSectionHint: {
      fontSize: 11,
      lineHeight: 17,
      color: theme.secondaryText || '#89838F',
      marginTop: 4,
    },

    premiumCount: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E8E2EC',
    },

    premiumCountText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },

    premiumAttachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 5,
    },

    premiumAttachmentIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E8E2EC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    premiumAttachmentInfo: {
      flex: 1,
    },

    premiumAttachmentTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.ink || theme.text,
    },

    premiumNoAttachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 7,
    },

    premiumProgressTrack: {
      paddingTop: 2,
    },

    premiumProgressStep: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    premiumProgressIcon: {
      width: 29,
      height: 29,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },

    premiumProgressDone: {
      backgroundColor: theme.primary,
    },

    premiumProgressPending: {
      backgroundColor: theme.card || theme.background,
      borderWidth: 1.5,
      borderColor: theme.border || '#DCD6E2',
    },

    premiumProgressCopy: {
      flex: 1,
    },

    premiumProgressTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.ink || theme.text,
    },

    premiumProgressConnector: {
      height: 21,
      width: 2,
      marginLeft: 13,
      backgroundColor: theme.border || '#E3DDE8',
      marginVertical: 3,
    },

    premiumRoleTag: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E8E2EC',
    },

    premiumRoleTagText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.7,
      color: theme.primary,
    },

    ticketDropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 13, 18, 0.42)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },

    ticketDropdownPanel: {
      width: '100%',
      maxHeight: '72%',
      alignSelf: 'center',
      backgroundColor: theme.card || theme.background,
      borderRadius: 20,
      paddingTop: 19,
      paddingBottom: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border || '#E7E1D8',
      elevation: 18,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
    },

    ticketDropdownEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: theme.secondaryText || '#8A8494',
      marginBottom: 5,
    },

    ticketDropdownTitle: {
      fontSize: 20,
      lineHeight: 27,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 13,
      includeFontPadding: true,
    },

    ticketDropdownOption: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 5,
      borderRadius: 12,
    },

    ticketDropdownOptionSelected: {
      backgroundColor: theme.primarySoft || '#F1E7D9',
    },

    ticketDropdownOptionText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
      color: theme.text,
      includeFontPadding: true,
    },

    ticketDropdownFooterButton: {
      height: 45,
      marginTop: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft || '#F1E7D9',
    },

    ticketDropdownFooterText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.primary,
    },

    premiumPicker: {
      minHeight: 54,
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border || '#E5DFD5',
      backgroundColor: theme.card || theme.background,
      paddingHorizontal: 14,
      overflow: 'visible',
    },

    premiumAssignButton: {
      height: 47,
      borderRadius: 13,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 11,
    },

    premiumAssignButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    premiumEmpty: {
      paddingVertical: 9,
    },

    premiumRetry: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.primary,
    },

    premiumOwner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 13,
    },

    premiumOwnerIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: theme.card || theme.background,
      borderWidth: 1,
      borderColor: theme.border || '#E8E2EC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    premiumOwnerCopy: {
      flex: 1,
    },

    premiumOwnerName: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.ink || theme.text,
    },

    premiumFooter: {
      paddingHorizontal: 21,
      paddingTop: 12,
      paddingBottom: 13,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border || '#E8E2EC',
    },

    premiumFooterButton: {
      height: 49,
      borderRadius: 15,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    premiumFooterText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    /* =====================================================
     DETAILS MODAL
  ===================================================== */

    detailsOverlay: {
      flex: 1,
      backgroundColor: 'rgba(24, 23, 20, 0.48)',
      justifyContent: 'flex-end',
    },

    detailsContainer: {
      height: '90%',
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: COLORS.border,
      shadowColor: '#17131D',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.09,
      shadowRadius: 14,
      elevation: 14,
    },

    detailsContent: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 14,
    },

    detailsHero: {
      marginHorizontal: -16,
      marginTop: -6,
      paddingHorizontal: 16,
      paddingTop: 3,
      paddingBottom: 2,
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },

    /* =====================================================
     DETAILS HEADER
  ===================================================== */

    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 7,
      paddingBottom: 12,
    },

    detailsHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    detailsModuleIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    detailsModuleIconText: {
      fontSize: 21,
      fontWeight: '900',
      color: COLORS.primary,
    },

    detailsHeaderText: {
      flex: 1,
      marginLeft: 10,
      minWidth: 0,
    },

    detailsEyebrow: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.25,
      color: COLORS.primary,
      marginBottom: 2,
    },

    detailsTitle: {
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -0.5,
    },

    detailsId: {
      marginTop: 2,
      fontSize: 8,
      color: COLORS.muted,
      fontWeight: '600',
    },

    detailsCreated: {
      marginTop: 3,
      fontSize: 9,
      color: COLORS.muted,
      fontWeight: '600',
    },

    detailsCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },

    detailsCloseText: {
      fontSize: 27,
      lineHeight: 29,
      color: COLORS.ink,
      fontWeight: '300',
    },

    /* =====================================================
     DETAILS STATUS
  ===================================================== */

    detailsStatusCard: {
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingVertical: 11,
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      shadowColor: '#17131D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.025,
      shadowRadius: 4,
      elevation: 1,
    },

    detailsSectionLabel: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.1,
      color: COLORS.muted,
      marginBottom: 4,
    },

    detailsStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    largeStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },

    detailsStatusText: {
      fontSize: 16,
      fontWeight: '900',
      color: COLORS.ink,
    },

    statusDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 14,
      color: COLORS.muted,
    },

    statusIndicator: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    statusIndicatorDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
    },

    /* =====================================================
     ADMIN
  ===================================================== */

    statusControlSection: {
      marginTop: 14,
      padding: 12,
      borderRadius: 16,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    adminOnlyLabel: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: COLORS.primarySoft,
      color: COLORS.primary,
      fontSize: 8,
      fontWeight: '900',
    },

    detailsSectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: COLORS.ink,
      marginBottom: 3,
    },

    detailsSectionSubtitle: {
      fontSize: 10,
      lineHeight: 14,
      color: COLORS.muted,
      marginBottom: 7,
    },

    statusPickerWrapper: {
      minHeight: 52,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      paddingHorizontal: 13,
      overflow: 'visible',
      justifyContent: 'center',
    },

    detailsPicker: {
      minHeight: 52,
      color: COLORS.ink,
      fontSize: 15,
      includeFontPadding: true,
      paddingVertical: 0,
    },

    /* =====================================================
     SECTION
  ===================================================== */

    detailSection: {
      marginTop: 15,
    },

    sectionHeadingRow: {
      marginBottom: 4,
    },

    /* =====================================================
     TIMELINE
  ===================================================== */

    timelineSection: {
      marginTop: 15,
    },

    timeline: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16,
      padding: 13,
    },

    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    timelineCircle: {
      width: 27,
      height: 27,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    timelineCircleCompleted: {
      backgroundColor: COLORS.green,
    },

    timelineCircleActive: {
      backgroundColor: COLORS.primary,
    },

    timelineCircleInactive: {
      backgroundColor: '#F5F2F7',
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    timelineCheck: {
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '900',
    },

    timelineText: {
      flex: 1,
      marginLeft: 9,
      paddingTop: 1,
    },

    timelineTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: COLORS.ink,
    },

    timelineDescription: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 14,
      color: COLORS.muted,
    },

    timelineLine: {
      width: 2,
      height: 14,
      backgroundColor: COLORS.border,
      marginLeft: 12,
      marginVertical: 3,
    },

    /* =====================================================
     REQUEST INFORMATION
  ===================================================== */

    detailInfoCard: {
      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 21,

      paddingHorizontal: 15,
    },

    detailInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingVertical: 13,
    },

    detailInfoIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,

      backgroundColor: COLORS.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',
    },

    detailInfoText: {
      flex: 1,
      marginLeft: 11,
    },

    detailLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: COLORS.light,
      marginBottom: 3,
    },

    detailValue: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.text,
    },

    detailSeparator: {
      height: 1,
      backgroundColor: COLORS.divider,
    },

    /* =====================================================
     PROBLEM
  ===================================================== */

    problemDetailCard: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      padding: 12,
    },

    problemDetailText: {
      fontSize: 13,
      lineHeight: 21,
      color: COLORS.text,
    },

    /* =====================================================
     ATTACHMENTS
  ===================================================== */

    attachmentsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    attachmentCount: {
      minWidth: 29,
      height: 29,

      borderRadius: 10,

      backgroundColor: COLORS.primarySoft,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 8,
    },

    attachmentCountText: {
      fontSize: 10,
      fontWeight: '900',
      color: COLORS.primary,
    },

    detailsAttachmentButton: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    detailsAttachmentIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: COLORS.coralSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    detailsAttachmentText: {
      flex: 1,
      marginLeft: 11,
    },

    detailsAttachmentTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: COLORS.ink,
    },

    detailsAttachmentSubtitle: {
      marginTop: 3,
      fontSize: 10,
      color: COLORS.muted,
    },

    detailsAttachmentArrow: {
      fontSize: 23,
      color: COLORS.primary,
      marginLeft: 8,
    },

    noAttachmentDetail: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      padding: 12,
    },

    noAttachmentDetailText: {
      fontSize: 11,
      color: COLORS.muted,
    },

    /* =====================================================
     FOOTER
  ===================================================== */

    detailsFooter: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },

    detailsDoneButton: {
      height: 44,
      borderRadius: 13,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    detailsDoneText: {
      color: COLORS.white,
      fontSize: 12,
      fontWeight: '900',
    },

    /* =====================================================
     ATTACHMENTS MODAL
  ===================================================== */

    attachmentsModalOverlay: {
      flex: 1,

      backgroundColor: 'rgba(23,19,29,0.65)',

      justifyContent: 'flex-end',
    },

    attachmentsModalContainer: {
      height: '78%',

      backgroundColor: COLORS.background,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,

      overflow: 'hidden',
    },

    attachmentsModalHeader: {
      paddingHorizontal: 20,
      paddingVertical: 17,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },

    attachmentsModalTitle: {
      fontSize: 21,
      fontWeight: '900',
      color: COLORS.ink,
    },

    attachmentsModalSubtitle: {
      marginTop: 4,
      fontSize: 10,
      color: COLORS.muted,
    },

    modalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 13,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCloseText: {
      fontSize: 25,
      lineHeight: 27,
      color: COLORS.ink,
      fontWeight: '300',
    },

    attachmentGrid: {
      padding: 13,

      flexDirection: 'row',
      flexWrap: 'wrap',

      gap: 9,
    },

    attachmentImageWrapper: {
      width: '31.8%',
      aspectRatio: 1,

      borderRadius: 15,

      overflow: 'hidden',

      backgroundColor: COLORS.white,
    },

    attachmentGridImage: {
      width: '100%',
      height: '100%',
    },

    attachmentImageNumber: {
      position: 'absolute',

      left: 7,
      top: 7,

      width: 25,
      height: 25,

      borderRadius: 8,

      backgroundColor: 'rgba(23,19,29,0.72)',

      alignItems: 'center',
      justifyContent: 'center',
    },

    attachmentImageNumberText: {
      color: COLORS.white,
      fontSize: 9,
      fontWeight: '900',
    },

    /* =====================================================
     FULL IMAGE
  ===================================================== */

    imageModal: {
      flex: 1,

      backgroundColor: '#120F16',

      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButton: {
      position: 'absolute',

      top: 45,
      right: 20,

      width: 43,
      height: 43,

      borderRadius: 14,

      backgroundColor: 'rgba(255,255,255,0.14)',

      alignItems: 'center',
      justifyContent: 'center',

      zIndex: 10,
    },

    closeButtonText: {
      color: COLORS.white,
      fontSize: 27,
      lineHeight: 29,
      fontWeight: '300',
    },

    fullScreenImage: {
      width: '100%',
      height: '85%',
    },
  });
};

export default createStyles;
