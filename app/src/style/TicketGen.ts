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

    keyboardContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    container: {
      paddingTop: 15,
      flex: 1,
      backgroundColor: COLORS.background,
    },

    clientContent: {
      flexGrow: 1,
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 45,
    },

    cont: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },

    /* =====================================================
       PAGE HEADER
    ===================================================== */

    pageHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 18,
      paddingHorizontal: 4,
    },

    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },

    headerIconText: {
      color: COLORS.white,
      fontSize: 22,
      fontWeight: '800',
    },

    headerTextContainer: {
      flex: 1,
    },

    headerLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: COLORS.primary,
      marginBottom: 4,
    },

    title: {
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '800',
      color: COLORS.ink,
      letterSpacing: -0.8,
    },

    subtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.muted,
      maxWidth: 600,
    },

    /* =====================================================
       FORM CARD
    ===================================================== */

    formCard: {
      backgroundColor: COLORS.white,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 20,

      shadowColor: COLORS.dark,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 2,
    },

    /* =====================================================
       CARD HEADER
    ===================================================== */

    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 23,
    },

    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.ink,
      letterSpacing: -0.2,
    },

    cardSubtitle: {
      marginTop: 4,
      maxWidth: 470,
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.muted,
    },

    requiredBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: COLORS.primarySoft,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    requiredBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: COLORS.primary,
    },

    /* =====================================================
       MESSAGE
    ===================================================== */

    messageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 13,
      marginBottom: 20,
      borderWidth: 1,
    },

    messageIcon: {
      width: 29,
      height: 29,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    successIcon: {
      backgroundColor: COLORS.greenSoft,
    },

    errorIcon: {
      backgroundColor: COLORS.coralSoft,
    },

    messageIconText: {
      fontSize: 14,
      fontWeight: '900',
    },

    messageText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },

    successBox: {
      backgroundColor: COLORS.greenSoft,
      borderColor: COLORS.green,
    },

    successText: {
      color: COLORS.green,
    },

    errorBox: {
      backgroundColor: COLORS.coralSoft,
      borderColor: COLORS.coral,
    },

    errorText: {
      color: COLORS.coral,
    },

    /* =====================================================
       FORM GROUP
    ===================================================== */

    inputContainer: {
      marginBottom: 23,
    },

    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },

    inputLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: 0.1,
    },

    requiredText: {
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.muted,
    },

    fieldHint: {
      marginTop: 6,
      fontSize: 10,
      lineHeight: 15,
      color: COLORS.muted,
    },

    /* =====================================================
       INPUT
    ===================================================== */

    inputWrapper: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 13,
      borderWidth: 1,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.white,
    },

    inputPrefix: {
      width: 42,
      height: 42,
      marginLeft: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },

    inputPrefixText: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.primary,
    },

    input: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '500',
    },

    /* =====================================================
       TEXT AREA
    ===================================================== */

    textAreaWrapper: {
      minHeight: 160,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.light,
      overflow: 'hidden',
    },

    textArea: {
      flex: 1,
      minHeight: 135,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 35,
      color: COLORS.text,
      fontSize: 13,
      lineHeight: 21,
    },

    characterCount: {
      position: 'absolute',
      right: 12,
      bottom: 10,
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.muted,
    },

    /* =====================================================
       IMAGE UPLOAD
    ===================================================== */

    imageActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },

    imageButton: {
      flex: 1,
      minHeight: 145,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    uploadIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,

      shadowColor: COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 1,
    },

    uploadIcon: {
      fontSize: 22,
      color: COLORS.primary,
      fontWeight: '800',
    },

    imageButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.text,
    },

    uploadHint: {
      marginTop: 5,
      fontSize: 10,
      color: COLORS.muted,
    },

    /* =====================================================
       IMAGE PREVIEW
    ===================================================== */

    previewSection: {
      marginTop: 15,
    },

    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },

    previewTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.text,
    },

    removeAllText: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.coral,
    },

    previewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },

    previewCard: {
      width: '50%',
      paddingHorizontal: 4,
      marginBottom: 8,
    },

    previewImage: {
      width: '100%',
      height: 120,
      borderRadius: 13,
      backgroundColor: COLORS.light,
    },

    imageOverlay: {
      position: 'absolute',
      top: 4,
      left: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    imageNumber: {
      minWidth: 25,
      height: 25,
      paddingHorizontal: 7,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.dark,
    },

    imageNumberText: {
      fontSize: 10,
      fontWeight: '800',
      color: COLORS.white,
    },

    removeImageButton: {
      width: 27,
      height: 27,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    removeImageText: {
      fontSize: 19,
      lineHeight: 20,
      fontWeight: '500',
      color: COLORS.coral,
    },

    /* =====================================================
       UPLOAD INFO
    ===================================================== */

    uploadInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 11,
      paddingHorizontal: 2,
    },

    infoDot: {
      width: 18,
      height: 18,
      borderRadius: 6,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 7,
      marginTop: 1,
    },

    infoDotText: {
      fontSize: 10,
      fontWeight: '800',
      color: COLORS.primary,
    },

    helperText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      color: COLORS.muted,
    },

    /* =====================================================
       DIVIDER
    ===================================================== */

    formDivider: {
      height: 1,
      backgroundColor: COLORS.divider,
      marginTop: 1,
      marginBottom: 18,
    },

    /* =====================================================
       SUBMIT BUTTON
    ===================================================== */

    submitButton: {
      width: '100%',
      minHeight: 54,
      borderRadius: 14,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',

      shadowColor: COLORS.ink,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.13,
      shadowRadius: 10,
      elevation: 3,
    },

    submitButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.white,
      letterSpacing: 0.1,
    },

    submittingText: {
      marginLeft: 9,
    },

    submitButtonDisabled: {
      opacity: 0.55,
    },

    submitIcon: {
      marginRight: 8,
      fontSize: 17,
      color: COLORS.white,
      fontWeight: '800',
    },

    footerNote: {
      marginTop: 10,
      textAlign: 'center',
      fontSize: 10,
      lineHeight: 15,
      color: COLORS.muted,
    },

    /* =====================================================
       SECURITY / HELP NOTE
    ===================================================== */

    securityNote: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 13,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderRadius: 15,
      backgroundColor: COLORS.primarySoft,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    securityIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    securityIconText: {
      fontSize: 13,
      fontWeight: '900',
      color: COLORS.primary,
    },

    securityContent: {
      flex: 1,
    },

    securityTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 2,
    },

    securityText: {
      fontSize: 10,
      lineHeight: 15,
      color: COLORS.muted,
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

    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: COLORS.muted,
    },

    /* =====================================================
       EXISTING COMPLAINT STYLES
    ===================================================== */

    complaintCard: {
      backgroundColor: COLORS.white,
      borderRadius: 18,
      padding: 17,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    complaintHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },

    complaintModule: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: COLORS.ink,
      marginRight: 12,
    },

    statusPickerContainer: {
      width: 135,
      height: 42,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.white,
      overflow: 'hidden',
    },

    statusPicker: {
      height: 42,
      color: COLORS.text,
    },

    clientStatus: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 7,
      backgroundColor: COLORS.light,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    clientStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
      textTransform: 'capitalize',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.divider,
    },

    label: {
      width: 78,
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.muted,
    },

    infoText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.text,
    },

    problemText: {
      marginTop: 17,
      marginBottom: 18,
      fontSize: 14,
      lineHeight: 22,
      color: COLORS.muted,
    },

    attachmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      paddingHorizontal: 13,
      backgroundColor: COLORS.light,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    attachmentButtonIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      textAlign: 'center',
      textAlignVertical: 'center',
      backgroundColor: COLORS.primarySoft,
      borderWidth: 1,
      borderColor: COLORS.border,
      fontSize: 17,
      color: COLORS.primary,
    },

    attachmentButtonText: {
      marginLeft: 11,
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text,
      flex: 1,
    },

    attachmentBadge: {
      minWidth: 25,
      height: 25,
      paddingHorizontal: 7,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primarySoft,
    },

    attachmentBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.primary,
    },

    attachmentButtonArrow: {
      marginLeft: 10,
      fontSize: 23,
      color: COLORS.muted,
    },

    noAttachments: {
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: COLORS.light,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    noAttachmentsText: {
      fontSize: 12,
      color: COLORS.muted,
    },

    dateText: {
      marginTop: 15,
      fontSize: 11,
      color: COLORS.muted,
    },

    emptyBox: {
      backgroundColor: COLORS.white,
      borderRadius: 18,
      paddingVertical: 35,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    emptyText: {
      fontSize: 14,
      color: COLORS.muted,
      textAlign: 'center',
    },

    /* =====================================================
       ATTACHMENTS MODAL
    ===================================================== */

    attachmentsModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.dark,
      justifyContent: 'flex-end',
    },

    attachmentsModalContainer: {
      height: '82%',
      backgroundColor: COLORS.white,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 18,
      paddingHorizontal: 18,
    },

    attachmentsModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 17,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.divider,
    },

    attachmentsModalTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: COLORS.ink,
    },

    attachmentsModalSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: COLORS.muted,
    },

    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.light,
    },

    modalCloseText: {
      fontSize: 16,
      color: COLORS.text,
    },

    attachmentGrid: {
      paddingTop: 17,
      paddingBottom: 30,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    attachmentImageWrapper: {
      width: '48%',
      height: 170,
      marginBottom: 14,
      borderRadius: 13,
      overflow: 'hidden',
      backgroundColor: COLORS.light,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    attachmentGridImage: {
      width: '100%',
      height: '100%',
    },

    attachmentImageNumber: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 26,
      height: 26,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.dark,
    },

    attachmentImageNumberText: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.white,
    },

    /* =====================================================
       FULL SCREEN IMAGE
    ===================================================== */

    imageModal: {
      flex: 1,
      backgroundColor: COLORS.dark,
      justifyContent: 'center',
      alignItems: 'center',
    },

    fullScreenImage: {
      width: '94%',
      height: '80%',
    },

    closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 42,
      height: 42,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.dark,
      zIndex: 10,
    },

    closeButtonText: {
      fontSize: 18,
      color: COLORS.white,
      fontWeight: '500',
    },

    /* =====================================================
       CLIENT COMPLAINTS
    ===================================================== */

    myComplaintsContainer: {
      width: '100%',
    },

    myComplaintsTitle: {
      marginBottom: 18,
      fontSize: 24,
      fontWeight: '800',
      color: COLORS.ink,
    },
  });
};

export default createStyles;
