// Category Configuration
import { categories } from './main-categories.js';
export { categories };

// Request Types
import { requestTypes } from './request-types.js';
export { requestTypes };

export const subcategories = {
    applicationSystemSupport: {
        aarmSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivityIssue", text: "Connectivity Issue"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        d2System: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        pecsSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        otherApplication: [
            {value: "applicationIssue", text: "Application Issue"}
        ],
        salesforceCscSupport: [
            {value: "profileIssue", text: "Profile Issue"}
        ],
        salesforceIhssSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        possSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        pbcsSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "profileIssue", text: "Profile Issue"},
            {value: "smartViewIssue", text: "Smart View Issue"}
        ],
        eprsSupport: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        myAssets: [
            {value: "assetsAssignment", text: "Assets Assignment"}
        ],
        orcasSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        dpssPortalSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "contentIssue", text: "Content Issue"},
            {value: "profileIssue", text: "Profile Issue"},
            {value: "websiteProblem", text: "Website Problem"}
        ],
        cg4Support: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        cherwell: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        dataMiningSystem: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        teleworkTracking: [
            {value: "applicationIssue", text: "Application Issue"},
            {value: "profileIssue", text: "Profile Issue"},
            {value: "connectivity", text: "Connectivity"}
        ],
        yoslSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "profileIssue", text: "Profile Issue"},
            {value: "applicationIssue", text: "Application"}
        ],
        workAssignment: [
            {value: "profileIssue", text: "Profile Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "applicationIssue", text: "Application Issue"}
        ],
        edmsSupport: [
            {value: "profileIssue", text: "Profile Issue"},
            {value: "systemIssue", text: "System Issue"},
            {value: "scannerIssue", text: "Scanner Issue"},
            {value: "accessIssue", text: "Access Issue"}
        ]
    },
    infrastructureManagement: {
        serverSupport: [
            {value: "activeDirectory", text: "Active Directory"},
            {value: "fileShares", text: "File Shares"},
            {value: "backup", text: "Backup"},
            {value: "assetMove", text: "Asset Move"},
            {value: "fileTransfers", text: "File Transfers"},
            {value: "hardware", text: "Hardware"},
            {value: "ipAddressing", text: "IP addressing"},
            {value: "powerIssues", text: "Power issues"},
            {value: "vm", text: "VM"},
            {value: "vpn", text: "VPN"}
        ],
        emailSupport: [
            {value: "distributionGroup", text: "Distribution Group"},
            {value: "encryption", text: "Encryption"},
            {value: "msOutlook", text: "MS Outlook"},
            {value: "nameChange", text: "Name Change"},
            {value: "oneDrive", text: "OneDrive"},
            {value: "permissionLevelChange", text: "Permission Level Change"},
            {value: "phishing", text: "Phishing"},
            {value: "sharedMailbox", text: "Shared Mailbox"},
            {value: "sharePoint", text: "SharePoint"}
        ],
        applicationSupport: [
            {value: "calabrio", text: "Calabrio"}
        ],
        appstream: [
            {value: "accessIssueAppstream", text: "Access Issue"},
            {value: "personalWiFiProblem", text: "Personal Wi-Fi Problem (No Signal or Weak Signal)"},
            {value: "profilePasswordRelated", text: "Profile / Password Related"},
            {value: "systemIssue", text: "System Issue"},
            {value: "userTrainingIssue", text: "User Training Issue"}
        ],
        cmips: [
            {value: "connectivity", text: "Connectivity"}
        ],
        cscNetworkSupport: [
            {value: "awsCallCenter", text: "AWS Call Center"},
            {value: "calSAWSCallCenterApplications", text: "CalSAWS Call Center Applications"},
            {value: "ciscoFinesse", text: "CISCO / Finesse"},
            {value: "connectivityCSC", text: "Connectivity"},
            {value: "ihssCallCenter", text: "IHSS Call Center"},
            {value: "powerOutage", text: "Power Outage"},
            {value: "voipCSC", text: "VOIP"}
        ],
        wifiSupport: [
            {value: "wifiConnectionRequest", text: "Wi-Fi connection request - Add/Remove wifi device or Wi-Fi user"},
            {value: "wifiConnectionIssues", text: "Wi-Fi connection issues - Disconnected or slow performance"}
        ],
        zscalerAccess: [
            {value: "zscalerAccessIssue", text: "Access Issue"},
            {value: "zscalerPersonalWiFiProblem", text: "Personal WiFi Problem (No Signal or Weak Signal)"},
            {value: "zscalerProfilePasswordRelated", text: "Profile/Password Related"},
            {value: "zscalerSystemIssue", text: "System Issue"},
            {value: "zscalerUserTrainingIssue", text: "User Training Issue"}
        ],
        vpnSupport: [
            {value: "vpnSetup", text: "Setup"},
            {value: "vpnProfileChanges", text: "Profile changes"}
        ],
        securitySurveillanceCameras: [
            {value: "sscConnectivity", text: "Connectivity"},
            {value: "sscHardware", text: "Hardware"},
            {value: "sscPowerOutage", text: "Power Outage"},
            {value: "sscSoftware", text: "Software"}
        ],
        eFaxSupport: [
            {value: "eFaxSoftware", text: "Software"}
        ],
        cuicSupport: [
            {value: "cuic", text: "CUIC"}
        ],
        niceApplicationSupport: [
            {value: "niceApplication", text: "NICE Application"}
        ],
        ctiosSupport: [
            {value: "ctios", text: "CTIOS"}
        ],
        finesseApplicationSupport: [
            {value: "tscHelpDeskFinesse", text: "TSC Help Desk Finesse"}
        ],
        enterpriseStorageSupport: [
            {value: "infraHardware", text: "Hardware"},
            {value: "managementReport", text: "Management Report"},
            {value: "upgradeAddDiskSpace", text: "Upgrade/Add Disk Space"}
        ],
        electronicBulletinBoardSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "contentProblem", text: "Content Problem"},
            {value: "powerOutage", text: "Power Outage"},
            {value: "softwareProblem", text: "Software Problem"}
        ],
        keyCardAccess: [
            {value: "accessProblem", text: "Access Problem"},
            {value: "hardwareProblem", text: "Hardware Problem"}
        ],
        software: [
            {value: "security", text: "Security"}
        ],
        softwareSupport: [
            {value: "mcAfeeVirusShield", text: "McAfee Virus Shield"},
            {value: "security", text: "Security"}
        ],
        sslvpn: [
            {value: "accessIssue", text: "Access Issue"},
            {value: "personalWiFiProblem", text: "Personal WiFi Problem (No Signal or Weak Signal)"},
            {value: "profilePasswordRelated", text: "Profile/Password Related"},
            {value: "systemIssue", text: "System Issue"},
            {value: "userTrainingIssue", text: "User Training Issue"}
        ],
        voipNonCscSupport: [
            {value: "hardware", text: "Hardware"},
            {value: "service", text: "Service"}
        ],
        vtcSupport: [
            {value: "vtcSupport", text: "VTC Support"}
        ],
        wanLanSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "maintenance", text: "Maintenance"},
            {value: "powerIssue", text: "Power Issue"}
        ]
    },
    technicalSupport: {
        mobileSupport: [
            {value: "portableEquipment", text: "Portable Equipment"}
        ],
        benefitsCalSupport: [
            {value: "websiteIssue", text: "Website Issue"},
            {value: "other", text: "Other"},
            {value: "msOfficeInstallUninstallActivateLicense", text: "MS Office install/uninstall/activate license"},
            {value: "licenseIssue", text: "License Issue"},
            {value: "connectivity", text: "Connectivity"},
            {value: "hardware", text: "Hardware"}
        ],
        benefitsCalGrSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "hardware", text: "Hardware"},
            {value: "software", text: "Software"}
        ],
        camsSupport: [
            {value: "applicationProblem", text: "Application Problem"},
            {value: "connectionIssue", text: "Connection Issue"},
            {value: "installation", text: "Installation"},
            {value: "profileIssue", text: "Profile Issue"}
        ],
        ebtEquipment: [
            {value: "ebtPrinter", text: "EBT Printer"},
            {value: "bioDevice", text: "BIO Device"},
            {value: "pinSelectDevice", text: "PIN Select Device"}
        ],
        crcSupport: [
            {value: "connectivity", text: "Connectivity"},
            {value: "hardware", text: "Hardware"},
            {value: "software", text: "Software"}
        ],
        medsSupport: [
            {value: "applicationProblem", text: "Application Problem"},
            {value: "connectionIssue", text: "Connection Issue"}
        ],
        mobileVehicleUnit: [
            {value: "applicationIssue", text: "Application Issue"}
        ],
        mpsPrinterSupport: [
            {value: "printerIssue", text: "Printer Issue"}
        ],
        software: [
            {value: "standardSoftware", text: "Standard Software"}
        ],
        warranty: [
            {value: "pc", text: "PC"},
            {value: "otherNonStandard", text: "Other Non Standard"},
            {value: "printer", text: "Printer"},
            {value: "scanner", text: "Scanner"}
        ],
        windowsSupport: [
            {value: "browserApp", text: "Browser App"},
            {value: "windowsUpdate", text: "Windows update"},
            {value: "imageRelated", text: "Image Related"},
            {value: "internet", text: "Internet"},
            {value: "loginRelated", text: "Login Related"},
            {value: "osRelated", text: "OS related"},
            {value: "security", text: "Security"}
        ],
        piaSupport: [
            {value: "piaConnectivity", text: "Connectivity"},
            {value: "piaService", text: "Service"}
        ],
        projectRollout: [
            {value: "cellularPhone", text: "Cellular Phone"},
            {value: "laptop", text: "Laptop"},
            {value: "monitor", text: "Monitor"},
            {value: "pc", text: "PC"},
            {value: "printer", text: "Printer"},
            {value: "tabletIpad", text: "Tablet/iPad"}
        ],
        projectUpgrade: [
            {value: "encryption", text: "Encryption"},
            {value: "hardware", text: "Hardware"},
            {value: "msOffice", text: "MS Office"},
            {value: "otherApplication", text: "Other Application"},
            {value: "windows11", text: "Windows 11"},
            {value: "windowsOS", text: "Windows OS"}
        ],
        projectorSupport: [
            {value: "projector", text: "Projector"}
        ],
        scannerSupport: [
            {value: "scanner", text: "Scanner"}
        ],
        equipmentPickupRequest: [
            {value: "pickUp", text: "Pick up"}
        ],
        assetScanner: [
            {value: "socketSymbolScanner", text: "Socket Symbol Scanner"}
        ]
    },
    technicalSupportAdmin: {
        outage: [
            {value: "networkOutage", text: "Network Outage"},
            {value: "nonStandardOutage", text: "Non Standard Outage"},
            {value: "phoneOutage", text: "Phone Outage"},
            {value: "powerOutage", text: "Power Outage"}
        ]
    },
    hardwareTechnicalSupport: {
        workstationHardware: [
            {value: "installationMove", text: "Installation/Move"},
            {value: "pc", text: "PC"},
            {value: "accessoryPeripheral", text: "Accessory/Peripheral"},
            {value: "monitor", text: "Monitor"},
            {value: "nonMpsPrinter", text: "Non MPS Printer"}
        ],
        ergonomicEquipment: [
            {value: "itRelatedEquipment", text: "IT related Equipment"}
        ]
    },
    hardwareInfrastructureManagement: {
        enterpriseStorage: [
            {value: "replaceHardDrives", text: "Replace hard drives"}
        ],
        lobbyQueueMonitor: [
            {value: "hardwareProblem", text: "Hardware Problem"}
        ],
        electronicBulletinBoard: [
            {value: "electronicBulletinBoardMalfunction", text: "Electronic bulletin board malfunction"}
        ],
        wanLanSupport: [
            {value: "wanLanHardware", text: "Hardware"}
        ],
        wifiSupport: [
            {value: "wifiHardware", text: "Hardware"}
        ]
    },
    mediaServicesSupport: {
        avidSystemSupport: [
            {value: "responseTimeBackupRestoreNetworkIssues", text: "Response time/Back up/Restore/Network issues"}
        ]
    },
    vtcSupport: {
        videoConferencing: [
            {value: "connectivityIssue", text: "Connectivity Issue"},
            {value: "equipmentMalfunction", text: "Equipment Malfunction"},
            {value: "audioVideoQuality", text: "Audio/Video Quality Issues"}
        ]
    },
    webexSupport: {
        webexService: [
            {value: "meetingIssues", text: "Meeting Issues"},
            {value: "accessProblems", text: "Access Problems"},
            {value: "audioVideoProblems", text: "Audio/Video Problems"},
            {value: "screenSharingIssues", text: "Screen Sharing Issues"}
        ],
        clientDesktopInstallation: [
            {value: "webexClientInstallOnPc", text: "WebEx client install on PC. Laptop and projector installation for Webex sessions."}
        ],
        configurationSupport: [
            {value: "profileConfigurationAndAddOns", text: "Profile configuration and add ons issues"}
        ],
        connectivity: [
            {value: "poorConnectionToConference", text: "Poor connection to conference"}
        ],
        newAccount: [
            {value: "newUserAccountProfileRequest", text: "New user account profile request"}
        ]
    }
};

