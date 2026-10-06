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
      flex: 1,
      backgroundColor: COLORS.background,
      paddingTop: 15,
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

    pageHeader: {
      paddingTop: 20,
      paddingBottom: 8,
    },

    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    headerTextContainer: {
      flex: 1,
      paddingRight: 15,
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
      lineHeight: 37,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -1.3,
    },

    subtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
    },

    notificationButton: {
      width: 47,
      height: 47,
      borderRadius: 16,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,
      borderColor: COLORS.border,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },

    notificationIcon: {
      fontSize: 25,
      color: COLORS.ink,
    },

    notificationDot: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.coral,
      right: 9,
      top: 8,
    },

    /* =====================================================
     SEARCH
  ===================================================== */

    searchRow: {
      flexDirection: 'row',
      marginLeft: 280,
      marginTop: 10,
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

    filterButton: {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: COLORS.primarySoft,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      marginLeft: 8,
    },

    filterButtonIcon: {
      fontSize: 18,
      color: COLORS.ink,
      marginRight: 7,
    },

    filterButtonText: {
      color: COLORS.ink,
      fontSize: 12,
      fontWeight: '900',
    },

    /* =====================================================
     STATS
  ===================================================== */
    statTotal: {
      backgroundColor: COLORS.primary,
      shadowColor: COLORS.primary,
    },

    statPending: {
      backgroundColor: COLORS.orangeSoft,
      shadowColor: COLORS.orange,
    },

    statProgress: {
      backgroundColor: COLORS.blueSoft,
      shadowColor: COLORS.blue,
    },

    statResolved: {
      backgroundColor: COLORS.greenSoft,
      shadowColor: COLORS.green,
    },

    statsScroll: {
      paddingTop: 13,
      paddingBottom: 7,
      paddingRight: 10,
      gap: 9,
    },

    statCard: {
      width: 112,
      minHeight: 112,
      borderRadius: 22,
      padding: 13,

      justifyContent: 'space-between',

      shadowOffset: {
        width: 0,
        height: 7,
      },

      shadowOpacity: 0.12,
      shadowRadius: 13,
      elevation: 3,
    },

    statIcon: {
      width: 31,
      height: 31,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    statIconText: {
      fontSize: 15,
      color: COLORS.ink,
      fontWeight: '900',
    },

    statNumber: {
      fontSize: 25,
      fontWeight: '900',
      color: COLORS.ink,
    },

    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.text,
    },

    /* Make total card text white */

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
      marginBottom: 11,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: COLORS.ink,
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: '600',
    },

    ticketCountBadge: {
      minWidth: 30,
      height: 30,
      borderRadius: 11,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },

    ticketCountText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '900',
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
      gap: 12,
    },

    ticketCard: {
      backgroundColor: COLORS.white,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 15,

      shadowColor: '#7B69A5',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.07,
      shadowRadius: 14,
      elevation: 3,
    },

    ticketTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    ticketNumber: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: '#F5F2FA',
    },

    ticketNumberText: {
      fontSize: 10,
      fontWeight: '900',
      color: COLORS.muted,
      letterSpacing: 0.5,
    },

    /* =====================================================
     STATUS
  ===================================================== */

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 11,
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
      backgroundColor: '#F4F1F6',
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 6,
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
      fontSize: 10,
      fontWeight: '900',
      color: COLORS.text,
    },

    /* =====================================================
     MODULE
  ===================================================== */
    moduleIconPurple: {
      backgroundColor: COLORS.primarySoft,
      borderColor: 'rgba(115, 87, 232, 0.20)',
    },

    moduleIconCoral: {
      backgroundColor: COLORS.coralSoft,
      borderColor: 'rgba(232, 117, 104, 0.20)',
    },

    moduleIconGreen: {
      backgroundColor: COLORS.greenSoft,
      borderColor: 'rgba(39, 163, 111, 0.20)',
    },

    moduleIconBlue: {
      backgroundColor: COLORS.blueSoft,
      borderColor: 'rgba(77, 131, 232, 0.20)',
    },
    ticketTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 15,
    },

    moduleIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,
    },

    moduleIconText: {
      fontSize: 21,
      fontWeight: '900',
      color: COLORS.primary,
    },

    moduleTextContainer: {
      flex: 1,
      marginLeft: 12,
    },

    ticketModule: {
      fontSize: 17,
      fontWeight: '900',
      color: COLORS.ink,
    },

    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },

    ticketDate: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: '600',
    },

    dateDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: COLORS.light,
      marginHorizontal: 6,
    },

    chevronContainer: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor: '#F7F4FA',

      alignItems: 'center',
      justifyContent: 'center',

      marginLeft: 8,
    },

    chevron: {
      fontSize: 23,
      color: COLORS.primary,
      fontWeight: '500',
    },

    /* =====================================================
     PROBLEM
  ===================================================== */

    ticketProblem: {
      marginTop: 14,
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.text,
      fontWeight: '500',
    },

    /* =====================================================
     META
  ===================================================== */

    ticketMetaRow: {
      marginTop: 13,
      paddingTop: 12,

      borderTopWidth: 1,
      borderTopColor: COLORS.divider,

      flexDirection: 'row',
      alignItems: 'center',
    },

    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },

    metaIcon: {
      fontSize: 9,
      color: COLORS.primary,
      marginRight: 5,
    },

    metaText: {
      fontSize: 10,
      color: COLORS.muted,
      fontWeight: '700',
      flexShrink: 1,
    },

    metaDivider: {
      width: 1,
      height: 13,
      backgroundColor: COLORS.border,
      marginHorizontal: 9,
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
      backgroundColor: 'rgba(23,19,29,0.58)',
      justifyContent: 'flex-end',
    },

    filterContainer: {
      maxHeight: '91%',
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
    },

    modalHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 3,
      backgroundColor: '#D5CFDC',
      marginTop: 9,
      marginBottom: 2,
    },

    /* =====================================================
     DETAILS MODAL
  ===================================================== */

    detailsOverlay: {
      flex: 1,
      backgroundColor: 'rgba(23,19,29,0.62)',
      justifyContent: 'flex-end',
    },

    detailsContainer: {
      height: '95%',
      backgroundColor: COLORS.background,

      borderTopLeftRadius: 31,
      borderTopRightRadius: 31,

      overflow: 'hidden',
    },

    detailsContent: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 30,
    },

    /* =====================================================
     DETAILS HEADER
  ===================================================== */

    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',

      paddingTop: 10,
      paddingBottom: 18,
    },

    detailsHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    detailsModuleIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,
    },

    detailsModuleIconText: {
      fontSize: 25,
      fontWeight: '900',
      color: COLORS.primary,
    },

    detailsHeaderText: {
      flex: 1,
      marginLeft: 12,
    },

    detailsEyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.5,
      color: COLORS.primary,
      marginBottom: 4,
    },

    detailsTitle: {
      fontSize: 25,
      lineHeight: 30,
      fontWeight: '900',
      color: COLORS.ink,
      letterSpacing: -0.7,
    },

    detailsId: {
      marginTop: 4,
      fontSize: 8,
      color: COLORS.light,
      fontWeight: '600',
    },

    detailsCreated: {
      marginTop: 4,
      fontSize: 9,
      color: COLORS.muted,
      fontWeight: '600',
    },

    detailsCloseButton: {
      width: 43,
      height: 43,
      borderRadius: 15,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      alignItems: 'center',
      justifyContent: 'center',

      marginLeft: 10,
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
      borderRadius: 22,
      padding: 17,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      borderWidth: 1,
    },

    detailsSectionLabel: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.3,
      color: COLORS.muted,
      marginBottom: 7,
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
      fontSize: 18,
      fontWeight: '900',
      color: COLORS.ink,
    },

    statusDescription: {
      marginTop: 6,
      fontSize: 10,
      color: COLORS.muted,
    },

    statusIndicator: {
      width: 48,
      height: 48,
      borderRadius: 17,

      backgroundColor: 'rgba(255,255,255,0.6)',

      alignItems: 'center',
      justifyContent: 'center',
    },

    statusIndicatorDot: {
      width: 15,
      height: 15,
      borderRadius: 8,
    },

    /* =====================================================
     ADMIN
  ===================================================== */

    statusControlSection: {
      marginTop: 21,
    },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    adminOnlyLabel: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
      backgroundColor: COLORS.primarySoft,
      color: COLORS.primary,
      fontSize: 8,
      fontWeight: '900',
    },

    detailsSectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: COLORS.ink,
      marginBottom: 4,
    },

    detailsSectionSubtitle: {
      fontSize: 10,
      color: COLORS.muted,
      marginBottom: 11,
    },

    statusPickerWrapper: {
      height: 54,

      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 16,

      overflow: 'hidden',
      justifyContent: 'center',
    },

    detailsPicker: {
      height: 54,
      color: COLORS.ink,
    },

    /* =====================================================
     SECTION
  ===================================================== */

    detailSection: {
      marginTop: 23,
    },

    sectionHeadingRow: {
      marginBottom: 4,
    },

    /* =====================================================
     TIMELINE
  ===================================================== */

    timelineSection: {
      marginTop: 23,
    },

    timeline: {
      backgroundColor: COLORS.white,

      borderWidth: 1,
      borderColor: COLORS.border,

      borderRadius: 22,

      padding: 17,
    },

    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    timelineCircle: {
      width: 31,
      height: 31,
      borderRadius: 11,

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
      marginLeft: 11,
    },

    timelineTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: COLORS.ink,
    },

    timelineDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: COLORS.muted,
    },

    timelineLine: {
      width: 2,
      height: 23,

      backgroundColor: COLORS.border,

      marginLeft: 14,
      marginVertical: 4,
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

      borderRadius: 21,

      padding: 17,
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

      borderRadius: 19,

      padding: 13,

      flexDirection: 'row',
      alignItems: 'center',
    },

    detailsAttachmentIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,

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

      borderRadius: 19,

      padding: 16,
    },

    noAttachmentDetailText: {
      fontSize: 11,
      color: COLORS.muted,
    },

    /* =====================================================
     FOOTER
  ===================================================== */

    detailsFooter: {
      paddingHorizontal: 18,
      paddingTop: 11,
      paddingBottom: 19,

      backgroundColor: COLORS.white,

      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },

    detailsDoneButton: {
      height: 53,

      borderRadius: 17,

      backgroundColor: COLORS.primary,

      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 4,
    },

    detailsDoneText: {
      color: COLORS.white,
      fontSize: 13,
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