export const subSubcategories = {
    activeDirectory: [
        {value: "terminateDisable", text: "Terminate Access/Disable Account"},
        {value: "removeHostname", text: "Remove hostname from domain"},
        {value: "passwordReset", text: "Password Reset"},
        {value: "newUserContractor", text: "New users or contractors, group changes, group policy"},
        {value: "correctProfile", text: "Correct user profile information - email"}
    ],
    fileShares: [
        {value: "mappingPermissions", text: "Mapping or permissions"}
    ],
    nameChange: [
        {value: "modification", text: "Modification"}
    ],
    distributionGroup: [
        {value: "newDistributionGroupOrChangeMember", text: "New distribution group or change of members"}
    ],
    encryption: [
        {value: "emailEncryption", text: "Email encryption"}
    ],
    msOutlook: [
        {value: "userNotAbleToLogIn", text: "User not able to log in"},
        {value: "unableToOpenEmailMessages", text: "Unable to open email messages"},
        {value: "softwareIssues", text: "Software issues"},
        {value: "requestStoppingMailDeliveryToClutterFolder", text: "Request stopping mail delivery to Clutter folder"},
        {value: "office365LicenseVerificationIssue", text: "Office 365 License Verification Issue"},
        {value: "notReceivingEmails", text: "Not receiving emails"},
        {value: "messageStoreReachedMaximumLimit", text: "Message store reached maximum limit"},
        {value: "encryptedEmailIssue", text: "Encrypted email issue"},
        {value: "emailProfileSetup", text: "Email profile setup"},
        {value: "emailBlockedFromSendingAttachments", text: "Email blocked from sending attachments"}
    ],
    oneDrive: [
        {value: "setupSharingOfFilesSyncIssues", text: "Setup, sharing of files, sync issues"}
    ],
    sharePoint: [
        {value: "setupSharingOfFilesSyncIssues", text: "Setup, sharing of files, sync issues"}
    ],
    permissionLevelChange: [
        {value: "level2EmailAccess", text: "Level 2 email access"},
        {value: "level1", text: "Level 1"},
        {value: "sharedMailboxes", text: "Shared mailboxes, etc."}
    ],
    phishing: [
        {value: "phishingEmail", text: "Phishing email"}
    ],
    fileTransfers: [
        {value: "mftFtpEtc", text: "MFT, FTP, etc"}
    ],
    backup: [
        {value: "restoreFilesFromBackup", text: "Restore files from backup"}
    ],
    assetMove: [
        {value: "requestAssetMoveToNewSite", text: "Request asset, move to new site"}
    ],
    sharedMailbox: [
        {value: "newModificationsChanges", text: "New, modifications, changes"}
    ],
    calabrio: [
        {value: "recordingIssues", text: "Recording issues"},
        {value: "newUserProfileRequest", text: "New user profile request"},
        {value: "newGroupProfileRequestForUnit", text: "New group profile request for unit"},
        {value: "logInProfileIssues", text: "Log in/Profile issues"}
    ],
    connectivity: [
    ],
    accessIssueAppstream: [
        {value: "accessIssueAppstreamSpecific", text: "Access Issue"}
    ],
    personalWiFiProblem: [
        {value: "personalWiFiProblemSpecific", text: "Personal Wi-Fi Problem"}
    ],
    profilePasswordRelated: [
        {value: "profilePasswordRelatedSpecific", text: "Profile / Password Related"}
    ],
    systemIssue: [
        {value: "systemIssueSpecific", text: "System Issue"}
    ],
    userTrainingIssue: [
        {value: "userTrainingIssueSpecific", text: "User Training Issue"}
    ],
    awsCallCenter: [
        {value: "awsCallCenterOther", text: "Other"},
        {value: "itd", text: "ITD"},
        {value: "gtr", text: "GTR"},
        {value: "fraudHotline", text: "Fraud Hotline"},
        {value: "catt", text: "CATT"}
    ],
    calSAWSCallCenterApplications: [
        {value: "wallboardSupport", text: "Wallboard Support"},
        {value: "reportingIssue", text: "Reporting Issue"},
        {value: "calSAWSOther", text: "Other"},
        {value: "eCCP", text: "eCCP"},
        {value: "calabrioCallCenter", text: "Calabrio"},
        {value: "accountUpdate", text: "Account Update"}
    ],
    ciscoFinesse: [
        {value: "ciscoFinesseOther", text: "Other"},
        {value: "finesseApplicationSupport", text: "Finesse Application Support"},
        {value: "cuicSupport", text: "CUIC Support"},
        {value: "ciscoFinesseCalabrio", text: "Calabrio"}
    ],
    connectivityCSC: [
        {value: "unableToConnectToWiFi", text: "Unable to connect to Wi-Fi"},
        {value: "unableToConnectToWebsite", text: "Unable to connect to website"},
        {value: "singleUserUnableToConnectToNetwork", text: "Single user unable to connect to network"},
        {value: "sectionOrFloorUnableToConnectToNetwork", text: "Section or floor unable to connect to network"},
        {value: "provideWiFiAccessToNewUser", text: "Provide Wi-Fi access to new user"},
        {value: "provideWiFiAccessToBuildingOrFloor", text: "Provide Wi-Fi access to building or floor"},
        {value: "provideTemporaryLoanerSwitch", text: "Provide temporary/Loaner switch"},
        {value: "provideNewVLANSUBNETS", text: "Provide new VLAN/SUBNETS"},
        {value: "provideAdditionalNetworkPortsConnections", text: "Provide additional network ports/Connections"},
        {value: "newDataJackRequest", text: "New data jack request"},
        {value: "networkSwitchDownUnscheduled", text: "Network switch down - Unscheduled"},
        {value: "networkSwitchDownScheduledMaintenance", text: "Network switch down - Scheduled maintenance"},
        {value: "networkResponsePingTimesAreSlow", text: "Network response/Ping times are slow"},
        {value: "entireOfficeUnableToConnectToNetwork", text: "Entire office unable to connect to network"},
        {value: "defectiveDataJack", text: "Defective data jack"}
    ],
    ihssCallCenter: [
        {value: "ihssWallboardSupport", text: "Wallboard Support"},
        {value: "ihssOther", text: "Other"},
        {value: "eMITE", text: "eMITE"},
        {value: "ihssCalabrio", text: "Calabrio"},
        {value: "ihssAWS", text: "AWS"}
    ],
    powerOutage: [
        {value: "unscheduledPowerOutage", text: "Unscheduled power outage"},
        {value: "scheduledPowerOutage", text: "Scheduled power outage"}
    ],
    voipCSC: [
        {value: "voicemailNotWorking", text: "Voicemail not working"},
        {value: "phoneNotWorking", text: "Phone not working"},
        {value: "noDialTone", text: "No dial tone"},
        {value: "niceRecordingNotWorking", text: "NICE recording not working"},
        {value: "ivrNotWorking", text: "IVR not working"},
        {value: "droppedCalls", text: "Dropped calls"},
        {value: "cuicReportingIssue", text: "CUIC reporting issue"},
        {value: "cantReceiveInbound", text: "Can't receive inbound"},
        {value: "cantCallOutbound", text: "Can't call outbound"},
        {value: "callCenterDown", text: "Call center down"}
    ],
    portableEquipment: [
        {value: "wifiNetworkAdaptorBroadbandConnectionIssue", text: "Wi-Fi/Network adaptor/Broadband connection issue"},
        {value: "setupPreparationUpdateDeviceFirmwareAppIOS", text: "Setup/Preparation/Update device firmware/App/iOS"},
        {value: "setupDefaultPrinter", text: "Set up default printer"},
        {value: "returnPickupPortableEquipment", text: "Return/Pickup portable equipment"},
        {value: "requestPrepareLaptopForRemoteUseTeleworking", text: "Request to prepare laptop for remote use/teleworking"},
        {value: "problemsNonStandardIssueWithDevice", text: "Problems/Non-standard issue with device"},
        {value: "noVideoOnDockingStation", text: "No video on docking station"},
        {value: "newRequest", text: "New request"},
        {value: "lostOrStolen", text: "Lost or stolen"},
        {value: "loanerRequest", text: "Loaner request"},
        {value: "lenovoDockingStationLANConnectivityIssues", text: "Lenovo docking station LAN connectivity issues"},
        {value: "lapTopAndProjectorSetUp", text: "Lap top and projector set up"},
        {value: "deactivateRetireDataWipeDevice", text: "Deactivate/Retire/Data wipe device"},
        {value: "addDeviceMACToWirelessAccessPoint", text: "Add device's MAC to wireless access point"}
    ],
    applicationIssue: [
        {value: "install", text: "Install"},
        {value: "troubleshooting", text: "Troubleshooting"},
        {value: "configuration", text: "Configuration"},
        {value: "removal", text: "Removal"}
    ],
    connectivityIssue: [
        {value: "unableToConnect", text: "Unable to connect"},
        {value: "webApplicationIsOffline", text: "Web application is offline"}
    ],
    profileIssue: [
        {value: "newRequest", text: "New Request"},
        {value: "password", text: "Password"},
        {value: "accessModification", text: "Access Modification"}
    ],
    // EDMS-specific subcategories
    systemIssue: [
        {value: "zonalDpiError", text: "Zonal DPI error"},
        {value: "recognitionServerIssue", text: "Recognition server issue"},
        {value: "queueBatchStuckInRecognitionServer", text: "Queue - Batch stuck in recognition server"},
        {value: "queueBatchStuckInPdfGenerator", text: "Queue - Batch stuck in PDF generator"},
        {value: "qualityControlError", text: "Quality control error"},
        {value: "licenseError", text: "License error"},
        {value: "kofaxValidationScriptError", text: "Kofax validation script error"},
        {value: "kofaxSlow", text: "Kofax slow"},
        {value: "kofaxNotResponding", text: "Kofax not responding"},
        {value: "javaError", text: "Java error"},
        {value: "dvrD2Slow", text: "DVR/D2 slow"},
        {value: "dvrD2Down", text: "DVR /D2 down"},
        {value: "documentsNotViewableInDocumentum", text: "Documents are not able to be viewed in documentum via LRS workstation"},
        {value: "d2LoginError", text: "D2 login error"},
        {value: "cannotViewDocumentsInDvrD2", text: "Cannot view documents in DVR/D2"},
        {value: "batchWillNotExport", text: "Batch will not export"}
    ],
    scannerIssue: [
        {value: "workstationDoesNotDetectScanner", text: "Workstation does not detect scanner"},
        {value: "scannerMaintenanceRollerReplacement", text: "Scanner maintenance - roller replacement"},
        {value: "configureScannerSettings", text: "Configure scanner settings"}
    ],
    accessIssue: [
        {value: "modifyUserPermissionsDvrD2", text: "Modify user permissions DVR/D2"},
        {value: "addRemoveBatchClass", text: "Add/Remove batch class"},
        {value: "accessAddUserToDvrD2", text: "Access - Add user to DVR/D2"},
        {value: "accessAddUserToD2AsCorrectionUser", text: "Access - Add user to D2 as correction user"}
    ],
    // EBT Equipment subcategories
    ebtPrinter: [
        {value: "unableToConnect", text: "Unable to connect"},
        {value: "troubleshootRepairReplacement", text: "Troubleshoot/Repair/Replacement"},
        {value: "ribbonReplacementMaintenance", text: "Ribbon replacement/Maintenance"},
        {value: "powerIssue", text: "Power issue"},
        {value: "newRequest", text: "New request"},
        {value: "ebtPrinterNotPoweringOn", text: "EBT Printer not powering on"}
    ],
    // Mobile Vehicle Unit subcategories
    applicationIssue: [
        {value: "connectivity", text: "Connectivity"},
        {value: "lrsAccess", text: "LRS access"},
        {value: "install", text: "Install"},
        {value: "troubleshooting", text: "Troubleshooting"},
        {value: "configuration", text: "Configuration"},
        {value: "removal", text: "Removal"}
    ],
    // MPS Printer Support subcategories
    printerIssue: [
        {value: "userMappingRequested", text: "User mapping requested"},
        {value: "unableToConnect", text: "Unable to connect"},
        {value: "uiFrozenOnPrinter", text: "UI frozen on printer"},
        {value: "tonerCartridgeReplacement", text: "Toner Cartridge Replacement"},
        {value: "repairTroubleshooting", text: "Repair/Troubleshooting"},
        {value: "relocateRemove", text: "Relocate/Remove"},
        {value: "newRequest", text: "New request"},
        {value: "jamTrayProblem", text: "Jam/Tray problem"},
        {value: "drumCartridgeReplacement", text: "Drum Cartridge Replacement"},
        {value: "additionalSupplies", text: "Additional supplies"}
    ],
    // MPS Printer Support Supplies subcategories
    mpsPrinterSupplies: [
        {value: "wasteContainerFull", text: "Waste container full"},
        {value: "staplesOut", text: "Staples out"},
        {value: "requestingAdditionalToner", text: "Requesting additional toner"},
        {value: "promptedToReplaceDrum", text: "Prompted to replace drum"},
        {value: "outOfToner", text: "Out of toner"},
        {value: "drumFull", text: "Drum full"}
    ],
    // MPS Printer Support Training subcategories
    mpsPrinterTraining: [
        {value: "requestNewAdditionalTraining", text: "Request New/Additional Training"}
    ],
    // Standard Software subcategories
    standardSoftware: [
        {value: "unspecifiedIssueWithPdfDocuments", text: "Unspecified issue with PDF documents"},
        {value: "troubleshootRepairOther", text: "Troubleshoot/Repair/Other"},
        {value: "removalUninstall", text: "Removal/Uninstall"},
        {value: "newUpgradeRequest", text: "New/Upgrade request"},
        {value: "installationReinstallationActivationUpdates", text: "Installation/Reinstallation/Activation/Updates"},
        {value: "installNetworkPrinterDrivers", text: "Install network printer/drivers"},
        {value: "cannotPrintPdfDocuments", text: "Cannot print PDF documents"},
        {value: "cannotPrintExcelDocuments", text: "Cannot print Excel documents"},
        {value: "adobeFlashPlayerBlocked", text: "Adobe Flash Player blocked"}
    ],
    // Non Standard Software subcategories
    nonStandardSoftware: [
        {value: "unspecifiedError", text: "Unspecified error"},
        {value: "troubleshootRepair", text: "Troubleshoot/Repair"},
        {value: "removalUninstall", text: "Removal/Uninstall"},
        {value: "newUpgradeRequest", text: "New/Upgrade request"},
        {value: "installationReinstallationActivationUpdate", text: "Installation/Reinstallation/Activation/Update"}
    ],
    // Warranty PC subcategories
    pc: [
        {value: "testingUnit", text: "Testing Unit"},
        {value: "defectiveUnit", text: "Defective unit"},
        {value: "pcPowerRelatedIssue", text: "PC power related issue"},
        {value: "networkIconDisplayingNoNetworkConnection", text: "Network icon displaying: \"No network connection\""},
        {value: "interviewAreaWalkThru", text: "Interview Area Walk-Thru"},
        {value: "defectivePcReplacementTroubleshootingSetup", text: "Defective PC/Replacement/Troubleshooting/Setup"},
        {value: "audioRelatedIssue", text: "Audio related issue"}
    ],
    // Browser App subcategories
    browserApp: [
        {value: "webexAssistance", text: "WebEx assistance"},
        {value: "unableToViewEdmsImageInLrsViaAppstream", text: "Unable to view EDMS image in LRS via AppStream 2.0 (teleworking)"},
        {value: "singleSignOnProblemUnableToOpenApplication", text: "Single sign on problem/Unable to open application"},
        {value: "sabaAccessIssue", text: "SABA access issue"},
        {value: "receivingErrorCreatingUserProfileAtLrsLogin", text: "Receiving \"Error creating the user profile.\" at LRS login prompt"},
        {value: "office365Issue", text: "Office 365 issue"},
        {value: "myDpssAppPa1060DashboardNotDisplayingCurrentInfo", text: "My DPSS app PA-1060 dashboard not displaying current information"},
        {value: "lrsPerformanceSluggish", text: "LRS performance sluggish"},
        {value: "lrsAccessIssueViaDpssDesktopAppstream", text: "LRS access issue via DPSS Desktop/AppStream 2.0 (teleworking)"},
        {value: "issuesAccessingOutlookViaDpssDesktopOnAppstream", text: "Issues accessing Outlook via DPSS Desktop on AppStream (teleworking)"},
        {value: "issuesAccessingKnowBe4TrainingModulesWhileTeleworking", text: "Issues accessing KnowBe4 training modules while teleworking"},
        {value: "issueWithOfficeLocator", text: "Issue with Office Locator"},
        {value: "issuePullingFormFromDpssDocumentLibrary", text: "Issue pulling form from DPSS Document Library"},
        {value: "issueDpssDesktopViaAppstream", text: "Issue DPSS Desktop via AppStream 2.0 (teleworking)"},
        {value: "ibmEnterpriseTimekeeperAppSluggish", text: "IBM Enterprise Timekeeper app sluggish"},
        {value: "havingIssuesPrintingSabaCourseCustomCertificate", text: "Having issues printing SABA course certificate"},
        {value: "configurationSettingsIssue", text: "Configuration/Settings Issue"}
    ],
    // Windows update subcategories
    windowsUpdate: [
        {value: "installUpdates", text: "Install updates"}
    ],
    // Other Non Standard subcategories
    otherNonStandard: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    // Warranty Printer subcategories
    warrantyPrinter: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    // Warranty Scanner subcategories
    warrantyScanner: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    // Image Related subcategories
    imageRelated: [
        {value: "reinstallReimageWindowsOs", text: "Reinstall/Reimage Windows OS"},
        {value: "imageShownOnMonitorWronglyOriented", text: "Image shown on monitor wrongly oriented (portrait)"}
    ],
    // Internet subcategories
    internet: [
        {value: "requestToDownloadInstallGoogleChrome", text: "Request to download/install Google Chrome"},
        {value: "problemUsingWebApp", text: "Problem using web app"},
        {value: "connectivityProblem", text: "Connectivity problem"}
    ],
    // Login Related subcategories
    loginRelated: [
        {value: "skypeLoginIssue", text: "Skype login issue"},
        {value: "passwordUnlockReset", text: "Password Unlock/Reset"},
        {value: "lrsPasswordExpired", text: "LRS Password Expired"},
        {value: "cannotLoginToMyDpss", text: "Cannot login to My DPSS"}
    ],
    // OS related subcategories
    osRelated: [
        {value: "requestToSetupProfileOnNewWorkstation", text: "Request to setup profile on new workstation"},
        {value: "requestDocumentRetrievalRestoration", text: "Request document retrieval/restoration"},
        {value: "printerPropertiesPreferencesIssue", text: "Printer properties/preferences issue"},
        {value: "pdfDocumentsNotOpeningWithAdobeAcrobat", text: "PDF documents not opening with Adobe Acrobat"},
        {value: "osFrozenNotResponding", text: "OS frozen/not responding"},
        {value: "oneDriveRelatedIssues", text: "OneDrive related issue(s)"},
        {value: "oneDriveUninstallationReconfiguration", text: "OneDrive uninstallation/configuration"},
        {value: "noSoundFromSpeakersAndOrHeadphones", text: "No sound from speakers and/or headphones"},
        {value: "mouseKeyboardTrackingPerformanceStuttering", text: "Mouse/keyboard tracking performance stuttering"},
        {value: "integratedWebcamNotWorking", text: "Integrated webcam not working."},
        {value: "groupPolicyUpdatesNeeded", text: "Group Policy updates needed"},
        {value: "displaySettingsAdjustment", text: "Display settings adjustment"},
        {value: "configurationCorruptionOfFilesTroubleshooting", text: "Configuration/Corruption of Files/Troubleshooting"},
        {value: "cannotPrintToNetworkPrinter", text: "Cannot print to network printer"},
        {value: "bitlocker", text: "Bitlocker"},
        {value: "assistanceWithScreenResolution", text: "Assistance with screen resolution"}
    ],
    // Windows Support Security subcategories
    windowsSupportSecurity: [
        {value: "workstationTrustRelationshipIssue", text: "Workstation trust relationship issue"},
        {value: "teleworkingAuthenticationIssues", text: "Teleworking authentication issues"},
        {value: "skypeConnectionIssue", text: "Skype connection issue"},
        {value: "securityWarningOther", text: "Security warning/Other"},
        {value: "passwordReset", text: "Password Reset"},
        {value: "accountLockedOut", text: "Account locked out"}
    ],
    // Network Outage subcategories
    networkOutage: [
        {value: "lanWanDown", text: "LAN/WAN down"}
    ],
    // Non Standard Outage subcategories
    nonStandardOutage: [
        {value: "buildingEvacuation", text: "Building evacutaiton/Fire/Flood/Other emergency"}
    ],
    // Phone Outage subcategories
    phoneOutage: [
        {value: "phoneSystemDown", text: "Phone System down"}
    ],
    // Power Outage subcategories (under Technical Support Admin)
    powerOutage: [
        {value: "smallLocalizedPowerOutage", text: "Small localized power outage"},
        {value: "scheduledOrNonScheduledPowerOutage", text: "Scheduled or non scheduled power outage"}
    ],
    // Installation/Move subcategories
    installationMove: [
        {value: "newInstallationOrEquipmentRelocation", text: "New Installation or Equipment Relocation"},
        {value: "installStandardKeyboardMouse", text: "Install standard keyboard/mouse"},
        {value: "installErgonomicKeyboardMouse", text: "Install ergonomic keyboard/mouse"}
    ],
    // Hardware Problem subcategories
    hardwareProblem: [
        {value: "electronicBulletinBoardMalfunction", text: "Electronic bulletin board malfunction"}
    ],
    // Connectivity subcategories for YOSL
    connectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Telework Tracking System Application Issue subcategories
    teleworkApplicationIssue: [
        {value: "udemyTrainingAccess", text: "Udemy Training Access"},
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // Telework Tracking System Connectivity subcategories
    teleworkConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Salesforce IHSS Support Connectivity subcategories
    salesforceIhssConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Salesforce IHSS Support Application Issue subcategories
    salesforceIhssApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // POSS Support Connectivity subcategories
    possConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // POSS Support Application Issue subcategories
    possApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // PECS Support Connectivity subcategories
    pecsConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // PECS Support Application Issue subcategories
    pecsApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // PBCS Support Smart View Issue subcategories
    pbcsSmartViewIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // PBCS Support Application Issue subcategories
    pbcsApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // EPRS Support Application Issue subcategories
    eprsApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // EPRS Support Connectivity subcategories
    eprsConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // My Assets Assets Assignment subcategories
    myAssetsAssetsAssignment: [
        {value: "discrepancyWithCurrentAssetsAssignment", text: "Discrepancy with my current assets assignment"}
    ],
    // ORCAS Support Connectivity subcategories
    orcasConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // DPSS Portal Support Connectivity subcategories
    dpssPortalConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // DPSS Portal Support Content Issue subcategories
    dpssPortalContentIssue: [
        {value: "requestToModifyWebsiteContent", text: "Request to modify website content"}
    ],
    // DPSS Portal Support Website Problem subcategories
    dpssPortalWebsiteProblem: [
        {value: "linksDontWork", text: "Links don't work"}
    ],
    // CG4 Support Application Issue subcategories
    cg4ApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // CG4 Support Connectivity subcategories
    cg4Connectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Cherwell Support Application Issue subcategories
    cherwellApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // Cherwell Support Connectivity subcategories
    cherwellConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // D2 System Application Issue subcategories
    d2ApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // D2 System Connectivity subcategories
    d2Connectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Data Mining System Application Issue subcategories
    dataMiningSystemApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // Data Mining System Connectivity subcategories
    dataMiningSystemConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // YOSL Application Issue subcategories
    yoslApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // Work Assignment Support Connectivity subcategories
    workAssignmentConnectivity: [
        {value: "unableToConnectDown", text: "Unable to connect/Down"}
    ],
    // Work Assignment Support Application Issue subcategories
    workAssignmentApplicationIssue: [
        {value: "installTroubleshootConfigureRemoval", text: "Install/Troubleshoot/Configure/Removal"}
    ],
    // Security Surveillance Cameras sub-subcategories (under Infrastructure Management)
    sscConnectivity: [
        {value: "serverNotResponding", text: "Server not responding"}
    ],
    sscHardware: [
        {value: "cameraMalfunction", text: "Camera malfunction"}
    ],
    sscPowerOutage: [
        {value: "systemDown", text: "System down"}
    ],
    sscSoftware: [
        {value: "retrievingFootage", text: "Retrieving footage"},
        {value: "clientInstallation", text: "Client installation"}
    ],
    // PIA Support sub-subcategories (under Technical Support)
    piaConnectivity: [
        {value: "websiteNotLoadingIssue", text: "Website not loading issue"},
        {value: "requestToChangeToPiaVlan", text: "Request to change to PIA VLAN"},
        {value: "other", text: "Other"},
        {value: "networkConnectivityIssue", text: "Network connectivity issue"},
        {value: "piaNetworkRelatedIssue", text: "PIA network related issue"}
    ],
    piaHardware: [
        {value: "scannerIssue", text: "Scanner issue"},
        {value: "printerIssue", text: "Printer issue"},
        {value: "pcIssue", text: "PC Issue"},
        {value: "hardwareOther", text: "Hardware - other"},
        {value: "computerPeripheralsIssue", text: "Computer peripherals Issue"}
    ],
    piaSoftware: [
        {value: "webSecurityIssue", text: "Web Security issue"},
        {value: "other", text: "Other"},
        {value: "msOfficeInstallUninstallActivateLicense", text: "MS Office install, uninstall or activate license"},
        {value: "deepFreezeOrWinSelectIssue", text: "DeepFreeze or WinSelect issue"}
    ],
    piaService: [
        {value: "piaServiceRequest", text: "PIA service request - Add/Remove"}
    ],
    // e-Fax Support sub-subcategories (under Infrastructure Management)
    eFaxSoftware: [
        {value: "eFaxServiceRequest", text: "eFax service request - Add/Remove eFax number or e-mail recipients"},
        {value: "eFaxServiceRelatedIssue", text: "eFax Service related issue - Not receiving faxes, download issue, web page"}
    ],
    // CUIC Support sub-subcategories (under Infrastructure Management)
    cuic: [
        {value: "loginProfileIssues", text: "Log in/Profile issues"},
        {value: "errorMessage", text: "Error message"},
        {value: "dataIssue", text: "Data issue"},
        {value: "applicationUnableToLaunch", text: "Application unable to launch"}
    ],
    // NICE Application Support sub-subcategories (under Infrastructure Management)
    niceApplication: [
        {value: "newUserProfileRequest", text: "New user profile request"},
        {value: "newGroupProfileRequest", text: "New group profile request for unit"},
        {value: "loginProfileIssues", text: "Log in/Profile issues"}
    ],
    // CTIOS Support sub-subcategories (under Infrastructure Management)
    ctios: [
        {value: "systemWontOpen", text: "System won't open/full screen"},
        {value: "staticSound", text: "Static sound"},
        {value: "screenProblem", text: "Screen problem"},
        {value: "loginProfileIssues", text: "Log in/Profile issues"},
        {value: "lineCutOff", text: "Line cut off"},
        {value: "finesseIssues", text: "FINESSE ISSUES"},
        {value: "ciscoVirtualPhoneIssue", text: "Cisco virtual phone issue"},
        {value: "callStatusIssue", text: "Call status issue"},
        {value: "callMissingDropped", text: "Call missing/dropped"},
        {value: "callCantBeTransferred", text: "Call can't be transferred"},
        {value: "buttonsGreyedOut", text: "Buttons greyed out"}
    ],
    // Finesse Application Support sub-subcategories (under Infrastructure Management)
    tscHelpDeskFinesse: [
        {value: "technicalIssuesWithFinesseApplication", text: "Technical issues with Finesse application"}
    ],
    // Project Rollout sub-subcategories (under Technical Support)
    cellularPhone: [
        {value: "cellularPhoneRequestReplacement", text: "Cellular Phone Request/Replacement"}
    ],
    laptop: [
        {value: "laptopRequestReplacement", text: "Laptop Request/Replacement"}
    ],
    monitor: [
        {value: "monitorRequestReplacement", text: "Monitor Request/Replacement"}
    ],
    pc: [
        {value: "pcRequestReplacement", text: "PC Request/Replacement"}
    ],
    printer: [
        {value: "printerRequestReplacement", text: "Printer Request/Replacement"}
    ],
    tabletIpad: [
        {value: "tabletIpadRequestReplacement", text: "Tablet/iPad Request/Replacement"}
    ],
    // Project Upgrade sub-subcategories (under Technical Support)
    encryption: [
        {value: "encryptionUpgrade", text: "Encryption Upgrade"}
    ],
    hardware: [
        {value: "hardwareUpgrade", text: "Hardware Upgrade"}
    ],
    msOffice: [
        {value: "msOfficeUpgrade", text: "MS Office Upgrade"}
    ],
    otherApplication: [
        {value: "otherApplicationUpgrade", text: "Other Application Upgrade"}
    ],
    windows11: [
        {value: "softwareApplicationIssues", text: "Software / Application Issues"},
        {value: "otherIssues", text: "Other Issues"},
        {value: "osPerformanceIssues", text: "OS Performance Issues"},
        {value: "networkWiFiIssues", text: "Network / WiFi Issues"},
        {value: "hardwareIssues", text: "Hardware Issues"},
        {value: "dockAccessoriesIssues", text: "Dock / Accessories Issues"}
    ],
    windowsOS: [
        {value: "upgrade", text: "Upgrade"}
    ],
    // Projector Support sub-subcategories (under Technical Support)
    projector: [
        {value: "troubleshootDefectiveRepairSetup", text: "Troubleshoot/Defective/Repair/Set-up"},
        {value: "returnLostStolen", text: "Return/Lost/Stolen"},
        {value: "newRequestUpgradeInstallation", text: "New Request/Upgrade/Installation"}
    ],
    // Scanner Support sub-subcategories (under Technical Support)
    scanner: [
        {value: "troubleshootDefectiveRepair", text: "Troubleshoot/Defective/Repair"},
        {value: "returnLostStolen", text: "Return/Lost/Stolen"},
        {value: "replaceEndOfLifePanasonicRollers", text: "Replace end of life Panasonic rollers"},
        {value: "newRequestUpgradeInstallation", text: "New Request/Upgrade/Installation"}
    ],
    // Hardware Technical Support sub-subcategories
    accessoryPeripheral: [
        {value: "telephoneHeadsetIssues", text: "Telephone/headset issues"},
        {value: "keyboardMouseIssue", text: "Keyboard and/or mouse issue"},
        {value: "installDefectiveReturnRepairTroubleshootingSetup", text: "Install/Defective/Return/Repair/Troubleshooting/Setup"},
        {value: "cableManagement", text: "Cable Management"}
    ],
    monitor: [
        {value: "monitorCableIssue", text: "Monitor cable issue"},
        {value: "defectiveMonitorReplacementTroubleshootingSetup", text: "Defective Monitor/Replacement/Troubleshooting/Setup"}
    ],
    nonMpsPrinter: [
        {value: "troubleshootDefectiveRepairMaintenance", text: "Troubleshoot/Defective/Repair/Maintenance"},
        {value: "returnLostStolen", text: "Return/Lost/Stolen"},
        {value: "newRequestUpgradeInstallationSetup", text: "New Request/Upgrade/Installation/Setup"}
    ],
    itRelatedEquipment: [
        {value: "newRequest", text: "New request"},
        {value: "moveFixReplacementInstall", text: "Move/Fix/Replacement/Install"},
        {value: "installErgonomicKeyboardMouse", text: "Install ergonomic keyboard and/or mouse"}
    ],
    // Infrastructure Management Enterprise Storage Support sub-subcategories
    infraHardware: [
        {value: "replaceHardDrives", text: "Replace hard drives"}
    ],
    // Hardware Infrastructure Management sub-subcategories
    electronicBulletinBoardMalfunction: [
        {value: "hardwareRepair", text: "Hardware Repair"},
        {value: "displayIssues", text: "Display Issues"},
        {value: "connectivityProblems", text: "Connectivity Problems"}
    ],
    networkIssueRelatedToHardwareEquipment: [
        {value: "equipmentNotFunctioning", text: "Equipment not functioning"},
        {value: "hardwareFailure", text: "Hardware Failure"},
        {value: "connectivityIssues", text: "Connectivity Issues"}
    ],
    networkHardwareRelatedRequest: [
        {value: "addRemovePickupDelivery", text: "Add/Remove/Pick up/Delivery"},
        {value: "equipmentInstallation", text: "Equipment Installation"},
        {value: "hardwareConfiguration", text: "Hardware Configuration"}
    ],
    wanLanHardware: [
        {value: "networkIssueRelatedToHardwareEquipment", text: "Network issue related to hardware equipment - Equipment not functioning"},
        {value: "networkHardwareRelatedRequest", text: "Network hardware related request - Add/Remove/Pick up/Delivery"}
    ],
    wifiHardware: [
        {value: "wifiNetworkHardwareRelatedRequest", text: "Wi-Fi network hardware related request - Add/Remove/Pick up/Delivery"}
    ],
    wifiNetworkHardwareRelatedRequest: [
        {value: "addRemovePickupDelivery", text: "Wi-Fi network hardware related request - Add/Remove/Pick up/Delivery"},
        {value: "accessPointInstallation", text: "Access Point Installation"},
        {value: "networkHardwareSetup", text: "Network Hardware Setup"}
    ],
    // Electronic Bulletin Board Support sub-subcategories (under Infrastructure Management)
    connectivity: [
        {value: "poorNetworkResponsePanelsDown", text: "Poor network response/Panels down"}
    ],
    contentProblem: [
        {value: "contentNotDisplayingProperly", text: "Content not displaying properly/Black screen"}
    ],
    powerOutage: [
        {value: "systemDown", text: "System down"}
    ],
    softwareProblem: [
        {value: "magicInfoServerProblems", text: "Magic info/Server problems"}
    ],
    // Enterprise Storage Support sub-subcategories
    managementReport: [
        {value: "capacityPlanningDiskConsumption", text: "Capacity planning/Disk consumption report"}
    ],
    upgradeAddDiskSpace: [
        {value: "increaseNetworkStorageCapacity", text: "Increase network storage capacity"}
    ],
    // Key Card Access/Badge System sub-subcategories
    accessProblem: [
        {value: "badgeConfigurationIssue", text: "Badge configuration issue"}
    ],
    hardwareProblem: [
        {value: "hardwareRelatedIssue", text: "Hardware Related Issue"}
    ],
    // Server Support Hardware sub-subcategories
    hardware: [
        {value: "warmTemperature", text: "Warm Temperature"},
        {value: "failure", text: "Failure"}
    ],
    // Server Support IP addressing sub-subcategories
    ipAddressing: [
        {value: "requestOrReservationNewSubnets", text: "Request or reservation, new subnets"}
    ],
    // Server Support Power issues sub-subcategories
    powerIssues: [
        {value: "scheduledPowerOutages", text: "Scheduled power outages"}
    ],
    // Server Support VM sub-subcategories
    vm: [
        {value: "requestVirtualServer", text: "Request virtual server"}
    ],
    // Server Support VPN sub-subcategories (under Server Support)
    vpn: [
        {value: "setupProfileChanges", text: "Setup, profile changes"}
    ],
    // Software Security sub-subcategories
    security: [
        {value: "updatesOrPatchesCausingProblems", text: "Updates or patches causing problems"},
        {value: "securityAgentsMissingOrNotFunctioning", text: "Security agents missing or not functioning"},
        {value: "encryptionNotCompleteOrCausingErrors", text: "Encryption not complete or causing errors"}
    ],
    // Software Support Security sub-subcategories
    softwareSupportSecurity: [
        {value: "virusIssue", text: "Virus issue"},
        {value: "updatesOrPatchesCausingProblems", text: "Updates or patches causing problems"},
        {value: "securityAgentsMissingOrNotFunctioning", text: "Security agents missing or not functioning"},
        {value: "encryptionNotCompleteOrCausingErrors", text: "Encryption not complete or causing errors"}
    ],
    // McAfee Virus Shield sub-subcategories
    mcAfeeVirusShield: [
        {value: "virusSecurityWarning", text: "Virus security warning"},
        {value: "troubleshootRepairOther", text: "Troubleshoot/Repair/Other"},
        {value: "systemScan", text: "System scan"},
        {value: "installation", text: "Installation"},
        {value: "datFilesAreOutOfDate", text: "DAT files are out of date"}
    ],
    // SSLVPN Access Issue sub-subcategories
    sslvpnAccessIssue: [
        {value: "accessIssue", text: "Access Issue"}
    ],
    // SSLVPN Personal WiFi Problem sub-subcategories
    sslvpnPersonalWiFiProblem: [
        {value: "personalWiFiProblemNoSignalOrWeakSignal", text: "Personal WiFi Problem (No Signal or Weak Signal)"}
    ],
    // SSLVPN Profile/Password Related sub-subcategories
    sslvpnProfilePasswordRelated: [
        {value: "profilePasswordRelated", text: "Profile/Password Related"}
    ],
    // SSLVPN System Issue sub-subcategories
    sslvpnSystemIssue: [
        {value: "systemIssue", text: "System Issue"}
    ],
    // SSLVPN User Training Issue sub-subcategories
    sslvpnUserTrainingIssue: [
        {value: "userTrainingIssue", text: "User Training Issue"}
    ],
    // VoIP (Non-CSC) Support Hardware sub-subcategories
    voipNonCscHardware: [
        {value: "requestNewWallPhone", text: "Request new wall phone"},
        {value: "requestNewHeadset", text: "Request new headset"},
        {value: "requestNewDeskPhone", text: "Request new desk phone"},
        {value: "requestNewConferencePhone", text: "Request new conference phone"},
        {value: "brokenPhone", text: "Broken phone"}
    ],
    // VoIP (Non-CSC) Support Service sub-subcategories
    voipNonCscService: [
        {value: "voicemailNotWorking", text: "Voicemail not working"},
        {value: "voicemailIndicatorLightNotWorkingOrIncorrect", text: "Voicemail indicator light not working or incorrect"},
        {value: "unableToReceiveInboundCalls", text: "Unable to receive inbound calls"},
        {value: "unableToMakeOutboundCalls", text: "Unable to make outbound calls"},
        {value: "telephoneSystemDownForSpecificSectionOrFloor", text: "Telephone system down for specific section or floor"},
        {value: "telephoneSystemDownForEntireSite", text: "Telephone system down for entire site"},
        {value: "setupVoicemail", text: "Setup voicemail"},
        {value: "phoneNotWorking", text: "Phone not working"},
        {value: "noDialTone", text: "No dial tone"},
        {value: "callsBeingDropped", text: "Calls being dropped"},
        {value: "addExtensionToPhone", text: "Add extension to phone"}
    ],
    // VTC Support sub-subcategories
    vtcSupport: [
        {value: "troubleshootingSettingSystemRestore", text: "Troubleshooting/Setting System/Restore"},
        {value: "telephoneConferenceProblem", text: "Telephone conference problem"},
        {value: "setUpVtcTelephoneConference", text: "Set up VTC telephone conference"},
        {value: "requestIttsaPresenceDuringSession", text: "Request ITTSA presence during session"}
    ],
    // VTC subcategory
    vtc: [
        {value: "telephoneConferenceProblem", text: "Telephone conference problem"},
        {value: "setUpVtcTelephoneConference", text: "Set up VTC telephone conference"},
        {value: "requestIttsaPresenceDuringSession", text: "Request ITTSA presence during session"}
    ],
    // WAN/LAN Support Connectivity sub-subcategories
    wanLanConnectivity: [
        {value: "networkConnectionRequest", text: "Network connection request - Network drops Add/Remove"},
        {value: "networkConnectionIssues", text: "Network connection issues - Disconnected or slow performance"},
        {value: "ip169", text: "IP: 169.x.xx..xxx"},
        {value: "configurePortsForPiaYbn", text: "Configure ports for PIA/YBN use"}
    ],
    // WAN/LAN Support Maintenance sub-subcategories
    wanLanMaintenance: [
        {value: "networkRelatedMaintenance", text: "Network related maintenance - Software upgrades/Hardware replacement"}
    ],
    // WAN/LAN Support Power Issue sub-subcategories
    wanLanPowerIssue: [
        {value: "networkIssuePowerOutage", text: "Network issue related to power - Power outages"}
    ],
    // Warranty subcategories with sub-subcategories
    warrantyPc: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyPrinter: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyScanner: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyOtherNonStandard: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyIpad: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyLaptop: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    warrantyMonitor: [
        {value: "defectiveUnit", text: "Defective unit"}
    ],
    // Windows Support Security sub-subcategories
    windowsSupportSecurity: [
        {value: "workstationTrustRelationshipIssue", text: "Workstation trust relationship issue"},
        {value: "teleworkingAuthenticationIssues", text: "Teleworking authentication issues"},
        {value: "skypeConnectionIssue", text: "Skype connection issue"},
        {value: "securityWarningOther", text: "Security warning/Other"},
        {value: "passwordReset", text: "Password Reset"},
        {value: "accountLockedOut", text: "Account locked out"}
    ],
    // Windows Support Login Related sub-subcategories
    windowsSupportLoginRelated: [
        {value: "skypeLoginIssue", text: "Skype login issue"},
        {value: "passwordUnlockReset", text: "Password Unlock/Reset"},
        {value: "lrsPasswordExpired", text: "LRS Password Expired"},
        {value: "cannotLoginToMyDpss", text: "Cannot login to My DPSS"}
    ],
    // Windows Support Browser App sub-subcategories
    windowsSupportBrowserApp: [
        {value: "webexAssistance", text: "WebEx assistance"},
        {value: "unableToViewEdmsImageInLrsViaAppstream", text: "Unable to view EDMS image in LRS via AppStream 2.0 (teleworking)"},
        {value: "singleSignOnProblemUnableToOpenApplication", text: "Single sign on problem/Unable to open application"},
        {value: "sabaAccessIssue", text: "SABA access issue"},
        {value: "receivingErrorCreatingUserProfileAtLrsLoginPrompt", text: "Receiving \"Error creating the user profile.\" at LRS login prompt"},
        {value: "office365Issue", text: "Office 365 Issue"},
        {value: "myDpssAppPa1060DashboardNotDisplayingCurrentInformation", text: "My DPSS app PA-1060 dashboard not displaying current information"},
        {value: "lrsPerformanceSlugish", text: "LRS performance slugish"},
        {value: "lrsAccessIssueViaDpssDesktopAppstream", text: "LRS access issue via DPSS Desktop/AppStream 2.0 (teleworking)"},
        {value: "issuesAccessingOutlookViaDpssDesktopOnAppstream", text: "Issues accessing Outlook via DPSS Desktop on AppStream (teleworking)"},
        {value: "issuesAccessingKnowBe4TrainingModulesWhileTeleworking", text: "Issues accessing KnowBe4 training modules while teleworking"},
        {value: "issueWithOfficeLocator", text: "Issue with Office Locator"},
        {value: "issuePullingFormFromDpssDocumentLibrary", text: "Issue pulling form from DPSS Document Library"},
        {value: "issueDpssDesktopViaAppstream", text: "Issue DPSS Desktop via AppStream 2.0 (teleworking)"},
        {value: "ibmEnterpriseTimekeeperAppSluggish", text: "IBM Enterprise Timekeeper app sluggish"},
        {value: "havingIssuesPrintingSabaCouseCertificate", text: "Having issues printing SABA course certificate"},
        {value: "configurationSettingsIssue", text: "Configuration/Settings Issue"}
    ],
    // Windows Support Image Related sub-subcategories
    windowsSupportImageRelated: [
        {value: "reinstallReimageWindowsOs", text: "Reinstall/Reimage Windows OS"},
        {value: "imageShownOnMonitorWronglyOrientedPortrait", text: "Image shown on monitor wrongly oriented (portrait)"}
    ],
    // Windows Support Internet sub-subcategories
    windowsSupportInternet: [
        {value: "requestToDownloadInstallGoogleChrome", text: "Request to download/install Google Chrome"},
        {value: "problemUsingWebApp", text: "Problem using web app"},
        {value: "connectivityProblem", text: "Connectivity problem"}
    ],
    // CRC Support Connectivity sub-subcategories
    crcConnectivity: [
        {value: "websiteIssue", text: "Website Issue"},
        {value: "networkIssue", text: "Network Issue"},
        {value: "other", text: "Other"}
    ],
    // CRC Support Hardware sub-subcategories
    crcHardware: [
        {value: "scannerDoesNotTurnOn", text: "Scanner - does not turn on"},
        {value: "scannerDoesNotFeedPaper", text: "Scanner - does not feed paper"},
        {value: "printerPrintoutProblem", text: "Printer - printout problem, error message"},
        {value: "printerMaintenance", text: "Printer - Maintenance"},
        {value: "physicalDamageToPcScreen", text: "Physical damage to PC screen"},
        {value: "pcHardwareFailure", text: "PC Hardware failure"},
        {value: "monitorScreenDisplayProblem", text: "Monitor screen display problem"}
    ],
    // CRC Support Software sub-subcategories
    crcSoftware: [
        {value: "winSelectLicenseIssue", text: "WinSelect license issue"},
        {value: "websiteDoesNotLoadIssue", text: "Website does not load issue"},
        {value: "pcTroubleshootInstallUninstallLicense", text: "PC troubleshoot, install, uninstall, license"},
        {value: "pcBitlockerKeyIssue", text: "PC Bitlocker key issue"},
        {value: "deepFreezeLicenseIssue", text: "DeepFreeze license issue"}
    ],
    // MEDS Support Application Problem sub-subcategories
    medsApplicationProblem: [
        {value: "accessTroubleshootRepair", text: "Access/Troubleshoot/Repair"}
    ],
    // MEDS Support Connection Issue sub-subcategories
    medsConnectionIssue: [
        {value: "systemDown", text: "System down"}
    ],
    // EBT Equipment BIO Device sub-subcategories
    bioDevice: [
        {value: "troubleshootRepairReplacement", text: "Troubleshoot/Repair/Replacement"}
    ],
    // EBT Equipment PIN Select Device sub-subcategories
    pinSelectDevice: [
        {value: "troubleshootRepairReplacement", text: "Troubleshoot/Repair/Replacement"},
        {value: "pinSelectDeviceNotPrinting", text: "PIN Select Device not printing"}
    ],
    // BenefitsCal-GR Support Connectivity sub-subcategories
    benefitsCalGrConnectivity: [
        {value: "websiteIssue", text: "Website Issue"},
        {value: "other", text: "Other"},
        {value: "networkIssue", text: "Network issue"}
    ],
    // BenefitsCal-GR Support Hardware sub-subcategories
    benefitsCalGrHardware: [
        {value: "scannerDoesNotTurnOn", text: "Scanner - does not turn on"},
        {value: "scannerDoesNotFeedPaper", text: "Scanner - does not feed paper"},
        {value: "printerPrintoutProblemErrorMessage", text: "Printer - printout problem/error message"},
        {value: "printerMaintenance", text: "Printer - Maintenance"},
        {value: "physicalDamageToPcScreen", text: "Physical damage to PC screen"},
        {value: "pcHardwareFailure", text: "PC Hardware failure"},
        {value: "monitorScreenDisplayProblem", text: "Monitor screen display problem"}
    ],
    // BenefitsCal-GR Support Software sub-subcategories
    benefitsCalGrSoftware: [
        {value: "winSelectLicenseIssue", text: "WinSelect license issue"},
        {value: "websiteDoesNotLoadIssue", text: "Website does not load issue"},
        {value: "pcTroubleshootInstallUninstallLicense", text: "PC troubleshoot/install/uninstall/license"},
        {value: "pcBitlockerKeyIssue", text: "PC Bitlocker key issue"},
        {value: "deepFreezeLicenseIssue", text: "DeepFreeze license issue"}
    ],
    // CAMS Support Application Problem sub-subcategories
    camsApplicationProblem: [
        {value: "accessTroubleshootRepair", text: "Access/Troubleshoot/Repair"}
    ],
    // CAMS Support Connection Issue sub-subcategories
    camsConnectionIssue: [
        {value: "systemDown", text: "System down"}
    ],
    // CAMS Support Installation sub-subcategories
    camsInstallation: [
        {value: "newUserOrReinstallation", text: "New user or re-installation"}
    ],
    // CAMS Support Profile Issue sub-subcategories
    camsProfileIssue: [
        {value: "logInAccessRightsPasswordIssues", text: "Log in/Access rights/Password issues"}
    ],
    // Equipment Pickup Request Pick up sub-subcategories
    pickUp: [
        {value: "networkComputerRelatedEquipmentPickup", text: "Network and computer related equipment pickup"}
    ],
    // Asset Scanner Socket Symbol Scanner sub-subcategories
    socketSymbolScanner: [
        {value: "scanEquipmentToNewUser", text: "Scan equipment to new user"},
        {value: "returningOrLost", text: "Returning or lost"},
        {value: "newUpgradeRequest", text: "New/Upgrade request"},
        {value: "defective", text: "Defective"}
    ],
    // BenefitsCal Support Connectivity sub-subcategories
    benefitsCalConnectivity: [
        {value: "websiteNotLoadingIssue", text: "Website not loading issue"},
        {value: "requestToOpenOrBlockUrlSite", text: "Request to open or block URL site"},
        {value: "requestToChangeToPiaVlan", text: "Request to change PIA VLAN"},
        {value: "other", text: "Other"},
        {value: "networkConnectivityIssue", text: "Network connectivity issue"}
    ],
    // BenefitsCal Support Hardware sub-subcategories
    benefitsCalHardware: [
        {value: "scannerIssue", text: "Scanner issue"},
        {value: "printerIssue", text: "Printer Issue"},
        {value: "pcIssue", text: "PC Issue"},
        {value: "other", text: "Other"},
        {value: "monitorIssue", text: "Monitor issue"},
        {value: "computerPeripheralsIssue", text: "Computer peripherals issue"}
    ]
};

export const implementationTypes = {
    // Project Rollout implementation types
    cellularPhoneRequestReplacement: [
        {value: "newDevice", text: "New Device"},
        {value: "replacement", text: "Replacement"},
        {value: "upgrade", text: "Upgrade"}
    ],
    laptopRequestReplacement: [
        {value: "newDevice", text: "New Device"},
        {value: "replacement", text: "Replacement"},
        {value: "upgrade", text: "Upgrade"}
    ],
    monitorRequestReplacement: [
        {value: "newMonitor", text: "New Monitor"},
        {value: "replacement", text: "Replacement"},
        {value: "additionalMonitor", text: "Additional Monitor"}
    ],
    pcRequestReplacement: [
        {value: "newPC", text: "New PC"},
        {value: "replacement", text: "Replacement"},
        {value: "upgrade", text: "Upgrade"}
    ],
    printerRequestReplacement: [
        {value: "newPrinter", text: "New Printer"},
        {value: "replacement", text: "Replacement"},
        {value: "setup", text: "Setup"}
    ],
    tabletIpadRequestReplacement: [
        {value: "newTablet", text: "New Tablet"},
        {value: "replacement", text: "Replacement"},
        {value: "setup", text: "Setup"}
    ],
    // Project Upgrade implementation types
    msOfficeUpgrade: [
        {value: "office365", text: "Office 365"},
        {value: "office2021", text: "Office 2021"},
        {value: "licenseActivation", text: "License Activation"}
    ],
    // Projector Support implementation types
    troubleshootDefectiveRepairSetup: [
        {value: "troubleshooting", text: "Troubleshooting"},
        {value: "repair", text: "Repair"},
        {value: "setup", text: "Setup"},
        {value: "defectiveUnit", text: "Defective Unit"}
    ],
    newRequestUpgradeInstallation: [
        {value: "newRequest", text: "New Request"},
        {value: "upgrade", text: "Upgrade"},
        {value: "installation", text: "Installation"}
    ],
    // Scanner Support implementation types
    scanner: [
        {value: "defective", text: "Defective"},
        {value: "installation", text: "Installation"},
        {value: "lost", text: "Lost"},
        {value: "newRequest", text: "New Request"},
        {value: "repair", text: "Repair"},
        {value: "replaceEndOfLifePanasonicRollers", text: "Replace end of life Panasonic rollers"},
        {value: "return", text: "Return"},
        {value: "stolen", text: "Stolen"},
        {value: "troubleshoot", text: "Troubleshoot"},
        {value: "upgrade", text: "Upgrade"}
    ],
    // Infrastructure Management Enterprise Storage implementation types
    replaceHardDrives: [
        {value: "hardDriveReplacement", text: "Hard Drive Replacement"},
        {value: "dataRecovery", text: "Data Recovery"},
        {value: "storageUpgrade", text: "Storage Upgrade"}
    ],
    mftFtpEtc: [
        {value: "mftAccess", text: "MFT Access Request"}
    ],
    restoreFilesFromBackup: [
        {value: "restoreFileFolder", text: "Restore File"}
    ],
    returnPickupPortableEquipment: [
        {value: "mobilePickup", text: "Mobile Pick-up"}
    ],
    requestPrepareLaptopForRemoteUseTeleworking: [
        {value: "laptopReplacement", text: "Laptop Replacement"}
    ],
    terminateDisable: [
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"},
        {value: "sharedDriveAccess", text: "Shared Drive Access"},
        {value: "sharedDriveRemoval", text: "Remove Access to Share Drive"}
    ],
    removeHostname: [
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"},
        {value: "sharedDriveAccess", text: "Shared Drive Access"},
        {value: "sharedDriveRemoval", text: "Remove Access to Share Drive"}
    ],
    passwordReset: [
        {value: "basicPasswordReset", text: "Basic Password Reset"},
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"}
    ],
    newUserContractor: [
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"},
        {value: "sharedDriveAccess", text: "Shared Drive Access"},
        {value: "sharedDriveRemoval", text: "Remove Access to Share Drive"}
    ],
    correctProfile: [
        {value: "basicProfileCorrection", text: "Basic Profile Correction"},
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"}
    ],
    mappingPermissions: [
        {value: "sharedDriveAccess", text: "Shared Drive Access"},
        {value: "sharedFolderAccess", text: "Shared Folder Access"},
        {value: "sharedDriveRemoval", text: "Remove Access to Share Drive"},
        {value: "securityGroupAccess", text: "Request for Inclusion in Security Group"},
        {value: "securityGroupRemoval", text: "Request to Remove from Security Group"}
    ],
    modification: [
        {value: "nameChangeRequest", text: "Name Change Request"}
    ],
    newDistributionGroupOrChangeMember: [
        {value: "distributionGroupAccess", text: "Distribution Group Access"},
        {value: "distributionGroupRemoveAccess", text: "Distribution Group Remove Access"}
    ],
    wifiConnectionRequest: [
        {value: "gmaf3101fAccess", text: "GMAF3101F Access"}
    ],
    addDeviceMACToWirelessAccessPoint: [
        {value: "gmaf3101fAccess", text: "GMAF3101F Access"}
    ],
    provideWiFiAccessToNewUser: [
        {value: "gmaf3101fAccess", text: "GMAF3101F Access"}
    ],
    newModificationsChanges: [
        {value: "sharedCalendarAccess", text: "Shared Calendar Access"},
        {value: "sharedMailboxAccess", text: "Shared Mailbox Access"},
        {value: "removeAccessFromSharedMailbox", text: "Remove Access from Shared Mailbox"},
        {value: "removeAccessFromCalendarAccess", text: "Remove Access from Shared Calendar"}
    ],
    // Project Rollout implementation types
    cellularPhone: [
        {value: "cellularPhoneRequestReplacement", text: "Cellular Phone Request/Replacement"}
    ],
    // Project Upgrade implementation types  
    msOffice: [
        {value: "msOfficeUpgrade", text: "MS Office Upgrade"}
    ]
};

// Name mappings for display
export const categoryNames = {
    "infrastructureManagement": "Infrastructure Management",
    "technicalSupport": "Technical Support",
    "applicationSystemSupport": "Application/System Support",
    "hardwareTechnicalSupport": "Hardware - Technical Support",
    "hardwareInfrastructureManagement": "Hardware - Infrastructure Management",
    "technicalSupportAdmin": "Technical Support Admin",
    "ctiosSupport": "CTIOS Support",
    "cuicSupport": "CUIC Support",
    "eFaxSupport": "e-Fax Support",
    "niceApplicationSupport": "NICE Application Support",
    "piaSupport": "PIA Support",
    "securitySurveillanceCameras": "Security Surveillance Cameras",
    "finesseApplicationSupport": "Finesse Application Support",
    "mediaServicesSupport": "Media Services Support",
    "vtcSupport": "VTC Support",
    "webexSupport": "WebEx Support"
};

export const subcategoryNames = {
    "activeDirectory": "Active Directory",
    "fileShares": "File Shares",
    "backup": "Backup",
    "assetMove": "Asset Move",
    "distributionGroup": "Distribution Group",
    "sharedMailbox": "Shared Mailbox",
    "encryption": "Encryption",
    "nameChange": "Name Change",
    "msOutlook": "MS Outlook",
    "oneDrive": "OneDrive",
    "permissionLevelChange": "Permission Level Change",
    "phishing": "Phishing",
    "sharePoint": "SharePoint",
    "calabrio": "Calabrio",
    "accessIssueAppstream": "Access Issue",
    "personalWiFiProblem": "Personal Wi-Fi Problem (No Signal or Weak Signal)",
    "profilePasswordRelated": "Profile / Password Related",
    "systemIssue": "System Issue",
    "userTrainingIssue": "User Training Issue",
    "connectivity": "Connectivity",
    "awsCallCenter": "AWS Call Center",
    "calSAWSCallCenterApplications": "CalSAWS Call Center Applications",
    "ciscoFinesse": "CISCO / Finesse",
    "connectivityCSC": "Connectivity",
    "ihssCallCenter": "IHSS Call Center",
    "powerOutage": "Power Outage",
    "voipCSC": "VOIP",
    "wifiConnectionRequest": "Wi-Fi connection request - Add/Remove wifi device or Wi-Fi user",
    "wifiConnectionIssues": "Wi-Fi connection issues - Disconnected or slow performance",
    "zscalerAccessIssue": "Access Issue",
    "zscalerPersonalWiFiProblem": "Personal WiFi Problem (No Signal or Weak Signal)",
    "zscalerProfilePasswordRelated": "Profile/Password Related",
    "zscalerSystemIssue": "System Issue",
    "zscalerUserTrainingIssue": "User Training Issue",
    "portableEquipment": "Portable Equipment",
    "fileTransfers": "File Transfers",
    "backup": "Backup",
    "applicationIssue": "Application Issue",
    "connectivityIssue": "Connectivity Issue",
    "profileIssue": "Profile Issue",
    "vpnSupport": "VPN Support",
    "vpnSetup": "Setup",
    "vpnProfileChanges": "Profile changes",
    "ebtEquipment": "EBT Equipment",
    "ebtPrinter": "EBT Printer",
    "mobileVehicleUnit": "Mobile Vehicle Unit",
    "mpsPrinterSupport": "MPS Printer Support",
    "printerIssue": "Printer Issue",
    "software": "Software",
    "standardSoftware": "Standard Software",
    "warranty": "Warranty",
    "pc": "PC",
    "browserApp": "Browser App",
    "pecsSupport": "PECS Support",
    "otherApplication": "Other Application",
    "salesforceCscSupport": "Salesforce CSC Support",
    "salesforceIhssSupport": "Salesforce IHSS Support",
    "possSupport": "POSS Support",
    "myAssets": "My Assets",
    "orcasSupport": "ORCAS Support",
    "dpssPortalSupport": "DPSS Portal Support",
    "outage": "Outage",
    "networkOutage": "Network Outage",
    "installationMove": "Installation/Move",
    "hardwareProblem": "Hardware Problem",
    "connectivity": "Connectivity",
    "edmsSupport": "EDMS Support",
    "systemIssue": "System Issue",
    "scannerIssue": "Scanner Issue",
    "accessIssue": "Access Issue",
    "electronicBulletinBoardSupport": "Electronic Bulletin Board Support",
    "contentProblem": "Content Problem",
    "softwareProblem": "Software Problem",
    "managementReport": "Management Report",
    "upgradeAddDiskSpace": "Upgrade/Add Disk Space",
    "accessProblem": "Access Problem",
    "hardwareProblem": "Hardware Problem",
    "hardware": "Hardware",
    "ipAddressing": "IP addressing",
    "powerIssues": "Power issues",
    "vm": "VM",
    "vpn": "VPN",
    "software": "Software",
    "softwareSupport": "Software Support",
    "sslvpn": "SSLVPN",
    "security": "Security",
    "mcAfeeVirusShield": "McAfee Virus Shield",
    "sslvpnAccessIssue": "Access Issue",
    "sslvpnPersonalWiFiProblem": "Personal WiFi Problem (No Signal or Weak Signal)",
    "sslvpnProfilePasswordRelated": "Profile/Password Related",
    "sslvpnSystemIssue": "System Issue",
    "sslvpnUserTrainingIssue": "User Training Issue",
    "voipNonCscSupport": "VoIP (Non-CSC) Support",
    "voipNonCscHardware": "Hardware",
    "voipNonCscService": "Service",
    "vtcSupport": "VTC Support",
    "wanLanSupport": "WAN/LAN Support",
    "wanLanConnectivity": "Connectivity",
    "wanLanMaintenance": "Maintenance",
    "windowsUpdate": "Windows update",
    "nonStandardOutage": "Non Standard Outage",
    "phoneOutage": "Phone Outage"
};

export const subSubcategoryNames = {
    "terminateDisable": "Terminate Access/Disable Account",
    "removeHostname": "Remove hostname from domain",
    "passwordReset": "Password Reset",
    "newUserContractor": "New users or contractors, group changes, group policy",
    "correctProfile": "Correct user profile information - email",
    "mappingPermissions": "Mapping or permissions",
    "modification": "Modification",
    "newDistributionGroupOrChangeMember": "New distribution group or change of members",
    "emailEncryption": "Email encryption",
    "userNotAbleToLogIn": "User not able to log in",
    "unableToOpenEmailMessages": "Unable to open email messages",
    "softwareIssues": "Software issues",
    "requestStoppingMailDeliveryToClutterFolder": "Request stopping mail delivery to Clutter folder",
    "office365LicenseVerificationIssue": "Office 365 License Verification Issue",
    "notReceivingEmails": "Not receiving emails",
    "messageStoreReachedMaximumLimit": "Message store reached maximum limit",
    "encryptedEmailIssue": "Encrypted email issue",
    "emailProfileSetup": "Email profile setup",
    "emailBlockedFromSendingAttachments": "Email blocked from sending attachments",
    "setupSharingOfFilesSyncIssues": "Setup, sharing of files, sync issues",
    "level2EmailAccess": "Level 2 email access",
    "level1": "Level 1",
    "sharedMailboxes": "Shared mailboxes, etc.",
    "phishingEmail": "Phishing email",
    "newModificationsChanges": "New, modifications, changes",
    "recordingIssues": "Recording issues",
    "newUserProfileRequest": "New user profile request",
    "newGroupProfileRequestForUnit": "New group profile request for unit",
    "logInProfileIssues": "Log in/Profile issues",
    "accessIssueAppstreamSpecific": "Access Issue",
    "personalWiFiProblemSpecific": "Personal Wi-Fi Problem",
    "profilePasswordRelatedSpecific": "Profile / Password Related",
    "systemIssueSpecific": "System Issue",
    "userTrainingIssueSpecific": "User Training Issue",
    "awsCallCenterOther": "Other",
    "itd": "ITD",
    "gtr": "GTR",
    "fraudHotline": "Fraud Hotline",
    "catt": "CATT",
    "wallboardSupport": "Wallboard Support",
    "reportingIssue": "Reporting Issue",
    "calSAWSOther": "Other",
    "eCCP": "eCCP",
    "calabrioCallCenter": "Calabrio",
    "accountUpdate": "Account Update",
    "ciscoFinesseOther": "Other",
    "finesseApplicationSupport": "Finesse Application Support",
    "cuicSupport": "CUIC Support",
    "ciscoFinesseCalabrio": "Calabrio",
    "unableToConnectToWiFi": "Unable to connect to Wi-Fi",
    "unableToConnectToWebsite": "Unable to connect to website",
    "singleUserUnableToConnectToNetwork": "Single user unable to connect to network",
    "sectionOrFloorUnableToConnectToNetwork": "Section or floor unable to connect to network",
    "provideWiFiAccessToNewUser": "Provide Wi-Fi access to new user",
    "provideWiFiAccessToBuildingOrFloor": "Provide Wi-Fi access to building or floor",
    "provideTemporaryLoanerSwitch": "Provide temporary/Loaner switch",
    "provideNewVLANSUBNETS": "Provide new VLAN/SUBNETS",
    "provideAdditionalNetworkPortsConnections": "Provide additional network ports/Connections",
    "newDataJackRequest": "New data jack request",
    "networkSwitchDownUnscheduled": "Network switch down - Unscheduled",
    "networkSwitchDownScheduledMaintenance": "Network switch down - Scheduled maintenance",
    "networkResponsePingTimesAreSlow": "Network response/Ping times are slow",
    "entireOfficeUnableToConnectToNetwork": "Entire office unable to connect to network",
    "defectiveDataJack": "Defective data jack",
    "ihssWallboardSupport": "Wallboard Support",
    "ihssOther": "Other",
    "eMITE": "eMITE",
    "ihssCalabrio": "Calabrio",
    "ihssAWS": "AWS",
    "unscheduledPowerOutage": "Unscheduled power outage",
    "scheduledPowerOutage": "Scheduled power outage",
    "voicemailNotWorking": "Voicemail not working",
    "phoneNotWorking": "Phone not working",
    "noDialTone": "No dial tone",
    "niceRecordingNotWorking": "NICE recording not working",
    "ivrNotWorking": "IVR not working",
    "droppedCalls": "Dropped calls",
    "cuicReportingIssue": "CUIC reporting issue",
    "cantReceiveInbound": "Can't receive inbound",
    "cantCallOutbound": "Can't call outbound",
    "callCenterDown": "Call center down",
    "wifiNetworkAdaptorBroadbandConnectionIssue": "Wi-Fi/Network adaptor/Broadband connection issue",
    "setupPreparationUpdateDeviceFirmwareAppIOS": "Setup/Preparation/Update device firmware/App/iOS",
    "setupDefaultPrinter": "Set up default printer",
    "returnPickupPortableEquipment": "Return/Pickup portable equipment",
    "requestPrepareLaptopForRemoteUseTeleworking": "Request to prepare laptop for remote use/teleworking",
    "problemsNonStandardIssueWithDevice": "Problems/Non-standard issue with device",
    "noVideoOnDockingStation": "No video on docking station",
    "newRequest": "New request",
    "lostOrStolen": "Lost or stolen",
    "loanerRequest": "Loaner request",
    "lenovoDockingStationLANConnectivityIssues": "Lenovo docking station LAN connectivity issues",
    "lapTopAndProjectorSetUp": "Lap top and projector set up",
    "deactivateRetireDataWipeDevice": "Deactivate/Retire/Data wipe device",
    "addDeviceMACToWirelessAccessPoint": "Add device's MAC to wireless access point",
    "mftFtpEtc": "MFT, FTP, etc",
    "restoreFilesFromBackup": "Restore files from backup",
    "requestAssetMoveToNewSite": "Request asset, move to new site",
    "install": "Install",
    "troubleshooting": "Troubleshooting",
    "configuration": "Configuration",
    "removal": "Removal",
    "unableToConnect": "Unable to connect",
    "webApplicationIsOffline": "Web application is offline",
    "newRequest": "New Request",
    "password": "Password",
    "accessModification": "Access Modification",
    "unableToConnect": "Unable to connect",
    "troubleshootRepairReplacement": "Troubleshoot/Repair/Replacement",
    "ribbonReplacementMaintenance": "Ribbon replacement/Maintenance",
    "powerIssue": "Power issue",
    "ebtPrinterNotPoweringOn": "EBT Printer not powering on",
    "connectivity": "Connectivity",
    "lrsAccess": "LRS access",
    "yoslApplicationIssue": "Application",
    "workAssignmentConnectivity": "Connectivity",
    "workAssignmentApplicationIssue": "Application Issue",
    "teleworkConnectivity": "Connectivity",
    "salesforceIhssConnectivity": "Connectivity",
    "salesforceIhssApplicationIssue": "Application Issue",
    "possConnectivity": "Connectivity",
    "possApplicationIssue": "Application Issue",
    "pecsConnectivity": "Connectivity",
    "pecsApplicationIssue": "Application Issue",
    "smartViewIssue": "Smart View Issue",
    "pbcsSmartViewIssue": "Smart View Issue",
    "pbcsApplicationIssue": "Application Issue",
    "eprsApplicationIssue": "Application Issue",
    "eprsConnectivity": "Connectivity",
    "assetsAssignment": "Assets Assignment",
    "myAssetsAssetsAssignment": "Assets Assignment",
    "discrepancyWithCurrentAssetsAssignment": "Discrepancy with my current assets assignment",
    "orcasConnectivity": "Connectivity",
    "contentIssue": "Content Issue",
    "websiteProblem": "Website Problem",
    "dpssPortalConnectivity": "Connectivity",
    "dpssPortalContentIssue": "Content Issue",
    "dpssPortalWebsiteProblem": "Website Problem",
    "requestToModifyWebsiteContent": "Request to modify website content",
    "linksDontWork": "Links don't work",
    "cg4ApplicationIssue": "Application Issue",
    "cg4Connectivity": "Connectivity",
    "cherwellApplicationIssue": "Application Issue",
    "cherwellConnectivity": "Connectivity",
    "d2ApplicationIssue": "Application Issue",
    "d2Connectivity": "Connectivity",
    "dataMiningSystemApplicationIssue": "Application Issue",
    "dataMiningSystemConnectivity": "Connectivity",
    "userMappingRequested": "User mapping requested",
    "uiFrozenOnPrinter": "UI frozen on printer",
    "tonerCartridgeReplacement": "Toner Cartridge Replacement",
    "repairTroubleshooting": "Repair/Troubleshooting",
    "relocateRemove": "Relocate/Remove",
    "jamTrayProblem": "Jam/Tray problem",
    "drumCartridgeReplacement": "Drum Cartridge Replacement",
    "additionalSupplies": "Additional supplies",
    "unspecifiedIssueWithPdfDocuments": "Unspecified issue with PDF documents",
    "troubleshootRepairOther": "Troubleshoot/Repair/Other",
    "removalUninstall": "Removal/Uninstall",
    "newUpgradeRequest": "New/Upgrade request",
    "installationReinstallationActivationUpdates": "Installation/Reinstallation/Activation/Updates",
    "installNetworkPrinterDrivers": "Install network printer/drivers",
    "cannotPrintPdfDocuments": "Cannot print PDF documents",
    "cannotPrintExcelDocuments": "Cannot print Excel documents",
    "adobeFlashPlayerBlocked": "Adobe Flash Player blocked",
    "testingUnit": "Testing Unit",
    "defectiveUnit": "Defective unit",
    "pcPowerRelatedIssue": "PC power related issue",
    "networkIconDisplayingNoNetworkConnection": "Network icon displaying: \"No network connection\"",
    "interviewAreaWalkThru": "Interview Area Walk-Thru",
    "defectivePcReplacementTroubleshootingSetup": "Defective PC/Replacement/Troubleshooting/Setup",
    "audioRelatedIssue": "Audio related issue",
    "webexAssistance": "WebEx assistance",
    "unableToViewEdmsImageInLrsViaAppstream": "Unable to view EDMS image in LRS via AppStream 2.0 (teleworking)",
    "singleSignOnProblemUnableToOpenApplication": "Single sign on problem/Unable to open application",
    "sabaAccessIssue": "SABA access issue",
    "receivingErrorCreatingUserProfileAtLrsLogin": "Receiving \"Error creating the user profile.\" at LRS login prompt",
    "office365Issue": "Office 365 issue",
    "myDpssAppPa1060DashboardNotDisplayingCurrentInfo": "My DPSS app PA-1060 dashboard not displaying current information",
    "lrsPerformanceSluggish": "LRS performance sluggish",
    "lrsAccessIssueViaDpssDesktopAppstream": "LRS access issue via DPSS Desktop/AppStream 2.0 (teleworking)",
    "issuesAccessingOutlookViaDpssDesktopOnAppstream": "Issues accessing Outlook via DPSS Desktop on AppStream (teleworking)",
    "issuesAccessingKnowBe4TrainingModulesWhileTeleworking": "Issues accessing KnowBe4 training modules while teleworking",
    "issueWithOfficeLocator": "Issue with Office Locator",
    "issuePullingFormFromDpssDocumentLibrary": "Issue pulling form from DPSS Document Library",
    "issueDpssDesktopViaAppstream": "Issue DPSS Desktop via AppStream 2.0 (teleworking)",
    "ibmEnterpriseTimekeeperAppSluggish": "IBM Enterprise Timekeeper app sluggish",
    "havingIssuesPrintingSabaCourseCustomCertificate": "Having issues printing SABA course certificate",
    "configurationSettingsIssue": "Configuration/Settings Issue",
    "lanWanDown": "LAN/WAN down",
    "newInstallationOrEquipmentRelocation": "New Installation or Equipment Relocation",
    "installStandardKeyboardMouse": "Install standard keyboard/mouse",
    "installErgonomicKeyboardMouse": "Install ergonomic keyboard/mouse",
    "electronicBulletinBoardMalfunction": "Electronic bulletin board malfunction",
    "unableToConnectDown": "Unable to connect/Down",
    "udemyTrainingAccess": "Udemy Training Access",
    "installTroubleshootConfigureRemoval": "Install/Troubleshoot/Configure/Removal",
    "zonalDpiError": "Zonal DPI error",
    "workstationDoesNotDetectScanner": "Workstation does not detect scanner",
    "scannerMaintenanceRollerReplacement": "Scanner maintenance - roller replacement",
    "recognitionServerIssue": "Recognition server issue",
    "queueBatchStuckInRecognitionServer": "Queue - Batch stuck in recognition server",
    "queueBatchStuckInPdfGenerator": "Queue - Batch stuck in PDF generator",
    "qualityControlError": "Quality control error",
    "modifyUserPermissionsDvrD2": "Modify user permissions DVR/D2",
    "licenseError": "License error",
    "kofaxValidationScriptError": "Kofax validation script error",
    "kofaxSlow": "Kofax slow",
    "kofaxNotResponding": "Kofax not responding",
    "javaError": "Java error",
    "dvrD2Slow": "DVR/D2 slow",
    "dvrD2Down": "DVR /D2 down",
    "documentsNotViewableInDocumentum": "Documents are not able to be viewed in documentum via LRS workstation",
    "d2LoginError": "D2 login error",
    "configureScannerSettings": "Configure scanner settings",
    "cannotViewDocumentsInDvrD2": "Cannot view documents in DVR/D2",
    "batchWillNotExport": "Batch will not export",
    "addRemoveBatchClass": "Add/Remove batch class",
    "accessAddUserToDvrD2": "Access - Add user to DVR/D2",
    "accessAddUserToD2AsCorrectionUser": "Access - Add user to D2 as correction user",
    // Electronic Bulletin Board Support sub-subcategory names
    "poorNetworkResponsePanelsDown": "Poor network response/Panels down",
    "contentNotDisplayingProperly": "Content not displaying properly/Black screen",
    "systemDown": "System down",
    "magicInfoServerProblems": "Magic info/Server problems",
    // Enterprise Storage Support sub-subcategory names
    "capacityPlanningDiskConsumption": "Capacity planning/Disk consumption report",
    "increaseNetworkStorageCapacity": "Increase network storage capacity",
    // Key Card Access/Badge System sub-subcategory names
    "badgeConfigurationIssue": "Badge configuration issue",
    "hardwareRelatedIssue": "Hardware Related Issue",
    // Server Support Hardware sub-subcategory names
    "warmTemperature": "Warm Temperature",
    "failure": "Failure",
    // Server Support IP addressing sub-subcategory names
    "requestOrReservationNewSubnets": "Request or reservation, new subnets",
    // Server Support Power issues sub-subcategory names
    "scheduledPowerOutages": "Scheduled power outages",
    // Server Support VM sub-subcategory names
    "requestVirtualServer": "Request virtual server",
    // Server Support VPN sub-subcategory names
    "setupProfileChanges": "Setup, profile changes",
    // Software Security sub-subcategory names
    "updatesOrPatchesCausingProblems": "Updates or patches causing problems",
    "securityAgentsMissingOrNotFunctioning": "Security agents missing or not functioning",
    "encryptionNotCompleteOrCausingErrors": "Encryption not complete or causing errors",
    // Software Support Security sub-subcategory names
    "virusIssue": "Virus issue",
    // McAfee Virus Shield sub-subcategory names
    "virusSecurityWarning": "Virus security warning",
    "troubleshootRepairOther": "Troubleshoot/Repair/Other",
    "systemScan": "System scan",
    "installation": "Installation",
    "datFilesAreOutOfDate": "DAT files are out of date",
    // SSLVPN sub-subcategory names
    "accessIssue": "Access Issue",
    "personalWiFiProblemNoSignalOrWeakSignal": "Personal WiFi Problem (No Signal or Weak Signal)",
    "profilePasswordRelated": "Profile/Password Related",
    "systemIssue": "System Issue",
    "userTrainingIssue": "User Training Issue",
    // VoIP (Non-CSC) Support sub-subcategory names
    "requestNewWallPhone": "Request new wall phone",
    "requestNewHeadset": "Request new headset",
    "requestNewDeskPhone": "Request new desk phone",
    "requestNewConferencePhone": "Request new conference phone",
    "brokenPhone": "Broken phone",
    "voicemailNotWorking": "Voicemail not working",
    "voicemailIndicatorLightNotWorkingOrIncorrect": "Voicemail indicator light not working or incorrect",
    "unableToReceiveInboundCalls": "Unable to receive inbound calls",
    "unableToMakeOutboundCalls": "Unable to make outbound calls",
    "telephoneSystemDownForSpecificSectionOrFloor": "Telephone system down for specific section or floor",
    "telephoneSystemDownForEntireSite": "Telephone system down for entire site",
    "setupVoicemail": "Setup voicemail",
    "phoneNotWorking": "Phone not working",
    "noDialTone": "No dial tone",
    "callsBeingDropped": "Calls being dropped",
    "addExtensionToPhone": "Add extension to phone",
    // VTC Support sub-subcategory names
    "troubleshootingSettingSystemRestore": "Troubleshooting/Setting System/Restore",
    "telephoneConferenceProblem": "Telephone conference problem",
    "setUpVtcTelephoneConference": "Set up VTC telephone conference",
    "requestIttsaPresenceDuringSession": "Request ITTSA presence during session",
    // WAN/LAN Support sub-subcategory names
    "networkConnectionRequest": "Network connection request - Network drops Add/Remove",
    "networkConnectionIssues": "Network connection issues - Disconnected or slow performance",
    "ip169": "IP: 169.x.xx..xxx",
    "configurePortsForPiaYbn": "Configure ports for PIA/YBN use",
    "networkRelatedMaintenance": "Network related maintenance - Software upgrades/Hardware replacement",
    "networkIssuePowerOutage": "Network issue related to power - Power outages",
    // WebEx Support sub-subcategory names
    "webexClientInstallOnPc": "WebEx client install on PC. Laptop and projector installation for Webex sessions.",
    "profileConfigurationAndAddOns": "Profile configuration and add ons issues",
    "poorConnectionToConference": "Poor connection to conference",
    "newUserAccountProfileRequest": "New user account profile request",
    // Windows update sub-subcategory names
    "installUpdates": "Install updates",
    // Outage sub-subcategory names
    "buildingEvacuation": "Building evacutaiton/Fire/Flood/Other emergency",
    "phoneSystemDown": "Phone System down",
    "smallLocalizedPowerOutage": "Small localized power outage",
    "scheduledOrNonScheduledPowerOutage": "Scheduled or non scheduled power outage",
    // AARM Support sub-subcategory names
    "installTroubleshootingConfigurationRemoval": "Install/Troubleshooting/Configuration/Removal",
    "newRequestPasswordAccessModification": "New Request/Password/Access Modification"
};